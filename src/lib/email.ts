import nodemailer from "nodemailer";

function clean(s: string): string {
  return s.replace(/[﻿​‌‍ \r\n]/g, "").trim();
}

const gmailUser = clean(process.env.GMAIL_USER || "");
const gmailAppPassword = clean(process.env.GMAIL_APP_PASSWORD || "");

function getTransporter() {
  if (!gmailUser || !gmailAppPassword) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });
}

interface SendOpts {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: "Gmail not configured" };

  try {
    await transporter.sendMail({
      from: `"Serin Tagaytay Staycation" <${gmailUser}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

export function bookingConfirmationHtml(data: {
  guestName: string;
  unitLabel: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: string;
  bookingId: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
      <div style="background:#2F5A1E;padding:24px 32px;text-align:center">
        <h1 style="color:#C89F45;font-size:22px;margin:0;font-weight:400;letter-spacing:1px">
          SERIN TAGAYTAY
        </h1>
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0;letter-spacing:2px">
          STAYCATION
        </p>
      </div>

      <div style="padding:32px">
        <h2 style="color:#2F5A1E;font-size:18px;margin:0 0 8px">
          Booking Confirmed
        </h2>
        <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
          Hi ${data.guestName}, your booking has been received. Here are the details:
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Booking ID</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.bookingId.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Unit</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.unitLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Check-in</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.checkIn}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Check-out</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.checkOut}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Nights</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.nights}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Guests</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.guests}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Total</td>
            <td style="padding:10px 0;font-weight:700;color:#2F5A1E;font-size:16px">${data.totalAmount}</td>
          </tr>
        </table>

        <div style="margin:24px 0;padding:16px;background:#f8f6f2;border-radius:8px;border-left:3px solid #C89F45">
          <p style="color:#555;font-size:13px;line-height:1.6;margin:0">
            <strong>Next step:</strong> Please send the reservation fee to confirm your booking.
            Payment details and instructions will be provided separately.
          </p>
        </div>

        <p style="color:#888;font-size:12px;line-height:1.6;margin:24px 0 0">
          If you have questions, reply to this email or message us on Facebook.
        </p>
      </div>

      <div style="background:#f8f6f2;padding:16px 32px;text-align:center">
        <p style="color:#aaa;font-size:11px;margin:0">
          Serin West &amp; Serin East, Tagaytay City, Cavite, Philippines
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function bookingReceivedHtml(data: {
  guestName: string;
  unitLabel: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: string;
  bookingId: string;
  paymentType?: "reservation" | "full";
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
      <div style="background:#2F5A1E;padding:24px 32px;text-align:center">
        <h1 style="color:#C89F45;font-size:22px;margin:0;font-weight:400;letter-spacing:1px">
          SERIN TAGAYTAY
        </h1>
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0;letter-spacing:2px">
          STAYCATION
        </p>
      </div>

      <div style="padding:32px">
        <h2 style="color:#2F5A1E;font-size:18px;margin:0 0 8px">
          Booking Received
        </h2>
        <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
          Hi ${data.guestName}, we received your booking request and payment proof. We will review and confirm your reservation shortly.
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Reference</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.bookingId.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Unit</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.unitLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Check-in</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.checkIn}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Check-out</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.checkOut}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Nights</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.nights}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Guests</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.guests}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Total</td>
            <td style="padding:10px 0;font-weight:700;color:#2F5A1E;font-size:16px">${data.totalAmount}</td>
          </tr>
        </table>

        <div style="margin:24px 0;padding:16px;background:#f8f6f2;border-radius:8px;border-left:3px solid #C89F45">
          ${data.paymentType === "full"
            ? `<p style="color:#2F5A1E;font-size:13px;line-height:1.6;margin:0;font-weight:600">
                You have submitted full payment of ${data.totalAmount}. We are reviewing your payment and will send a confirmation email once approved.
              </p>`
            : `<p style="color:#555;font-size:13px;line-height:1.6;margin:0">
                You have submitted a <strong>reservation fee</strong>. Your remaining balance of <strong>${data.totalAmount}</strong> must be settled <strong>on or before your arrival date</strong>.
                We are reviewing your payment and will send a confirmation email once approved.
              </p>`
          }
        </div>

        <p style="color:#888;font-size:12px;line-height:1.6;margin:24px 0 0">
          If you have questions, reply to this email or message us on Facebook.
        </p>
      </div>

      <div style="background:#f8f6f2;padding:16px 32px;text-align:center">
        <p style="color:#aaa;font-size:11px;margin:0">
          Serin West &amp; Serin East, Tagaytay City, Cavite, Philippines
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function bookingRequestHtml(data: {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  unitLabel: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: string;
  bookingId: string;
  paymentType?: "reservation" | "full";
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
      <div style="background:#2F5A1E;padding:24px 32px;text-align:center">
        <h1 style="color:#C89F45;font-size:22px;margin:0;font-weight:400;letter-spacing:1px">
          SERIN TAGAYTAY
        </h1>
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0;letter-spacing:2px">
          NEW BOOKING REQUEST
        </p>
      </div>

      <div style="padding:32px">
        <h2 style="color:#2F5A1E;font-size:18px;margin:0 0 16px">
          New Booking Request
        </h2>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Guest</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.guestName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Email</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee">${data.guestEmail}</td>
          </tr>
          ${data.guestPhone ? `<tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Phone</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee">${data.guestPhone}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Unit</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">${data.unitLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Check-in</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee">${data.checkIn}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Check-out</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee">${data.checkOut}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Nights</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee">${data.nights}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Guests</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee">${data.guests}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Total</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:700;color:#2F5A1E;font-size:16px">${data.totalAmount}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Payment</td>
            <td style="padding:10px 0;font-weight:600;color:${data.paymentType === "full" ? "#2F5A1E" : "#C89F45"}">
              ${data.paymentType === "full" ? "FULL PAYMENT" : "RESERVATION FEE ONLY"}
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;
}
