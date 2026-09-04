import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "video/mp4", "video/quicktime", "video/webm",
];
const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only photos and videos allowed" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg");
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `cleaning/${fileName}`;
  const isVideo = file.type.startsWith("video");

  const sb = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await sb.storage
    .from("payment-proofs")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path, fileName, isVideo });
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage
    .from("payment-proofs")
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
