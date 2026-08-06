import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ codes: [] });
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ codes: data });
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { code, discountPct, maxUses, validFrom, validUntil, description } = body;

  if (!code || !discountPct) {
    return NextResponse.json({ error: "Code and discount percentage are required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("promo_codes")
    .insert({
      code: code.toUpperCase().trim(),
      discount_pct: Number(discountPct),
      max_uses: maxUses ? Number(maxUses) : null,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      description: description || null,
      active: true,
    })
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
