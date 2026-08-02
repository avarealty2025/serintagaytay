import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function clean(s: string): string {
  return s.replace(/[﻿​‌‍ \r\n]/g, "").trim();
}

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

export const isSupabaseConfigured = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!_client) {
    _client = createClient(url, anonKey);
  }
  return _client;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error("Supabase admin not configured — set SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}
