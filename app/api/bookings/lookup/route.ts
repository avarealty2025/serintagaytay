import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { name, email } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: guests, error: guestErr } = await sb
    .from("guests")
    .select("id")
    .ilike("email", email.trim());

  if (guestErr || !guests || guests.length === 0) {
    return NextResponse.json({ bookings: [] });
  }

  const guestIds = guests.map((g: { id: string }) => g.id);

  const { data: bookings, error: bookErr } = await sb
    .from("bookings")
    .select(`
      id, unit_id, check_in, check_out, status, source,
      gross_amount, guests_count, notes, payment_type, amount_paid,
      promo_code_id, discount_amount, created_at,
      guests!inner(name, email, phone)
    `)
    .in("guest_id", guestIds)
    .is("deleted_at", null)
    .order("check_in", { ascending: false });

  if (bookErr) {
    return NextResponse.json({ error: bookErr.message }, { status: 500 });
  }

  const nameLower = name.trim().toLowerCase();
  const filtered = (bookings ?? []).filter((b: Record<string, unknown>) => {
    const guest = b.guests as { name: string } | null;
    return guest?.name?.toLowerCase().includes(nameLower);
  });

  const mapped = filtered.map((b: Record<string, unknown>) => {
    const guest = b.guests as { name: string; email: string; phone: string };
    return {
      id: b.id,
      unitId: b.unit_id,
      checkIn: b.check_in,
      checkOut: b.check_out,
      status: b.status,
      source: b.source,
      grossAmount: b.gross_amount,
      guests: b.guests_count,
      paymentType: b.payment_type,
      amountPaid: b.amount_paid,
      discountAmount: b.discount_amount,
      createdAt: b.created_at,
      guestName: guest.name,
      guestEmail: guest.email,
      guestPhone: guest.phone,
    };
  });

  return NextResponse.json({ bookings: mapped });
}
