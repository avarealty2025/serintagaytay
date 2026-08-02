import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";
import { logAudit } from "../../../src/data/db.ts";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    staff: (data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: u.permissions || [],
      active: u.active,
      createdAt: u.created_at,
      lastLogin: u.last_login || null,
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

  const { name, email, password, role, permissions } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const { data: authUser, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { data: user, error: insertError } = await sb
    .from("users")
    .insert({
      id: authUser.user.id,
      name,
      email,
      role,
      permissions: permissions || [],
      active: true,
    })
    .select("id")
    .single();

  if (insertError) {
    await sb.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await logAudit({
    entity: "staff",
    entityId: user.id,
    action: "create",
    after: { name, email, role },
    actor: "admin",
  });

  return NextResponse.json({ id: user.id });
}
