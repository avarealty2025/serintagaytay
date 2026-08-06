import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ overrides: [] });
  }

  const unitId = req.nextUrl.searchParams.get("unitId");
  const sb = getSupabaseAdmin();

  let query = sb.from("rate_overrides").select("*").order("start_date");
  if (unitId) {
    query = query.eq("unit_id", unitId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    overrides: (data || []).map((o) => ({
      id: o.id,
      unitId: o.unit_id,
      startDate: o.start_date,
      endDate: o.end_date,
      rate: Number(o.rate),
      minStay: o.min_stay,
      label: o.label,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { unitId, startDate, endDate, rate, minStay, label } = body;

  if (!unitId || !startDate || !endDate || rate == null) {
    return NextResponse.json({ error: "unitId, startDate, endDate, and rate are required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("rate_overrides")
    .insert({
      unit_id: unitId,
      start_date: startDate,
      end_date: endDate,
      rate: Number(rate),
      min_stay: minStay ? Number(minStay) : null,
      label: label || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23514" && error.message.includes("no_overlap")) {
      return NextResponse.json({ error: "Date range overlaps with an existing rate override for this unit" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ override: data });
}
