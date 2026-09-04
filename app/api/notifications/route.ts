import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const staffName = req.nextUrl.searchParams.get("staffName");
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

  const sb = getSupabaseAdmin();
  let query = sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);

  if (session !== "1") {
    query = query.eq("user_id", session);
  } else if (staffName) {
    query = query.eq("staff_name", staffName);
  }

  if (unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { id, ids, read } = await req.json();
  const sb = getSupabaseAdmin();

  if (ids && Array.isArray(ids)) {
    const { error } = await sb.from("notifications").update({ read: read !== false }).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (id) {
    const { error } = await sb.from("notifications").update({ read: read !== false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    if (session !== "1") {
      const { error } = await sb.from("notifications").update({ read: true }).eq("user_id", session).eq("read", false);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
