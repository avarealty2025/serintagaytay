import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";
import { clearUnitIdCache } from "../../../../src/data/db.ts";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ units: [] });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("units")
    .select("*, buildings!inner(name)")
    .is("deleted_at", null)
    .order("tower")
    .order("code");

  if (error || !data) {
    return NextResponse.json({ error: "Failed to load units" }, { status: 500 });
  }

  return NextResponse.json({
    units: data.map((row) => {
      const bRaw = row.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      const slug = bName.replace("Serin ", "").toLowerCase();
      return {
        supabaseId: row.id,
        appId: `${slug}-${row.tower}-${row.code}`,
        tower: row.tower,
        code: row.code,
        name: row.name,
        type: row.type,
        building: slug,
        baseRate: Number(row.base_rate),
        weekendRate: Number(row.weekend_rate),
        cleaningFee: Number(row.cleaning_fee),
        extraGuestFee: Number(row.extra_guest_fee),
        parkingFee: Number(row.parking_fee ?? 0),
        earlyCheckinFee: Number(row.early_checkin_fee ?? 0),
        lateCheckoutFee: Number(row.late_checkout_fee ?? 0),
        weeklyDiscountPct: Number(row.weekly_discount_pct ?? 0),
        monthlyDiscountPct: Number(row.monthly_discount_pct ?? 0),
        minStay: row.min_stay,
        amenities: row.amenities ?? [],
        active: row.active,
      };
    }),
  });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { unitIds, updates } = body as {
    unitIds: string[];
    updates: Record<string, unknown>;
  };

  if (!unitIds?.length || !updates || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "unitIds and updates are required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const fieldMap: Record<string, string> = {
    baseRate: "base_rate",
    weekendRate: "weekend_rate",
    cleaningFee: "cleaning_fee",
    extraGuestFee: "extra_guest_fee",
    parkingFee: "parking_fee",
    earlyCheckinFee: "early_checkin_fee",
    lateCheckoutFee: "late_checkout_fee",
    weeklyDiscountPct: "weekly_discount_pct",
    monthlyDiscountPct: "monthly_discount_pct",
    minStay: "min_stay",
    amenities: "amenities",
  };

  const dbUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = fieldMap[key];
    if (dbKey) {
      dbUpdates[dbKey] = value;
    }
  }

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const unitId of unitIds) {
    const { error } = await sb
      .from("units")
      .update(dbUpdates)
      .eq("id", unitId);

    results.push({
      id: unitId,
      ok: !error,
      error: error?.message,
    });
  }

  clearUnitIdCache();

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    return NextResponse.json({
      error: `${failures.length} of ${unitIds.length} updates failed`,
      results,
    }, { status: 207 });
  }

  return NextResponse.json({ ok: true, updated: unitIds.length });
}
