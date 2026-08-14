import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";
import { getDbSettings } from "../../../../src/data/db.ts";

interface CheckinTemplate {
  instructions: string;
  houseRules: string;
  photos: { url: string; caption: string }[];
}

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

  const unitIds = [...new Set(mapped.map((b) => String(b.unitId)))];
  const checkinTemplates: Record<string, CheckinTemplate> = {};
  try {
    const allSettings = await getDbSettings();
    if (allSettings) {
      const defaultTpl = allSettings.checkin_template as CheckinTemplate | undefined;
      for (const uid of unitIds) {
        const unitTpl = allSettings[`checkin_template:${uid}`] as CheckinTemplate | undefined;
        checkinTemplates[uid] = unitTpl || defaultTpl || {
          instructions: "Check-in time is 2:00 PM. Check-out is at 12:00 PM (noon).\nProceed to the building lobby and present a valid government ID.\nYour unit key card will be provided at the front desk or via lockbox — details will be sent separately.\nWi-Fi password and unit access instructions will be provided upon check-in.",
          houseRules: "No smoking inside the unit\nNo pets allowed\nNo parties or events\nQuiet hours: 10 PM to 7 AM\nMaximum guests as per unit capacity",
          photos: [],
        };
      }
    }
  } catch {}

  return NextResponse.json({ bookings: mapped, checkinTemplates });
}
