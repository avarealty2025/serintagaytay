import { NextRequest, NextResponse } from "next/server";
import { UNITS } from "../../../src/data/units.ts";
import { getSettings } from "../../../src/lib/settings.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
};

function buildEmailHtml(data: {
  guestName: string;
  email: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: number;
  ref: string;
}) {
  const settings = getSettings();
  const unit = UNITS.find((u) => u.id === data.unitId);
  const unitLabel = unit
    ? `${unit.tower}-${unit.code} ${unit.buildingId === "west" ? "West" : "East"}${unit.name ? ` (${unit.name})` : ""}`
    : data.unitId;
  const unitType = unit ? TYPE_LABEL[unit.type] ?? unit.type : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f2f2ea;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">

<div style="background:#1c3a12;color:#dce8ce;padding:20px 24px;text-align:center">
  <h1 style="margin:0;font-size:20px;letter-spacing:0.15em;font-weight:400">${settings.business.name}</h1>
  <p style="margin:4px 0 0;font-size:12px;color:#7e9a63">${settings.business.address}</p>
</div>

<div style="background:#ffffff;padding:24px;border:1px solid #d3d5c3;border-top:none">
  <h2 style="margin:0 0 8px;font-size:22px;color:#2f5a1e;font-weight:400">Booking Confirmed</h2>
  <p style="margin:0 0 20px;color:#4a5a40;font-size:14px">
    Hi ${data.guestName}, your reservation has been confirmed. Here are your details:
  </p>

  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;color:#7c8a72;border-bottom:1px solid #e3e4d6">Reference</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;border-bottom:1px solid #e3e4d6;font-family:monospace">${data.ref}</td></tr>
    <tr><td style="padding:8px 0;color:#7c8a72;border-bottom:1px solid #e3e4d6">Unit</td>
        <td style="padding:8px 0;text-align:right;border-bottom:1px solid #e3e4d6">${unitLabel}</td></tr>
    ${unitType ? `<tr><td style="padding:8px 0;color:#7c8a72;border-bottom:1px solid #e3e4d6">Type</td>
        <td style="padding:8px 0;text-align:right;border-bottom:1px solid #e3e4d6">${unitType}</td></tr>` : ""}
    <tr><td style="padding:8px 0;color:#7c8a72;border-bottom:1px solid #e3e4d6">Check-in</td>
        <td style="padding:8px 0;text-align:right;border-bottom:1px solid #e3e4d6">${data.checkIn} at ${settings.booking.checkInTime}</td></tr>
    <tr><td style="padding:8px 0;color:#7c8a72;border-bottom:1px solid #e3e4d6">Check-out</td>
        <td style="padding:8px 0;text-align:right;border-bottom:1px solid #e3e4d6">${data.checkOut} at ${settings.booking.checkOutTime}</td></tr>
    <tr><td style="padding:8px 0;color:#7c8a72;border-bottom:1px solid #e3e4d6">Nights</td>
        <td style="padding:8px 0;text-align:right;border-bottom:1px solid #e3e4d6">${data.nights}</td></tr>
    <tr><td style="padding:8px 0;color:#7c8a72;border-bottom:1px solid #e3e4d6">Guests</td>
        <td style="padding:8px 0;text-align:right;border-bottom:1px solid #e3e4d6">${data.guests}</td></tr>
    <tr><td style="padding:12px 0;font-weight:700;font-size:16px">Total</td>
        <td style="padding:12px 0;text-align:right;font-weight:700;font-size:16px;font-family:monospace">${formatPHP(data.total)}</td></tr>
  </table>

  ${settings.payment.gcashName || settings.payment.bankName ? `
  <div style="margin-top:20px;padding:16px;background:#f2f2ea;border:1px solid #e3e4d6">
    <h3 style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7c8a72;font-weight:700">Payment Methods</h3>
    ${settings.payment.gcashName ? `
    <p style="margin:0 0 8px;font-size:13px"><strong>GCash:</strong> ${settings.payment.gcashName} — ${settings.payment.gcashNumber}</p>` : ""}
    ${settings.payment.bankName ? `
    <p style="margin:0;font-size:13px"><strong>${settings.payment.bankName}:</strong> ${settings.payment.bankAccountName} — ${settings.payment.bankAccountNumber}</p>` : ""}
  </div>` : ""}

  <div style="margin-top:20px;padding:16px;background:#f2f2ea;border:1px solid #e3e4d6">
    <h3 style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7c8a72;font-weight:700">House Rules</h3>
    <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#4a5a40;line-height:1.7">
      ${settings.houseRules.map((r) => `<li>${r}</li>`).join("")}
    </ul>
  </div>

  <p style="margin:20px 0 0;font-size:12px;color:#7c8a72;text-align:center">
    Questions? Contact us at ${settings.business.email || settings.business.phone || "serintagaytaystaycation.com"}
  </p>
</div>

<p style="text-align:center;font-size:11px;color:#7c8a72;margin:16px 0 0">
  ${settings.business.name} &middot; ${settings.business.address}
</p>

</div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestName, email, unitId, checkIn, checkOut, nights, guests, total, ref } = body;

    if (!guestName || !email || !unitId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const html = buildEmailHtml({ guestName, email, unitId, checkIn, checkOut, nights, guests, total, ref });
    const settings = getSettings();

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({
        ok: false,
        message: "Email not sent — RESEND_API_KEY not configured. Set it in Vercel environment variables.",
        html_preview: true,
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `${settings.business.name} <bookings@${process.env.RESEND_DOMAIN ?? "serintagaytaystaycation.com"}>`,
        to: [email],
        subject: `Booking Confirmed — ${ref}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, message: `Resend error: ${err}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Confirmation email sent" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
