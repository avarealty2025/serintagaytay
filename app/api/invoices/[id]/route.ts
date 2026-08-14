import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { getSettings } from "../../../../src/lib/settings.ts";
import { sendEmail } from "../../../../src/lib/email.ts";
import { getDbSettings } from "../../../../src/data/db.ts";

function getUnitLabel(unitId: string): string {
  const u = UNITS.find((u) => u.id === unitId);
  return u ? `${u.name || `${u.tower}-${u.code}`} (${u.tower}-${u.code})` : unitId;
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPHP(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface BookingRow {
  id: string;
  unit_id: string;
  check_in: string;
  check_out: string;
  status: string;
  source: string;
  gross_amount: number;
  guests_count: number;
  payment_type: string;
  amount_paid: number;
  discount_amount: number;
  created_at: string;
  notes: string | null;
  guests: { name: string; email: string; phone: string };
}

interface EmailTemplate {
  bannerUrl: string;
  greeting: string;
  bodyText: string;
  footerText: string;
  photos: { url: string; caption: string }[];
}

async function getBooking(id: string): Promise<BookingRow | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("bookings")
    .select(`
      id, unit_id, check_in, check_out, status, source,
      gross_amount, guests_count, payment_type, amount_paid,
      discount_amount, created_at, notes,
      guests!inner(name, email, phone)
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as BookingRow;
}

async function getEmailTemplate(): Promise<EmailTemplate | null> {
  try {
    const all = await getDbSettings();
    if (all?.email_template) return all.email_template as EmailTemplate;
  } catch {}
  return null;
}

function invoiceHtml(
  b: BookingRow,
  settings: ReturnType<typeof getSettings>,
  emailTpl: EmailTemplate | null,
): string {
  const nights = nightsBetween(b.check_in, b.check_out);
  const balance = b.gross_amount - (b.amount_paid || 0) - (b.discount_amount || 0);
  const ref = b.id.slice(0, 8).toUpperCase();
  const unit = getUnitLabel(b.unit_id);
  const statusLabel: Record<string, string> = {
    pending_payment: "Pending Payment",
    confirmed: "Confirmed",
    checked_in: "Checked In",
    checked_out: "Checked Out",
    cancelled: "Cancelled",
    payment_rejected: "Payment Rejected",
    expired: "Expired",
    no_show: "No Show",
  };

  const greeting = emailTpl?.greeting
    ? esc(emailTpl.greeting.replace(/\{guest_name\}/g, b.guests.name))
    : "";
  const bodyText = emailTpl?.bodyText ? esc(emailTpl.bodyText) : "";
  const footerCustom = emailTpl?.footerText
    ? `<p style="margin:8px 0 0;color:#777">${esc(emailTpl.footerText)}</p>`
    : "";

  const bannerHtml = emailTpl?.bannerUrl
    ? `<div style="text-align:center;background:#2F5A1E;padding:0">
        <img src="${emailTpl.bannerUrl}" alt="Serin Tagaytay" style="width:100%;max-height:200px;object-fit:cover;display:block" />
       </div>`
    : "";

  const photosHtml =
    emailTpl?.photos && emailTpl.photos.length > 0
      ? `<div style="margin:20px 0;text-align:center">
          ${emailTpl.photos
            .map(
              (p) =>
                `<div style="display:inline-block;margin:6px;text-align:center">
                  <img src="${p.url}" alt="${esc(p.caption || "")}" style="width:200px;max-width:100%;height:140px;object-fit:cover;border-radius:8px;border:1px solid #eee" />
                  ${p.caption ? `<p style="margin:4px 0 0;font-size:11px;color:#888">${esc(p.caption)}</p>` : ""}
                </div>`,
            )
            .join("")}
        </div>`
      : "";

  const greetingHtml =
    greeting || bodyText
      ? `<div style="margin-bottom:24px;padding:16px 0;border-bottom:1px solid #eee">
          ${greeting ? `<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1a1a1a">${greeting}</p>` : ""}
          ${bodyText ? `<p style="margin:0;font-size:13px;color:#555;line-height:1.6">${bodyText}</p>` : ""}
        </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin:0; padding:0; background:#f5f3ef; font-family:system-ui,-apple-system,sans-serif; color:#1a1a1a; }
  .invoice { max-width:680px; margin:0 auto; background:#fff; }
  .header { background:#2F5A1E; padding:28px 40px; display:flex; justify-content:space-between; align-items:center; }
  .brand { color:#C89F45; font-size:20px; font-weight:400; letter-spacing:1px; margin:0; }
  .brand small { display:block; color:rgba(255,255,255,0.6); font-size:10px; letter-spacing:3px; margin-top:2px; }
  .inv-label { color:#C89F45; font-size:10px; letter-spacing:3px; text-transform:uppercase; text-align:right; }
  .inv-num { color:#fff; font-size:14px; margin-top:2px; text-align:right; }
  .body { padding:32px 40px; }
  .meta-row { display:flex; justify-content:space-between; margin-bottom:24px; }
  .meta-col h4 { margin:0 0 6px; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#888; }
  .meta-col p { margin:0; font-size:13px; line-height:1.6; }
  table { width:100%; border-collapse:collapse; margin:20px 0; font-size:13px; }
  th { text-align:left; padding:10px 12px; background:#f8f6f2; border-bottom:2px solid #e5e0d5; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#888; }
  td { padding:10px 12px; border-bottom:1px solid #eee; }
  .text-right { text-align:right; }
  .total-row td { border-bottom:none; font-weight:700; font-size:15px; padding-top:14px; }
  .total-row .amt { color:#2F5A1E; }
  .status-bar { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600; letter-spacing:0.5px; }
  .status-confirmed { background:#e8f5e3; color:#2F5A1E; }
  .status-pending { background:#fff3e0; color:#a67c24; }
  .status-cancelled { background:#fdecea; color:#a4402c; }
  .status-other { background:#f0f0f0; color:#555; }
  .footer { background:#f8f6f2; padding:20px 40px; text-align:center; font-size:11px; color:#aaa; border-top:1px solid #eee; }
  @media print { body { background:#fff; } .invoice { box-shadow:none; } .no-print { display:none !important; } }
</style>
</head>
<body>
<div class="invoice">
  ${bannerHtml}
  <div class="header">
    <div>
      <p class="brand">SERIN TAGAYTAY<small>STAYCATION</small></p>
    </div>
    <div>
      <p class="inv-label">Invoice</p>
      <p class="inv-num">INV-${ref}</p>
    </div>
  </div>
  <div class="body">
    ${greetingHtml}
    <div class="meta-row">
      <div class="meta-col">
        <h4>Bill To</h4>
        <p><strong>${esc(b.guests.name)}</strong></p>
        <p>${esc(b.guests.email)}</p>
        ${b.guests.phone ? `<p>${esc(b.guests.phone)}</p>` : ""}
      </div>
      <div class="meta-col" style="text-align:right">
        <h4>Invoice Date</h4>
        <p>${formatDate(b.created_at.split("T")[0]!)}</p>
        <h4 style="margin-top:12px">Status</h4>
        <p><span class="status-bar ${b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out" ? "status-confirmed" : b.status === "cancelled" || b.status === "payment_rejected" ? "status-cancelled" : b.status === "pending_payment" ? "status-pending" : "status-other"}">${statusLabel[b.status] || b.status}</span></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${esc(unit)}</strong><br>
            <span style="color:#888;font-size:12px">${formatDate(b.check_in)} — ${formatDate(b.check_out)}</span>
          </td>
          <td class="text-right">${nights} night${nights !== 1 ? "s" : ""}</td>
          <td class="text-right">${formatPHP(b.gross_amount / nights)}</td>
          <td class="text-right">${formatPHP(b.gross_amount)}</td>
        </tr>
        ${b.discount_amount > 0 ? `
        <tr>
          <td colspan="3">Discount</td>
          <td class="text-right" style="color:#a4402c">-${formatPHP(b.discount_amount)}</td>
        </tr>` : ""}
        ${b.amount_paid > 0 ? `
        <tr>
          <td colspan="3">Amount Paid${b.payment_type === "reservation" ? " (Reservation Fee)" : ""}</td>
          <td class="text-right" style="color:#2F5A1E">-${formatPHP(b.amount_paid)}</td>
        </tr>` : ""}
        <tr class="total-row">
          <td colspan="3"><strong>${balance <= 0 ? "Total Paid" : "Balance Due"}</strong></td>
          <td class="text-right amt">${formatPHP(balance <= 0 ? b.gross_amount - (b.discount_amount || 0) : balance)}</td>
        </tr>
      </tbody>
    </table>

    ${photosHtml}

    <div style="margin-top:24px;padding:16px;background:#f8f6f2;border-radius:8px;font-size:12px;color:#555;line-height:1.6">
      <strong>Guests:</strong> ${b.guests_count} &nbsp;|&nbsp;
      <strong>Source:</strong> ${b.source || "Direct"} &nbsp;|&nbsp;
      <strong>Check-in:</strong> ${settings.booking.checkInTime.replace(/^(\d+):(\d+)$/, (_, h: string, m: string) => `${parseInt(h) > 12 ? parseInt(h) - 12 : h}:${m} ${parseInt(h) >= 12 ? "PM" : "AM"}`)} &nbsp;|&nbsp;
      <strong>Check-out:</strong> ${settings.booking.checkOutTime.replace(/^(\d+):(\d+)$/, (_, h: string, m: string) => `${parseInt(h) > 12 ? parseInt(h) - 12 : h}:${m} ${parseInt(h) >= 12 ? "PM" : "AM"}`)}
    </div>
  </div>
  <div class="footer">
    <p style="margin:0">${esc(settings.business.name)} &bull; ${esc(settings.business.address)}</p>
    ${settings.business.website ? `<p style="margin:4px 0 0">${esc(settings.business.website)}</p>` : ""}
    ${footerCustom}
  </div>
</div>
</body>
</html>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  if (jar.get("serin_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [b, emailTpl] = await Promise.all([getBooking(id), getEmailTemplate()]);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = getSettings();
  const html = invoiceHtml(b, settings, emailTpl);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  if (jar.get("serin_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [b, emailTpl] = await Promise.all([getBooking(id), getEmailTemplate()]);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { action } = await req.json();

  if (action === "send") {
    const settings = getSettings();
    const html = invoiceHtml(b, settings, emailTpl);
    const ref = b.id.slice(0, 8).toUpperCase();
    const result = await sendEmail({
      to: b.guests.email,
      subject: `Invoice INV-${ref} — Serin Tagaytay Staycation`,
      html,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sentTo: b.guests.email });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
