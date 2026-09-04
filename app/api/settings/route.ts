import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings } from "../../../src/data/db.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";

const PNL_PREFIXES = ["unit_mode:", "mgmt_fee:", "cleaning_fee_pnl:", "utilities_pct:", "fixed_expenses:", "owner_target:"];

async function isOwnerOrAdmin(userId: string): Promise<boolean> {
  if (userId === "1") return true;
  if (!isSupabaseConfigured) return true;
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("users").select("role").eq("id", userId).single();
    return data?.role === "owner" || data?.role === "super_admin";
  } catch { return true; }
}

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

  if (PNL_PREFIXES.some((p) => key.startsWith(p))) {
    const allowed = await isOwnerOrAdmin(session);
    if (!allowed) {
      return NextResponse.json({ error: "Only the owner can edit P&L settings" }, { status: 403 });
    }
  }

  const result = await saveDbSettings(key, value);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
