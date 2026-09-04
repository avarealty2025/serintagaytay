import { NextRequest, NextResponse } from "next/server";
import { updateBooking, deleteBooking, logAudit, getUnitIdMap } from "../../../../src/data/db.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("bookings")
    .select("*, guests!left(name, email, phone)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const guest = data.guests as { name: string; email: string; phone: string } | null;
  const idMap = await getUnitIdMap();
  const appUnitId = idMap.get(data.unit_id) || data.unit_id;
  return NextResponse.json({
    id: data.id,
    unitId: appUnitId,
    checkIn: data.check_in,
    checkOut: data.check_out,
    status: data.status,
    guestName: guest?.name ?? "",
    guestEmail: guest?.email ?? "",
    guestPhone: guest?.phone ?? "",
    guests: data.guests_count,
    guestList: data.guest_list ?? [],
    source: data.source,
    grossAmount: Number(data.gross_amount),
    notes: data.notes,
    proofPath: data.proof_path ?? null,
    paymentType: data.payment_type ?? "reservation",
    amountPaid: Number(data.amount_paid ?? 0),
    promoCodeId: data.promo_code_id ?? null,
    discountAmount: Number(data.discount_amount ?? 0),
    parkingFee: Number(data.parking_fee ?? 0),
    parkingFeeType: data.parking_fee_type ?? "one_time",
    parkingSlot: data.parking_slot ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.collectAdd && body.amountPaid !== undefined) {
    const sb = getSupabaseAdmin();
    const { data: existing } = await sb.from("bookings").select("amount_paid").eq("id", id).single();
    if (existing) {
      body.amountPaid = Number(existing.amount_paid ?? 0) + Number(body.amountPaid);
    }
    if (body.collectedBy) {
      body.collectedAt = new Date().toISOString();
    }
    delete body.collectAdd;
  }

  const result = await updateBooking(id, body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await logAudit({
    entity: "bookings",
    entityId: id,
    action: "update",
    after: body,
    actor: "admin",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteBooking(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await logAudit({
    entity: "bookings",
    entityId: id,
    action: "delete",
    actor: "admin",
  });

  return NextResponse.json({ ok: true });
}
