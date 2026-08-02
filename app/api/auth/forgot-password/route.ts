import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "../../../../src/lib/supabase.ts";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${req.nextUrl.origin}/admin`,
  });

  return NextResponse.json({ ok: true });
}
