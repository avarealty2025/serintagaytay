import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ valid: false, error: "Not configured" });
  }

  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ valid: false, error: "No code provided" });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("active", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, error: "Invalid promo code" });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (data.valid_from && today < data.valid_from) {
    return NextResponse.json({ valid: false, error: "This promo code is not yet active" });
  }
  if (data.valid_until && today > data.valid_until) {
    return NextResponse.json({ valid: false, error: "This promo code has expired" });
  }
  if (data.max_uses && data.current_uses >= data.max_uses) {
    return NextResponse.json({ valid: false, error: "This promo code has reached its usage limit" });
  }

  return NextResponse.json({
    valid: true,
    discountPct: Number(data.discount_pct),
    codeId: data.id,
    description: data.description,
  });
}
