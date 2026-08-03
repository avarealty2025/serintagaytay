import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings } from "../../../src/data/db.ts";

export async function GET() {
  const settings = await getDbSettings();
  return NextResponse.json(settings ?? {});
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { key, value } = body;
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  const result = await saveDbSettings(key, value);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
