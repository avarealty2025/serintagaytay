import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ reviews: [] });
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { guestName, rating, body: reviewBody, source, stayDate, published, unitId } = body;

  if (!guestName || !rating || !reviewBody) {
    return NextResponse.json({ error: "Guest name, rating, and review are required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("reviews")
    .insert({
      guest_name: guestName,
      unit_id: unitId || null,
      rating: Number(rating),
      body: reviewBody,
      source: source || "direct",
      stay_date: stayDate || null,
      published: published !== false,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { id, guestName, rating, body: reviewBody, source, stayDate, published, unitId } = body;

  if (!id) {
    return NextResponse.json({ error: "Review id required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (guestName !== undefined) update.guest_name = guestName;
  if (rating !== undefined) update.rating = Number(rating);
  if (reviewBody !== undefined) update.body = reviewBody;
  if (source !== undefined) update.source = source;
  if (stayDate !== undefined) update.stay_date = stayDate || null;
  if (published !== undefined) update.published = published;
  if (unitId !== undefined) update.unit_id = unitId || null;

  const { error } = await sb.from("reviews").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Review id required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
