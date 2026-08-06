import { isSupabaseConfigured, getSupabaseAdmin } from "../lib/supabase.ts";
import { loadSheet, type SheetBooking, type SheetLoad } from "./sheet.ts";
import { UNITS } from "./units.ts";
import type { Unit, BookingSource, BookingStatus } from "../lib/types.ts";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Unit ID mapping: app slug ↔ Supabase UUID
// ---------------------------------------------------------------------------

interface DbUnit {
  id: string;
  building_id: string;
  building_name: string;
  tower: number;
  code: string;
  name: string | null;
  type: string;
  size_sqm: number | null;
  capacity: number;
  max_guests: number;
  base_rate: number;
  weekend_rate: number;
  monthly_rate: number | null;
  cleaning_fee: number;
  extra_guest_fee: number;
  min_stay: number;
  active: boolean;
  description: string | null;
  amenities: string[];
}

function dbUnitToAppUnit(u: DbUnit): Unit {
  const buildingSlug = u.building_name.replace("Serin ", "").toLowerCase();
  return {
    id: `${buildingSlug}-${u.tower}-${u.code}`,
    buildingId: buildingSlug,
    tower: u.tower,
    code: u.code,
    name: u.name ?? undefined,
    type: u.type as Unit["type"],
    description: u.description ?? undefined,
    inclusions: u.amenities,
    sqm: u.size_sqm ?? undefined,
    capacity: u.capacity,
    maxGuests: u.max_guests,
    baseRate: Number(u.base_rate),
    weekendRate: Number(u.weekend_rate),
    monthlyRate: u.monthly_rate ? Number(u.monthly_rate) : undefined,
    cleaningFee: Number(u.cleaning_fee),
    extraGuestFee: Number(u.extra_guest_fee),
    minStay: u.min_stay,
    active: u.active,
  };
}

let _unitIdMap: Map<string, string> | null = null;

async function getUnitIdMap(): Promise<Map<string, string>> {
  if (_unitIdMap) return _unitIdMap;
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("units")
    .select("id, tower, code, buildings!inner(name)")
    .is("deleted_at", null);

  _unitIdMap = new Map();
  if (data) {
    for (const row of data) {
      const bRaw = row.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      const slug = bName.replace("Serin ", "").toLowerCase();
      const appId = `${slug}-${row.tower}-${row.code}`;
      _unitIdMap.set(appId, row.id);
      _unitIdMap.set(row.id, appId);
    }
  }
  return _unitIdMap;
}

