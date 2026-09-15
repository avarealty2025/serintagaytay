import { NextRequest, NextResponse } from "next/server";
import { getUnits, logAudit, clearUnitIdCache } from "../../../src/data/db.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";
import { clearUnitsCache } from "../../../src/data/units-server.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const units = await getUnits();
  return NextResponse.json({ units });
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
  const { building, tower, code, name, type, view, baseRate, weekendRate, cleaningFee, extraGuestFee, capacity, maxGuests, icalUrl } = body;

  if (!code?.trim()) {
    return NextResponse.json({ error: "Unit code is required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const buildingName = building === "east" ? "Serin East" : "Serin West";
  const { data: buildingRow } = await sb
    .from("buildings")
    .select("id")
    .eq("name", buildingName)
    .single();

  if (!buildingRow) {
    return NextResponse.json({ error: `Building "${buildingName}" not found in database` }, { status: 500 });
  }

  const towerNum = Number(tower);
  const codeStr = code.trim();

  const { data: existing } = await sb
    .from("units")
    .select("id")
    .eq("building_id", buildingRow.id)
    .eq("tower", towerNum)
    .eq("code", codeStr)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: `Unit ${building}-${towerNum}-${codeStr} already exists` }, { status: 409 });
  }

  const { data: newRow, error } = await sb
    .from("units")
    .insert({
      building_id: buildingRow.id,
      tower: towerNum,
      code: codeStr,
      name: name?.trim() || null,
      type: type || "studio",
      view: view?.trim() || null,
      base_rate: baseRate || 0,
      weekend_rate: weekendRate || 0,
      cleaning_fee: cleaningFee || 0,
      extra_guest_fee: extraGuestFee || 0,
      capacity: capacity || 2,
      max_guests: maxGuests || 4,
      min_stay: 1,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (icalUrl?.trim()) {
    const { getDbSettings, saveDbSettings } = await import("../../../src/data/db.ts");
    const settings = await getDbSettings();
    const urls = (settings?.ical_urls as Record<string, string>) || {};
    const unitId = `${building}-${towerNum}-${codeStr}`;
    urls[unitId] = icalUrl.trim();
    await saveDbSettings("ical_urls", urls);
  }

  clearUnitIdCache();
  clearUnitsCache();

  const unitId = `${building}-${towerNum}-${codeStr}`;
  await logAudit({
    entity: "units",
    entityId: unitId,
    action: "create",
    after: { building, tower: towerNum, code: codeStr, name, type },
    actor: session,
  });

  return NextResponse.json({ unit: { id: unitId, supabaseId: newRow?.id } });
}
