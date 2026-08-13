import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings, logAudit } from "../../../../../src/data/db.ts";
import { getUnitPhotos as getHardcodedPhotos } from "../../../../../src/data/unit-photos.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../../src/lib/supabase.ts";

function settingsKey(unitId: string) {
  return `unit_photos:${unitId}`;
}

export interface MediaRecord {
  type?: "photo" | "video" | "youtube";
  driveId?: string;
  storagePath?: string;
  url: string;
  thumb: string;
  caption: string;
  isCover: boolean;
  videoUrl?: string;
  youtubeId?: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const settings = await getDbSettings();
  const saved = settings?.[settingsKey(id)] as MediaRecord[] | undefined;
  if (saved && saved.length > 0) {
    return NextResponse.json(saved);
  }

  const hardcoded = getHardcodedPhotos(id);
  return NextResponse.json(hardcoded.map((p, i) => ({
    type: "photo",
    url: p.url,
    thumb: p.thumb,
    caption: "",
    isCover: i === 0,
  })));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const media: MediaRecord[] = await req.json();
  const { error } = await saveDbSettings(settingsKey(id), media);
  if (error) return NextResponse.json({ error }, { status: 500 });
  await logAudit({ entity: "unit_media", entityId: id, action: "update", after: { count: media.length } });
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
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
  const fileName = `${id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const sb = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  const bucket = "unit-photos";
  await sb.storage.createBucket(bucket, { public: true }).catch(() => {});

  const { error: uploadErr } = await sb.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(fileName);

  return NextResponse.json({
    type: isVideo ? "video" : "photo",
    storagePath: fileName,
    url: urlData.publicUrl,
    thumb: isVideo ? "" : urlData.publicUrl,
  });
}
