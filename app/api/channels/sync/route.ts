import { NextRequest, NextResponse } from "next/server";
import { syncUnit, syncAllUnits } from "../../../../src/data/channels.ts";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const unitId = body.unitId as string | undefined;

  const results = unitId ? await syncUnit(unitId) : await syncAllUnits();

  return NextResponse.json({ results });
}
