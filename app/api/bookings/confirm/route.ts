import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";
import { logAudit } from "../../../../src/data/db.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { nightsBetween } from "../../../../src/lib/dates.ts";
import { formatPHP } from "../../../../src/lib/pricing.ts";
import { sendEmail, bookingConfirmationHtml } from "../../../../src/lib/email.ts";

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdmin();

  const { data: booking, error: fetchErr } = await sb
    .from("bookings")
    .select("*, guests!left(name, email, phone)")
    .eq("id", bookingId)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { error: updateErr } = await sb
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAudit({
    entity: "bookings",
    entityId: bookingId,
    action: "confirm",
    before: { status: booking.status },
    after: { status: "confirmed" },
    actor: "admin",
  });

  const guest = booking.guests as { name: string; email: string; phone?: string } | null;
  const guestEmail = guest?.email;
  const guestName = guest?.name || "Guest";

  if (guestEmail) {
    const { data: unitRows } = await sb
      .from("units")
      .select("tower, code, buildings!inner(name)")
      .eq("id", booking.unit_id)
      .single();

    let unitLabel = booking.unit_id;
    if (unitRows) {
      const bRaw = unitRows.buildings as unknown as { name: string } | { name: string }[];
      const bName = Array.isArray(bRaw) ? bRaw[0]!.name : bRaw.name;
      unitLabel = `${unitRows.tower}-${unitRows.code} ${bName}`;
    }

    let nights = 0;
    try { nights = nightsBetween(booking.check_in, booking.check_out); } catch { /* skip */ }

    await sendEmail({
      to: guestEmail,
      subject: `Booking Confirmed — ${unitLabel} (${booking.check_in} to ${booking.check_out})`,
      html: bookingConfirmationHtml({
        guestName,
        unitLabel,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights,
        guests: booking.guests_count,
        totalAmount: formatPHP(Number(booking.gross_amount)),
        bookingId,
      }),
    });
  }

  return NextResponse.json({ ok: true, status: "confirmed" });
}
