import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { loadSheet } from "../../../../src/data/sheet.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { generateICalFeed } from "../../../../src/lib/ical.ts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const unit = UNITS.find(
    (u) => u.id.replace(/[^a-z0-9]/g, "") === token.replace(/[^a-z0-9]/g, ""),
  );
  if (!unit) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { bookings } = loadSheet(join(process.cwd(), "data"));
  const unitBookings = bookings.filter((b) => b.unitId === unit.id);

  const events = unitBookings.map((b) => ({
    uid: `${b.id}@serin-pms`,
    summary: b.source === "block" ? "Blocked" : "Reserved",
    checkIn: b.checkIn,
    checkOut: b.checkOut,
  }));

  const calName = `Serin ${unit.tower}-${unit.code} ${unit.buildingId === "west" ? "West" : "East"}`;
  const ical = generateICalFeed(events, calName);

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${unit.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
