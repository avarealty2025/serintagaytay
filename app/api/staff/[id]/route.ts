import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";
import { logAudit } from "../../../../src/data/db.ts";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id } = await params;
  const body = await req.json();
  const sb = getSupabaseAdmin();

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.role !== undefined) update.role = body.role;
  if (body.permissions !== undefined) update.permissions = body.permissions;
  if (body.active !== undefined) update.active = body.active;

  if (body.active === false) {
    update.deleted_at = new Date().toISOString();
  } else if (body.active === true) {
    update.deleted_at = null;
  }

  const { error } = await sb.from("users").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.password) {
    await sb.auth.admin.updateUserById(id, { password: body.password });
  }

  await logAudit({
    entity: "staff",
    entityId: id,
    action: "update",
    after: body,
    actor: "admin",
  });

  return NextResponse.json({ ok: true });
}
