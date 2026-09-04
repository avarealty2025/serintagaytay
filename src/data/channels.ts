import { getDbSettings, saveDbSettings } from "./db.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../lib/supabase.ts";
import { parseICal, detectSource, extractGuestInfo, type ICalEvent } from "../lib/ical.ts";
import type { BookingSource } from "../lib/types.ts";

export interface ChannelCalendar {
  platform: "airbnb" | "booking.com" | "agoda";
  icalUrl: string;
  enabled: boolean;
}

export interface UnitChannels {
  unitId: string;
  calendars: ChannelCalendar[];
  exportUrl?: string;
}

export interface SyncResult {
  unitId: string;
  platform: string;
  imported: number;
  skipped: number;
  errors: string[];
}

const SETTINGS_KEY = "ota_channels";

export async function getChannelConfigs(): Promise<UnitChannels[]> {
  const settings = await getDbSettings();
  const saved = settings?.[SETTINGS_KEY] as UnitChannels[] | undefined;
  return saved ?? [];
}

export async function saveChannelConfigs(
  configs: UnitChannels[],
): Promise<{ error: string | null }> {
  return saveDbSettings(SETTINGS_KEY, configs);
}

export async function getUnitChannels(unitId: string): Promise<UnitChannels | null> {
  const all = await getChannelConfigs();
  return all.find((c) => c.unitId === unitId) ?? null;
}

export async function saveUnitChannels(
  unitId: string,
  calendars: ChannelCalendar[],
): Promise<{ error: string | null }> {
  const all = await getChannelConfigs();
  const idx = all.findIndex((c) => c.unitId === unitId);
  const entry: UnitChannels = { unitId, calendars };
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  return saveChannelConfigs(all);
}

async function getUnitIdMap(): Promise<Map<string, string>> {
  if (!isSupabaseConfigured) return new Map();
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("units")
    .select("id, tower, code, buildings!inner(name)")
    .is("deleted_at", null);
  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      const bRaw = row.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      const slug = bName.replace("Serin ", "").toLowerCase();
      const appId = `${slug}-${row.tower}-${row.code}`;
      map.set(appId, row.id);
    }
  }
  return map;
}

export async function syncUnit(unitId: string): Promise<SyncResult[]> {
  const channels = await getUnitChannels(unitId);
  if (!channels) return [];

  const results: SyncResult[] = [];
  for (const cal of channels.calendars) {
    if (!cal.enabled || !cal.icalUrl) continue;
    const result = await syncCalendar(unitId, cal);
    results.push(result);
  }
  return results;
}

export async function syncAllUnits(): Promise<SyncResult[]> {
  const configs = await getChannelConfigs();
  const results: SyncResult[] = [];
  for (const config of configs) {
    for (const cal of config.calendars) {
      if (!cal.enabled || !cal.icalUrl) continue;
      const result = await syncCalendar(config.unitId, cal);
      results.push(result);
    }
  }
  return results;
}

async function syncCalendar(
  unitId: string,
  cal: ChannelCalendar,
): Promise<SyncResult> {
  const result: SyncResult = {
    unitId,
    platform: cal.platform,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  let icalText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(cal.icalUrl.trim(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      result.errors.push(`HTTP ${res.status} fetching calendar`);
      return result;
    }
    icalText = await res.text();
  } catch (err) {
    result.errors.push(`Failed to fetch: ${err instanceof Error ? err.message : "unknown"}`);
    return result;
  }

  let events: ICalEvent[];
  try {
    events = parseICal(icalText);
  } catch {
    result.errors.push("Failed to parse iCal data");
    return result;
  }

  if (!isSupabaseConfigured) {
    result.errors.push("Supabase not configured");
    return result;
  }

  const sb = getSupabaseAdmin();
  const idMap = await getUnitIdMap();
  const unitUuid = idMap.get(unitId);
  if (!unitUuid) {
    result.errors.push(`Unit ${unitId} not found in database`);
    return result;
  }

  const source: BookingSource = detectSource(cal.icalUrl, "");

  const today = new Date().toISOString().slice(0, 10);
  const BLOCK_KEYWORDS = ["not available", "blocked", "closed"];

  for (const event of events) {
    if (!event.dtStart || !event.dtEnd) continue;

    const summaryLower = (event.summary || "").toLowerCase();
    const isBlock = BLOCK_KEYWORDS.some((kw) => summaryLower.includes(kw));

    const externalId = `ical:${source}:${event.uid}`;

    const { data: existing } = await sb
      .from("bookings")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (existing) {
      result.skipped++;
      continue;
    }

    const { data: overlap } = await sb
      .from("bookings")
      .select("id")
      .eq("unit_id", unitUuid)
      .lt("check_in", event.dtEnd)
      .gt("check_out", event.dtStart)
      .not("status", "in", '("cancelled","expired","no_show","payment_rejected")')
      .is("deleted_at", null)
      .limit(1);

    if (overlap && overlap.length > 0) {
      result.skipped++;
      continue;
    }

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
        if (insertErr.message?.includes("bookings_no_overlap")) {
          result.skipped++;
        } else {
          result.errors.push(`Insert block failed: ${insertErr.message}`);
        }
      } else {
        result.imported++;
      }
      continue;
    }

    const isPast = event.dtEnd < today;

    const guestInfo = extractGuestInfo(event, cal.platform);

    let guestId: string | null = null;
    if (guestInfo.email) {
      const { data: existingGuest } = await sb
        .from("guests")
        .select("id")
        .eq("email", guestInfo.email)
        .maybeSingle();
      if (existingGuest) {
        guestId = existingGuest.id;
      }
    }
    if (!guestId) {
      const { data: newGuest } = await sb
        .from("guests")
        .insert({
          name: guestInfo.name,
          email: guestInfo.email || null,
          phone: guestInfo.phone || null,
        })
        .select("id")
        .single();
      guestId = newGuest?.id ?? null;
    }

    const { error: insertErr } = await sb.from("bookings").insert({
      unit_id: unitUuid,
      guest_id: guestId,
      source,
      check_in: event.dtStart,
      check_out: event.dtEnd,
      guests_count: guestInfo.guests || 2,
      status: isPast ? "checked_out" : "confirmed",
      gross_amount: guestInfo.payout || 0,
      notes: `Imported from ${cal.platform}. ${event.description || ""}`.trim(),
      external_id: externalId,
      payment_type: "full",
      amount_paid: guestInfo.payout || 0,
      guest_list: [],
    });

    if (insertErr) {
      if (insertErr.message?.includes("bookings_no_overlap")) {
        result.skipped++;
      } else {
        result.errors.push(`Insert failed: ${insertErr.message}`);
      }
    } else {
      result.imported++;
    }
  }

  // Update last sync time
  const settings = await getDbSettings();
  const syncLog = (settings?.ota_sync_log as Record<string, string>) ?? {};
  syncLog[`${unitId}:${cal.platform}`] = new Date().toISOString();
  await saveDbSettings("ota_sync_log", syncLog);

  return result;
}
