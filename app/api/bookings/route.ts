import { NextRequest, NextResponse } from "next/server";
import { getBookings, createBooking, logAudit } from "../../../src/data/db.ts";
import { UNITS } from "../../../src/data/units.ts";
import { nightsBetween } from "../../../src/lib/dates.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";
import { sendEmail, bookingRequestHtml, bookingReceivedHtml } from "../../../src/lib/email.ts";

export async function GET() {
  const { bookings, problems } = await getBookings();
  return NextResponse.json({ bookings, problems });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { unitId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, source, grossAmount, notes, proofPath, guestList } = body;
  if (!unitId || !guestName || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const result = await createBooking({
    unitId,
    guestName,
    guestEmail: guestEmail || "",
    guestPhone,
    checkIn,
    checkOut,
    guests: Number(guests) || 2,
    source: source || "direct",
    grossAmount: Number(grossAmount) || 0,
    notes,
    proofPath,
    guestList: Array.isArray(guestList) ? guestList.filter((g: string) => g.trim()) : [],
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  await logAudit({ entity: "bookings", entityId: result.id!, action: "insert", after: body });

  const unit = UNITS.find((u) => u.id === unitId);
  let nights = 0;
  try { nights = nightsBetween(checkIn, checkOut); } catch { /* skip */ }
  const unitLabel = unit
    ? `${unit.tower}-${unit.code} ${unit.buildingId === "west" ? "Serin West" : "Serin East"}`
    : unitId;
  const totalAmount = grossAmount ? formatPHP(Number(grossAmount)) : "TBD";

  const adminEmail = process.env.ADMIN_EMAIL || "avarealty2025@gmail.com";
  const emailData = {
    guestName,
    guestEmail: guestEmail || "",
    guestPhone,
    unitLabel,
    checkIn,
    checkOut,
    nights,
    guests: Number(guests) || 2,
    totalAmount,
    bookingId: result.id!,
  };

  const emailResults: { admin?: string; guest?: string } = {};

  try {
    const adminResult = await sendEmail({
      to: adminEmail,
      subject: `New Booking Request: ${guestName} — ${unitLabel} (${checkIn})`,
      html: bookingRequestHtml(emailData),
    });
    if (!adminResult.ok) emailResults.admin = adminResult.error;
  } catch (e) {
    emailResults.admin = e instanceof Error ? e.message : "failed";
  }

  if (guestEmail) {
    try {
      const guestResult = await sendEmail({
        to: guestEmail,
        subject: `Booking Received — ${unitLabel} (${checkIn} to ${checkOut})`,
        html: bookingReceivedHtml(emailData),
      });
      if (!guestResult.ok) emailResults.guest = guestResult.error;
    } catch (e) {
      emailResults.guest = e instanceof Error ? e.message : "failed";
    }
  }

  return NextResponse.json({ id: result.id, emailErrors: Object.keys(emailResults).length ? emailResults : undefined });
}