export function clearUnitIdCache() {
  _unitIdMap = null;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export async function getUnits(): Promise<Unit[]> {
  if (!isSupabaseConfigured) return UNITS;
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("units")
      .select("*, buildings!inner(name)")
      .is("deleted_at", null)
      .order("tower")
      .order("code");
    if (error || !data) return UNITS;
    return data.map((row) => {
      const bRaw = row.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      return dbUnitToAppUnit({ ...row, building_name: bName });
    });
  } catch {
    return UNITS;
  }
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export interface DbBooking {
  id: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  guest: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
  guestList: string[];
  source: BookingSource | null;
  grossAmount: number;
  notes: string | null;
  proofPath: string | null;
  paymentType: "reservation" | "full";
  amountPaid: number;
  createdAt: string;
}

export async function getBookings(): Promise<{ bookings: DbBooking[]; problems: string[] }> {
  if (!isSupabaseConfigured) {
    const sheet = loadSheet(join(process.cwd(), "data"));
    return {
      bookings: sheet.bookings.map((b) => ({
        id: b.id,
        unitId: b.unitId,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        guest: b.guest,
        guestEmail: "",
        guestPhone: "",
        guests: b.guests,
        guestList: [],
        source: b.source,
        grossAmount: 0,
        notes: null,
        proofPath: null,
        paymentType: "reservation" as const,
        amountPaid: 0,
        createdAt: "",
      })),
      problems: sheet.problems,
    };
  }

  try {
    const sb = getSupabaseAdmin();
    const idMap = await getUnitIdMap();
    const { data, error } = await sb
      .from("bookings")
      .select("*, guests!left(name, email, phone)")
      .is("deleted_at", null)
      .order("check_in", { ascending: false });

    if (error || !data) {
      const sheet = loadSheet(join(process.cwd(), "data"));
      return {
        bookings: sheet.bookings.map((b) => ({
          id: b.id, unitId: b.unitId, checkIn: b.checkIn, checkOut: b.checkOut,
          status: b.status, guest: b.guest, guestEmail: "", guestPhone: "",
          guests: b.guests, guestList: [], source: b.source,
          grossAmount: 0, notes: null, proofPath: null, paymentType: "reservation" as const, amountPaid: 0, createdAt: "",
        })),
        problems: sheet.problems,
      };
    }

    return {
      bookings: data.map((row) => {
        const guestRec = row.guests as { name: string; email: string; phone: string } | null;
        return {
          id: row.id,
          unitId: idMap.get(row.unit_id) ?? row.unit_id,
          checkIn: row.check_in,
          checkOut: row.check_out,
          status: row.status as BookingStatus,
          guest: guestRec?.name ?? "",
          guestEmail: guestRec?.email ?? "",
          guestPhone: guestRec?.phone ?? "",
          guests: row.guests_count,
          guestList: row.guest_list ?? [],
          source: row.source as BookingSource,
          grossAmount: Number(row.gross_amount),
          notes: row.notes,
          proofPath: row.proof_path ?? null,
          paymentType: (row.payment_type ?? "reservation") as "reservation" | "full",
          amountPaid: Number(row.amount_paid ?? 0),
          createdAt: row.created_at,
        };
      }),
      problems: [],
    };
  } catch {
    const sheet = loadSheet(join(process.cwd(), "data"));
    return {
      bookings: sheet.bookings.map((b) => ({
        id: b.id, unitId: b.unitId, checkIn: b.checkIn, checkOut: b.checkOut,
        status: b.status, guest: b.guest, guestEmail: "", guestPhone: "",
        guests: b.guests, guestList: [], source: b.source,
        grossAmount: 0, notes: null, proofPath: null, paymentType: "reservation" as const, amountPaid: 0, createdAt: "",
      })),
      problems: sheet.problems,
    };
  }
}

export async function createBooking(data: {
  unitId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  source: BookingSource;
  grossAmount: number;
  notes?: string;
  proofPath?: string;
  guestList?: string[];
  paymentType?: "reservation" | "full";
  amountPaid?: number;
}): Promise<{ id: string | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { id: `local-${Date.now()}`, error: null };
  }

  const sb = getSupabaseAdmin();
  const idMap = await getUnitIdMap();
  const unitUuid = idMap.get(data.unitId);
  if (!unitUuid) return { id: null, error: `Unit ${data.unitId} not found` };

  const { data: guest, error: guestErr } = await sb
    .from("guests")
    .upsert({ name: data.guestName, email: data.guestEmail || null, phone: data.guestPhone || null }, { onConflict: "email" })
    .select("id")
    .single();

  let guestId = guest?.id;
  if (guestErr || !guestId) {
    const { data: newGuest } = await sb
      .from("guests")
      .insert({ name: data.guestName, email: data.guestEmail || null, phone: data.guestPhone || null })
      .select("id")
      .single();
    guestId = newGuest?.id;
  }

  const { data: booking, error } = await sb
    .from("bookings")
    .insert({
      unit_id: unitUuid,
      guest_id: guestId,
      source: data.source,
      check_in: data.checkIn,
      check_out: data.checkOut,
      guests_count: data.guests,
      status: "pending_payment",
      gross_amount: data.grossAmount,
      notes: data.notes || null,
      proof_path: data.proofPath || null,
      guest_list: data.guestList?.length ? data.guestList : [],
      payment_type: data.paymentType || "reservation",
      amount_paid: data.amountPaid || 0,
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: booking?.id ?? null, error: null };
}

export async function updateBooking(
  id: string,
  data: Partial<{
    checkIn: string;
    checkOut: string;
    guests: number;
    guestList: string[];
    source: string;
    grossAmount: number;
    notes: string;
    status: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    paymentType: string;
    amountPaid: number;
  }>,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: "Supabase not configured" };
  const sb = getSupabaseAdmin();

  const bookingUpdate: Record<string, unknown> = {};
  if (data.checkIn !== undefined) bookingUpdate.check_in = data.checkIn;
  if (data.checkOut !== undefined) bookingUpdate.check_out = data.checkOut;
  if (data.guests !== undefined) bookingUpdate.guests_count = data.guests;
  if (data.guestList !== undefined) bookingUpdate.guest_list = data.guestList;
  if (data.source !== undefined) bookingUpdate.source = data.source;
  if (data.grossAmount !== undefined) bookingUpdate.gross_amount = data.grossAmount;
  if (data.notes !== undefined) bookingUpdate.notes = data.notes || null;
  if (data.status !== undefined) bookingUpdate.status = data.status;
  if (data.paymentType !== undefined) bookingUpdate.payment_type = data.paymentType;
  if (data.amountPaid !== undefined) bookingUpdate.amount_paid = data.amountPaid;
  bookingUpdate.updated_at = new Date().toISOString();

  if (Object.keys(bookingUpdate).length > 1) {
    const { error } = await sb.from("bookings").update(bookingUpdate).eq("id", id);
    if (error) return { error: error.message };
  }

  if (data.guestName !== undefined || data.guestEmail !== undefined || data.guestPhone !== undefined) {
    const { data: booking } = await sb.from("bookings").select("guest_id").eq("id", id).single();
    if (booking?.guest_id) {
      const guestUpdate: Record<string, unknown> = {};
      if (data.guestName !== undefined) guestUpdate.name = data.guestName;
      if (data.guestEmail !== undefined) guestUpdate.email = data.guestEmail || null;
      if (data.guestPhone !== undefined) guestUpdate.phone = data.guestPhone || null;
      await sb.from("guests").update(guestUpdate).eq("id", booking.guest_id);
    }
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export interface DbExpense {
  id: string;
  unitId: string | null;
  category: string;
  amount: number;
  date: string;
  vendor: string | null;
  notes: string | null;
  approved: boolean;
  createdAt: string;
}

export async function getExpenses(): Promise<DbExpense[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = getSupabaseAdmin();
    const idMap = await getUnitIdMap();
    const { data, error } = await sb
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      unitId: row.unit_id ? (idMap.get(row.unit_id) ?? null) : null,
      category: row.category,
      amount: Number(row.amount),
      date: row.date,
      vendor: row.vendor,
      notes: row.notes,
      approved: false,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function createExpense(data: {
  unitId?: string;
  category: string;
  amount: number;
  date: string;
  vendor?: string;
  notes?: string;
}): Promise<{ id: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { id: `local-${Date.now()}`, error: null };
  const sb = getSupabaseAdmin();
  const idMap = await getUnitIdMap();

  let unitUuid: string | null = null;
  let buildingUuid: string | null = null;

  if (data.unitId) {
    unitUuid = idMap.get(data.unitId) ?? null;
  }
  if (!unitUuid) {
    buildingUuid = "b0000000-0000-0000-0000-000000000001";
  }

  const { data: row, error } = await sb
    .from("expenses")
    .insert({
      unit_id: unitUuid,
      building_id: unitUuid ? null : buildingUuid,
      category: data.category,
      amount: data.amount,
      date: data.date,
      vendor: data.vendor || null,
      notes: data.notes || null,
      created_by: "00000000-0000-0000-0000-000000000000",
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: row?.id ?? null, error: null };
}

export async function updateExpense(
  id: string,
  data: Partial<{ category: string; amount: number; date: string; vendor: string; notes: string; unitId: string }>,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const sb = getSupabaseAdmin();
  const idMap = await getUnitIdMap();

  const update: Record<string, unknown> = {};
  if (data.category !== undefined) update.category = data.category;
  if (data.amount !== undefined) update.amount = data.amount;
  if (data.date !== undefined) update.date = data.date;
  if (data.vendor !== undefined) update.vendor = data.vendor || null;
  if (data.notes !== undefined) update.notes = data.notes || null;
  if (data.unitId !== undefined) {
    update.unit_id = data.unitId ? (idMap.get(data.unitId) ?? null) : null;
  }

  const { error } = await sb.from("expenses").update(update).eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteBooking(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("bookings").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteExpense(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getDbSettings(): Promise<Record<string, unknown> | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.from("settings").select("key, value");
    if (error || !data) return null;
    const result: Record<string, unknown> = {};
    for (const row of data) {
      result[row.key] = row.value;
    }
    return result;
  } catch {
    return null;
  }
}

export async function saveDbSettings(
  key: string,
  value: unknown,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: "Supabase not configured" };
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { error: error.message };
  return { error: null };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function logAudit(entry: {
  entity: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  actor?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const sb = getSupabaseAdmin();
    await sb.from("audit_log").insert({
      entity: entry.entity,
      entity_id: entry.entityId,
      action: entry.action,
      before: entry.before ?? null,
      after: entry.after ?? null,
      actor: entry.actor ?? "admin",
    });
  } catch {
    // best-effort
  }
}
