import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const section = formData.get("section") as string || "site";
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: "Only images and videos are accepted" }, { status: 400 });
  }

  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `File too large (max ${isVideo ? "100MB" : "10MB"})` }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const folder = isVideo ? "videos" : "photos";
  const fileName = `${section}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const sb = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  const bucket = "site-content";
  await sb.storage.createBucket(bucket, { public: true }).catch(() => {});

  const { error: uploadErr } = await sb.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(fileName);

  return NextResponse.json({
    url: urlData.publicUrl,
    type: isVideo ? "video" : "photo",
  });
}
