import { UNITS } from "./units.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../lib/supabase.ts";
import type { Unit } from "../lib/types.ts";

let cachedUnits: Unit[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

export async function getUnitsFromDb(): Promise<Unit[]> {
  if (cachedUnits && Date.now() - cacheTime < CACHE_TTL) return cachedUnits;

  if (!isSupabaseConfigured) return UNITS;

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("units")
      .select("*, buildings!inner(name)")
      .is("deleted_at", null);

    if (error || !data) return UNITS;

    const dbMap = new Map<string, Record<string, unknown>>();
    for (const row of data) {
      const bRaw = row.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      const slug = bName.replace("Serin ", "").toLowerCase();
      const appId = `${slug}-${row.tower}-${row.code}`;
      dbMap.set(appId, row);
    }

    const merged = UNITS.map((u) => {
      const row = dbMap.get(u.id);
      if (!row) return u;
      return {
        ...u,
        name: (row.name as string) || u.name,
        description: (row.description as string) || u.description,
        type: (row.type as Unit["type"]) || u.type,
        baseRate: Number(row.base_rate) || u.baseRate,
        weekendRate: Number(row.weekend_rate) || u.weekendRate,
        monthlyRate: row.monthly_rate ? Number(row.monthly_rate) : u.monthlyRate,
        cleaningFee: Number(row.cleaning_fee ?? u.cleaningFee),
        extraGuestFee: Number(row.extra_guest_fee ?? u.extraGuestFee),
        capacity: Number(row.capacity ?? u.capacity),
        maxGuests: Number(row.max_guests ?? u.maxGuests),
        minStay: Number(row.min_stay ?? u.minStay),
        amenities: (row.amenities as string[]) || u.amenities,
        active: row.active as boolean,
        view: (row.view as string) || undefined,
        checkinInstructions: (row.checkin_instructions as string) || undefined,
      };
    });

    cachedUnits = merged;
    cacheTime = Date.now();
    return merged;
  } catch {
    return UNITS;
  }
}

export function clearUnitsCache() {
  cachedUnits = null;
  cacheTime = 0;
}
