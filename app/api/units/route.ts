import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings, logAudit } from "../../../src/data/db.ts";

interface CustomUnit {
  id: string;
  building: string;
  tower: number;
  code: string;
  name: string | null;
  type: string;
  view: string | null;
  baseRate: number;
  weekendRate: number;
  cleaningFee: number;
  extraGuestFee: number;
  capacity: number;
  maxGuests: number;
  icalUrl: string | null;
  active: boolean;
  createdAt: string;
}

async function loadCustomUnits(): Promise<CustomUnit[]> {
  const settings = await getDbSettings();
  if (!settings || !settings.custom_units) return [];
  return settings.custom_units as CustomUnit[];
}

export async function GET() {
  const units = await loadCustomUnits();
  return NextResponse.json({ units });
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { building, tower, code, name, type, view, baseRate, weekendRate, cleaningFee, extraGuestFee, capacity, maxGuests, icalUrl } = body;

  if (!code?.trim()) {
    return NextResponse.json({ error: "Unit code is required" }, { status: 400 });
  }

  const units = await loadCustomUnits();

  const unitId = `${building}-${tower}-${code.trim()}`;
  if (units.some((u) => u.id === unitId)) {
    return NextResponse.json({ error: `Unit ${unitId} already exists` }, { status: 409 });
  }

  const newUnit: CustomUnit = {
    id: unitId,
    building,
    tower: Number(tower),
    code: code.trim(),
    name: name || null,
    type: type || "studio",
    view: view || null,
    baseRate: baseRate || 0,
    weekendRate: weekendRate || 0,
    cleaningFee: cleaningFee || 0,
    extraGuestFee: extraGuestFee || 0,
    capacity: capacity || 2,
    maxGuests: maxGuests || 4,
    icalUrl: icalUrl || null,
    active: true,
    createdAt: new Date().toISOString(),
  };

  units.push(newUnit);
  const result = await saveDbSettings("custom_units", units);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await logAudit({
    entity: "units",
    entityId: unitId,
    action: "create",
    after: newUnit,
    actor: "admin",
  });

  return NextResponse.json({ unit: newUnit });
}
