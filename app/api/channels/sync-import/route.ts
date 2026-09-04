import { NextRequest, NextResponse } from "next/server";
import { getChannelConfigs } from "../../../../src/data/channels.ts";
import { parseICal, extractGuestInfo, detectSource } from "../../../../src/lib/ical.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";
import type { BookingSource } from "../../../../src/lib/types.ts";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const includePast = body.includePast ?? true;

  interface EditedEntry {
    uid: string;
    guest?: string;
    phone?: string;
    email?: string;
    pax?: number;
    rate?: number;
  }
  const entries: EditedEntry[] = body.entries ?? [];
  const legacyUids: string[] = body.uids ?? [];

  const editMap = new Map<string, EditedEntry>();
  for (const e of entries) editMap.set(e.uid, e);
  for (const uid of legacyUids) {
    if (!editMap.has(uid)) editMap.set(uid, { uid });
  }

  if (editMap.size === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdmin();
  const { data: units } = await sb
    .from("units")
    .select("id, tower, code, buildings!inner(name)")
    .is("deleted_at", null);
  const slugToUuid = new Map<string, string>();
  if (units) {
    for (const u of units) {
      const bRaw = u.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      const slug = bName.replace("Serin ", "").toLowerCase();
      const appId = `${slug}-${u.tower}-${u.code}`;
      slugToUuid.set(appId, u.id);
    }
  }

  const configs = await getChannelConfigs();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

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
        if (!res.ok) continue;
        icalText = await res.text();
      } catch {
        continue;
      }

      const events = parseICal(icalText);
      const source: BookingSource = detectSource(url, "");
      const unitUuid = slugToUuid.get(config.unitId);
      if (!unitUuid) continue;

      for (const event of events) {
        if (!event.dtStart || !event.dtEnd) continue;

        const externalId = `ical:${source}:${event.uid}`;
        if (!editMap.has(event.uid)) continue;
        const edited = editMap.get(event.uid)!;

        const { data: existing } = await sb
          .from("bookings")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const today = new Date().toISOString().slice(0, 10);
        if (!includePast && event.dtEnd < today) {
          skipped++;
          continue;
        }

        const guestInfo = extractGuestInfo(event, cal.platform);
        const guestName = edited.guest || guestInfo.name || `${cal.platform} Guest`;
        const guestPhone = edited.phone || guestInfo.phone || null;
        const guestEmail = edited.email || guestInfo.email || null;
        const guestPax = edited.pax || guestInfo.guests || 2;
        const guestRate = edited.rate ?? guestInfo.payout ?? 0;

        const summaryLower = (event.summary || "").toLowerCase();
        const isBlock = ["not available", "blocked", "closed"].some((kw) => summaryLower.includes(kw));

        if (isBlock) {
          const { error: insertErr } = await sb.from("bookings").insert({
            unit_id: unitUuid,
            source: "block",
            check_in: event.dtStart,
            check_out: event.dtEnd,
            guests_count: 1,
            status: "blocked",
            gross_amount: 0,
            notes: `Blocked on ${cal.platform} (${event.summary || "Not available"})`,
            external_id: externalId,
            payment_type: "full",
            amount_paid: 0,
            guest_list: [],
          });

          if (insertErr) {
            if (!insertErr.message?.includes("bookings_no_overlap")) {
              errors.push(`${config.unitId}: ${insertErr.message}`);
            }
            skipped++;
          } else {
            imported++;
          }
          continue;
        }

        let guestId: string | null = null;
        if (guestEmail) {
          const { data: existingGuest } = await sb
            .from("guests")
            .select("id")
            .eq("email", guestEmail)
            .maybeSingle();
          if (existingGuest) {
            guestId = existingGuest.id;
          }
        }
        if (!guestId && guestName) {
          const { data: existingGuest } = await sb
            .from("guests")
            .select("id")
            .ilike("name", guestName)
            .maybeSingle();
          if (existingGuest) {
            guestId = existingGuest.id;
          }
        }
        if (!guestId) {
          const { data: newGuest } = await sb
            .from("guests")
            .insert({
              name: guestName,
              email: guestEmail,
              phone: guestPhone,
            })
            .select("id")
            .single();
          guestId = newGuest?.id ?? null;
        }

        const isPast = event.dtEnd <= today;
        const bookingStatus = isPast ? "checked_out" : "confirmed";

        const { error: insertErr } = await sb.from("bookings").insert({
          unit_id: unitUuid,
          guest_id: guestId,
          source,
          check_in: event.dtStart,
          check_out: event.dtEnd,
          guests_count: guestPax,
          status: bookingStatus,
          gross_amount: guestRate,
          notes: `Imported from ${cal.platform}. ${event.description || ""}`.trim(),
          external_id: externalId,
          payment_type: "full",
          amount_paid: guestRate,
          guest_list: [],
        });

        if (insertErr) {
          if (!insertErr.message?.includes("bookings_no_overlap")) {
            errors.push(`${config.unitId}: ${insertErr.message}`);
          }
          skipped++;
        } else {
          imported++;
        }
      }
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
