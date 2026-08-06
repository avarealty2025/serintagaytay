import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

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
  if (body.code !== undefined) update.code = body.code.toUpperCase().trim();
  if (body.discountPct !== undefined) update.discount_pct = Number(body.discountPct);
  if (body.maxUses !== undefined) update.max_uses = body.maxUses ? Number(body.maxUses) : null;
  if (body.validFrom !== undefined) update.valid_from = body.validFrom || null;
  if (body.validUntil !== undefined) update.valid_until = body.validUntil || null;
  if (body.active !== undefined) update.active = body.active;
  if (body.description !== undefined) update.description = body.description || null;

  const { data, error } = await sb
    .from("promo_codes")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A promo code with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code: data });
}

export async function DELETE(
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
  const sb = getSupabaseAdmin();

  const { error } = await sb.from("promo_codes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
