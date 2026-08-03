import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings } from "../../../../src/data/db.ts";

type ICalUrls = Record<string, string>;

async function loadIcalUrls(): Promise<ICalUrls> {
  const settings = await getDbSettings();
  if (!settings || !settings.ical_urls) return {};
  return settings.ical_urls as ICalUrls;
}

export async function GET() {
  const urls = await loadIcalUrls();
  return NextResponse.json({ urls });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { unitId, icalUrl } = body;

  if (!unitId) {
    return NextResponse.json({ error: "unitId required" }, { status: 400 });
  }

  const urls = await loadIcalUrls();

  if (icalUrl) {
    urls[unitId] = icalUrl;
  } else {
    delete urls[unitId];
  }

  const result = await saveDbSettings("ical_urls", urls);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
