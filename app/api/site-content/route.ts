import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings } from "../../../src/data/db.ts";
import { DEFAULT_SITE_CONTENT } from "../../../src/data/site-content.ts";

export async function GET() {
  const settings = await getDbSettings();
  const content = settings?.site_content ?? DEFAULT_SITE_CONTENT;
  return NextResponse.json({ content });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = await saveDbSettings("site_content", body.content);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
