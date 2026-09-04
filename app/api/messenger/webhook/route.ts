import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { handleIncomingMessage } from "../../../../src/lib/messenger-bot.ts";

/**
 * Facebook Messenger webhook.
 *
 * GET  — the one-time handshake Meta calls when you set the callback URL.
 * POST — every message event. Verifies the request actually came from Meta
 *        (X-Hub-Signature-256, HMAC-SHA256 of the raw body with FB_APP_SECRET)
 *        before touching anything, then replies via the Send API.
 *
 * Always returns 200 to POST once the payload is accepted — Meta retries
 * (and eventually disables the webhook) if it doesn't see a fast 200, so
 * failures are logged, not thrown back at Meta.
 */

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const APP_SECRET = process.env.FB_APP_SECRET;
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GRAPH_VERSION = "v21.0";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET || !signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface MessagingEvent {
  sender?: { id?: string };
  message?: { text?: string; is_echo?: boolean };
}

async function sendReply(psid: string, text: string): Promise<void> {
  if (!PAGE_ACCESS_TOKEN) {
    console.error("[messenger] FB_PAGE_ACCESS_TOKEN not set, cannot reply");
    return;
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: psid },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      },
    );
    if (!res.ok) {
      console.error("[messenger] Send API error", res.status, await res.text());
    }
  } catch (err) {
    console.error("[messenger] Send API request failed", err);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let payload: { object?: string; entry?: { messaging?: MessagingEvent[] }[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  if (payload.object !== "page") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const psid = event.sender?.id;
      const text = event.message?.text;
      if (!psid || !text || event.message?.is_echo) continue;

      try {
        const reply = await handleIncomingMessage(text);
        await sendReply(psid, reply);
      } catch (err) {
        console.error("[messenger] Failed to handle message", err);
      }
    }
  }

  return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
}
