import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function clean(s: string): string {
  return s.replace(/[﻿​‌‍ \r\n]/g, "").trim();
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");

  if (!url || !anonKey) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return NextResponse.json(
        { error: "Auth not configured" },
        { status: 500 },
      );
    }
    if (password !== expected) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("serin_admin", "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  }

  const sb = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid email or password" },
      { status: 401 },
    );
  }

  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  if (serviceKey) {
    try {
      const { createClient: cc } = await import("@supabase/supabase-js");
      const admin = cc(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
      await admin.from("users").update({ last_login: new Date().toISOString() }).eq("id", data.user.id);
    } catch { /* best effort */ }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("serin_admin", data.user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
