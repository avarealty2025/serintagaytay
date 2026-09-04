import { NextRequest, NextResponse } from "next/server";
import { getBookings } from "../../../../src/data/db.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { toDateStr, addDays } from "../../../../src/lib/dates.ts";
import { formatPHP } from "../../../../src/lib/pricing.ts";
import { sendEmail } from "../../../../src/lib/email.ts";

const GONE = new Set(["checked_out", "cancelled", "payment_rejected", "expired", "no_show"]);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = toDateStr(new Date());
  const tomorrow = addDays(today, 1);
  const { bookings } = await getBookings();
  const unitMap = new Map(UNITS.map((u) => [u.id, u]));

  const live = bookings.filter((b) => !GONE.has(b.status));

  const arrivals = live.filter((b) => b.checkIn === today && b.status !== "checked_in");
  const departures = live.filter((b) => b.checkOut === today);
  const tomorrowArrivals = live.filter((b) => b.checkIn === tomorrow);
  const inHouse = live.filter((b) => b.checkIn <= today && b.checkOut > today);
  const unpaidBalances = live.filter((b) => {
    const bal = b.grossAmount - b.amountPaid;
    return bal > 0 && b.checkIn <= today;
  });

  if (arrivals.length === 0 && departures.length === 0 && tomorrowArrivals.length === 0 && unpaidBalances.length === 0) {
    return NextResponse.json({ sent: false, reason: "Nothing to report" });
  }

  function unitLabel(unitId: string) {
    const u = unitMap.get(unitId);
    return u ? `${u.tower}-${u.code} ${u.name || ""}`.trim() : unitId;
  }

  function bookingRow(b: typeof bookings[0]) {
    const bal = b.grossAmount - b.amountPaid;
    const balText = bal > 0 ? `<span style="color:#c0392b;font-weight:600">Collect ${formatPHP(bal)}</span>` : `<span style="color:#27ae60;font-weight:600">Fully Paid</span>`;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${b.guest || "(no name)"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${unitLabel(b.unitId)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${b.checkIn} → ${b.checkOut}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${balText}</td>
    </tr>`;
  }

  function section(title: string, items: typeof bookings, color: string) {
    if (items.length === 0) return "";
    return `
      <div style="margin-bottom:24px">
        <h2 style="font-size:16px;color:${color};margin:0 0 8px;border-bottom:2px solid ${color};padding-bottom:4px">${title} (${items.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="background:#f8f8f8">
            <th style="padding:8px 12px;text-align:left">Guest</th>
            <th style="padding:8px 12px;text-align:left">Unit</th>
            <th style="padding:8px 12px;text-align:left">Dates</th>
            <th style="padding:8px 12px;text-align:left">Balance</th>
          </tr></thead>
          <tbody>${items.map(bookingRow).join("")}</tbody>
        </table>
      </div>`;
  }

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:20px">
      <div style="background:#2f5a1e;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">Serin Tagaytay — Daily Summary</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.85">${today} &middot; ${inHouse.length} in house &middot; ${UNITS.filter(u => u.active).length - inHouse.length} available</p>
      </div>
      <div style="background:#fff;padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        ${section("Arriving Today", arrivals, "#2f5a1e")}
        ${section("Departing Today", departures, "#c89f45")}
        ${section("Arriving Tomorrow", tomorrowArrivals, "#3498db")}
        ${section("Balance to Collect", unpaidBalances, "#c0392b")}
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;text-align:center">
          <a href="https://tagaytaystaycation.com/admin" style="display:inline-block;background:#2f5a1e;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Open Dashboard</a>
        </div>
        <p style="text-align:center;font-size:11px;color:#999;margin:16px 0 0">This is an automated daily summary from Serin PMS.</p>
      </div>
    </div>`;

  const adminEmail = process.env.ADMIN_EMAIL || "avarealty2025@gmail.com";
  const subject = `Daily Summary: ${arrivals.length} arriving, ${departures.length} departing, ${unpaidBalances.length} unpaid — ${today}`;

  const result = await sendEmail({ to: adminEmail, subject, html });

  return NextResponse.json({
    sent: result.ok,
    error: result.error,
    stats: {
      arrivals: arrivals.length,
      departures: departures.length,
      tomorrowArrivals: tomorrowArrivals.length,
      unpaidBalances: unpaidBalances.length,
      inHouse: inHouse.length,
    },
  });
}
