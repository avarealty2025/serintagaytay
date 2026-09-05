import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("serin_admin")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (userId === "1" || !isSupabaseConfigured) {
    return NextResponse.json({
      id: "1",
      name: "Admin",
      role: "super_admin",
      permissions: [],
      isOwner: true,
    });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select("id, name, role, permissions, active")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!data.active) {
    return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
  }

  const isOwner = data.role === "super_admin" || data.role === "owner";

  return NextResponse.json({
    id: data.id,
    name: data.name,
    role: data.role,
    permissions: data.permissions || [],
    isOwner,
  });
}
