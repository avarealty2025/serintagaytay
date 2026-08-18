import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";
import { clearUnitIdCache } from "../../../../src/data/db.ts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id: appId } = await params;
  const sb = getSupabaseAdmin();

  const { data: allUnits } = await sb
    .from("units")
    .select("*, buildings!inner(name)")
    .is("deleted_at", null);

  if (!allUnits) {
    return NextResponse.json({ error: "Failed to load units" }, { status: 500 });
  }

  for (const row of allUnits) {
    const bRaw = row.buildings as unknown as { name: string } | { name: string }[];
    const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
    const slug = bName.replace("Serin ", "").toLowerCase();
    const rowAppId = `${slug}-${row.tower}-${row.code}`;
    if (rowAppId === appId) {
      return NextResponse.json({
        id: rowAppId,
        supabaseId: row.id,
        name: row.name ?? "",
        description: row.description ?? "",
        type: row.type,
        baseRate: Number(row.base_rate),
        weekendRate: Number(row.weekend_rate),
        monthlyRate: row.monthly_rate ? Number(row.monthly_rate) : 0,
        cleaningFee: Number(row.cleaning_fee),
        extraGuestFee: Number(row.extra_guest_fee),
        parkingFee: Number(row.parking_fee ?? 0),
        earlyCheckinFee: Number(row.early_checkin_fee ?? 0),
        lateCheckoutFee: Number(row.late_checkout_fee ?? 0),
        weeklyDiscountPct: Number(row.weekly_discount_pct ?? 0),
        monthlyDiscountPct: Number(row.monthly_discount_pct ?? 0),
        capacity: row.capacity,
        maxGuests: row.max_guests,
        minStay: row.min_stay,
        amenities: row.amenities ?? [],
        view: row.view ?? "",
        active: row.active,
      });
    }
  }

  return NextResponse.json({ error: "Unit not found" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id: appId } = await params;
  const body = await req.json();
  const sb = getSupabaseAdmin();

  const { data: allUnits } = await sb
    .from("units")
    .select("id, tower, code, buildings!inner(name)")
    .is("deleted_at", null);

  let dbId: string | null = null;
  if (allUnits) {
    for (const row of allUnits) {
      const bRaw = row.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      const slug = bName.replace("Serin ", "").toLowerCase();
      const rowAppId = `${slug}-${row.tower}-${row.code}`;
      if (rowAppId === appId) {
        dbId = row.id;
        break;
      }
    }
  }

  if (!dbId) {
    return NextResponse.json({ error: `Unit ${appId} not found` }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name || null;
  if (body.description !== undefined) update.description = body.description || null;
  if (body.view !== undefined) update.view = body.view || null;
  if (body.type !== undefined) update.type = body.type;
  if (body.baseRate !== undefined) update.base_rate = body.baseRate;
  if (body.weekendRate !== undefined) update.weekend_rate = body.weekendRate;
  if (body.monthlyRate !== undefined) update.monthly_rate = body.monthlyRate || null;
  if (body.cleaningFee !== undefined) update.cleaning_fee = body.cleaningFee;
  if (body.extraGuestFee !== undefined) update.extra_guest_fee = body.extraGuestFee;
  if (body.parkingFee !== undefined) update.parking_fee = body.parkingFee;
  if (body.earlyCheckinFee !== undefined) update.early_checkin_fee = body.earlyCheckinFee;
  if (body.lateCheckoutFee !== undefined) update.late_checkout_fee = body.lateCheckoutFee;
  if (body.weeklyDiscountPct !== undefined) update.weekly_discount_pct = body.weeklyDiscountPct;
  if (body.monthlyDiscountPct !== undefined) update.monthly_discount_pct = body.monthlyDiscountPct;
  if (body.capacity !== undefined) update.capacity = body.capacity;
  if (body.maxGuests !== undefined) update.max_guests = body.maxGuests;
  if (body.minStay !== undefined) update.min_stay = body.minStay;
  if (body.amenities !== undefined) update.amenities = body.amenities;
  if (body.active !== undefined) update.active = body.active;
  update.updated_at = new Date().toISOString();

  let { error } = await sb.from("units").update(update).eq("id", dbId);
  if (error && error.message.includes("view") && update.view !== undefined) {
    delete update.view;
    ({ error } = await sb.from("units").update(update).eq("id", dbId));
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  clearUnitIdCache();
  return NextResponse.json({ ok: true });
}
