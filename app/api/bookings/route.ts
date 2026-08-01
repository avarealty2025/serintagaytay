import { NextRequest, NextResponse } from "next/server";
import { getBookings, createBooking, logAudit } from "../../../src/data/db.ts";

export async function GET() {
  const { bookings, problems } = await getBookings();
  return NextResponse.json({ bookings, problems });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { unitId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, source, grossAmount, notes } = body;
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
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  await logAudit({ entity: "bookings", entityId: result.id!, action: "insert", after: body });
  return NextResponse.json({ id: result.id });
}
