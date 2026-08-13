import { NextRequest, NextResponse } from "next/server";
import {
  getChannelConfigs,
  saveChannelConfigs,
  type UnitChannels,
} from "../../../src/data/channels.ts";
import { getDbSettings } from "../../../src/data/db.ts";

export async function GET() {
  const configs = await getChannelConfigs();
  const settings = await getDbSettings();
  const syncLog = (settings?.ota_sync_log as Record<string, string>) ?? {};
  return NextResponse.json({ configs, syncLog });
}

export async function PUT(req: NextRequest) {
  const body: { configs: UnitChannels[] } = await req.json();
  const { error } = await saveChannelConfigs(body.configs);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
