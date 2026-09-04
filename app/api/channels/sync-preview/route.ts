import { NextResponse } from "next/server";
import { getChannelConfigs } from "../../../../src/data/channels.ts";
import { parseICal, extractGuestInfo, detectSource } from "../../../../src/lib/ical.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

export const maxDuration = 60;

export async function GET() {
  const configs = await getChannelConfigs();
  const preview: {
    unit: string;
    platform: string;
    checkIn: string;
    checkOut: string;
    guest: string;
    phone: string;
    email: string;
    pax: number;
    payout: number;
    summary: string;
    description: string;
    uid: string;
    status: "new" | "exists" | "blocked";
    notes: string;
  }[] = [];

  const existingIds = new Set<string>();
  const existingBookings: { unit_id: string; check_in: string; check_out: string; external_id: string | null }[] = [];

  if (isSupabaseConfigured) {
    const sb = getSupabaseAdmin();
    const { data: units } = await sb
      .from("units")
      .select("id, tower, code, buildings!inner(name)")
      .is("deleted_at", null);
    const slugToUuid = new Map<string, string>();
    const uuidToSlug = new Map<string, string>();
    if (units) {
      for (const u of units) {
        const bRaw = u.buildings as unknown as { name: string } | { name: string }[];
        const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
        const slug = bName.replace("Serin ", "").toLowerCase();
        const appId = `${slug}-${u.tower}-${u.code}`;
        slugToUuid.set(appId, u.id);
        uuidToSlug.set(u.id, appId);
      }
    }

    const { data: bookings } = await sb
      .from("bookings")
      .select("unit_id, check_in, check_out, external_id")
      .is("deleted_at", null)
      .not("status", "in", '("cancelled","expired","no_show","payment_rejected")');

    if (bookings) {
      for (const b of bookings) {
        if (b.external_id) existingIds.add(b.external_id);
        existingBookings.push(b);
      }
    }

    for (const config of configs) {
      for (const cal of config.calendars) {
        if (!cal.enabled || !cal.icalUrl) continue;

        const url = cal.icalUrl.trim();
        let icalText: string;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) {
            preview.push({
              unit: config.unitId, platform: cal.platform,
              checkIn: "", checkOut: "", guest: "", phone: "", email: "",
              pax: 0, payout: 0, summary: "", description: "",
              uid: "", status: "blocked",
              notes: `ERROR: HTTP ${res.status} fetching feed`,
            });
            continue;
          }
          icalText = await res.text();
        } catch (err) {
          preview.push({
            unit: config.unitId, platform: cal.platform,
            checkIn: "", checkOut: "", guest: "", phone: "", email: "",
            pax: 0, payout: 0, summary: "", description: "",
            uid: "", status: "blocked",
            notes: `ERROR: ${err instanceof Error ? err.message : "fetch failed"}`,
          });
          continue;
        }

        const events = parseICal(icalText);
        const source = detectSource(url, "");
        const unitUuid = slugToUuid.get(config.unitId);

        for (const event of events) {
          if (!event.dtStart || !event.dtEnd) continue;

          const guestInfo = extractGuestInfo(event, cal.platform);
          const externalId = `ical:${source}:${event.uid}`;
          const alreadyExists = existingIds.has(externalId);

          const isBlockedDate =
            !guestInfo.name ||
            guestInfo.name === `${cal.platform} Guest` ||
            event.summary.toLowerCase().includes("not available") ||
            event.summary.toLowerCase().includes("blocked") ||
            event.summary.toLowerCase().includes("closed");

          let overlapNote = "";
          if (!alreadyExists && unitUuid) {
            const overlapping = existingBookings.filter(
              (b) =>
                b.unit_id === unitUuid &&
                b.check_in < event.dtEnd &&
                b.check_out > event.dtStart &&
                b.external_id !== externalId,
            );
            if (overlapping.length > 0) {
              overlapNote = "Overlaps with existing booking";
            }
          }

          let statusNote = "";
          if (isBlockedDate) {
            statusNote = "Blocked/unavailable date — no guest details";
          }

          preview.push({
            unit: config.unitId,
            platform: cal.platform,
            checkIn: event.dtStart,
            checkOut: event.dtEnd,
            guest: guestInfo.name,
            phone: guestInfo.phone,
            email: guestInfo.email,
            pax: guestInfo.guests,
            payout: guestInfo.payout,
            summary: event.summary,
            description: event.description.slice(0, 500),
            uid: event.uid,
            status: alreadyExists ? "exists" : isBlockedDate ? "blocked" : "new",
            notes: [statusNote, overlapNote].filter(Boolean).join("; ") || "",
          });
        }
      }
    }
  }

  preview.sort((a, b) => a.unit.localeCompare(b.unit) || a.checkIn.localeCompare(b.checkIn));

  const newCount = preview.filter((p) => p.status === "new").length;
  const existsCount = preview.filter((p) => p.status === "exists").length;
  const blockedCount = preview.filter((p) => p.status === "blocked").length;

  return NextResponse.json({
    total: preview.length,
    new: newCount,
    existing: existsCount,
    blocked: blockedCount,
    events: preview,
  });
}
