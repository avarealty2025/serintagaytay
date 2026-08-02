import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ reviews: [] });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("reviews")
    .select("id, guest_name, rating, body, source, stay_date")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) return NextResponse.json({ reviews: [] });
  return NextResponse.json({ reviews: data ?? [] });
}
