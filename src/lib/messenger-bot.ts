import { getUnitsFromDb } from "../data/units-server.ts";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.ts";
import { getSettings } from "./settings.ts";
import { formatPHP } from "./pricing.ts";
import { DEFAULT_SITE_CONTENT } from "../data/site-content.ts";
import type { Unit } from "./types.ts";

/**
 * Messenger bot — rule-based intent handling.
 *
 * v1 deliberately has no LLM in the loop: it answers from the same data the
 * public site and admin already trust (units-server, settings, site-content,
 * bookings table), and hands off anything it can't confidently answer to a
 * human. Upgrading to an LLM-backed classifier later is a drop-in
 * replacement for `classifyIntent` — the reply builders below stay the same.
 *
 * House rules/check-in-out times come from `getSettings()` (the hardcoded
 * defaults in settings.ts), not the `settings` DB table — the admin UI's key
 * naming for that table isn't settled yet. If house rules become editable
 * from the admin, point this at the DB instead.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://tagaytaystaycation.com").replace(/\/$/, "");

export type Intent =
  | "greeting"
  | "rates_availability"
  | "house_rules"
  | "booking_status"
  | "faq"
  | "fallback";

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

const KEYWORDS: Record<"greeting" | "rates_availability" | "house_rules" | "booking_status", string[]> = {
  greeting: ["hi", "hello", "hey", "kamusta", "magandang"],
  rates_availability: [
    "rate", "rates", "price", "presyo", "magkano", "how much",
    "available", "availability", "vacant", "book a", "booking a",
    "open date", "free date", "pwede ba",
  ],
  house_rules: [
    "rule", "rules", "pet", "smoking", "smoke", "parking", "amenit",
    "wifi", "wi-fi", "pool", "gym", "check-in", "checkin", "check in",
    "check-out", "checkout", "check out", "curfew", "quiet hours",
  ],
  booking_status: [
    "my booking", "reservation", "status", "balance", "paid",
    "confirm", "confirmation", "reference",
  ],
};

/** Cheap keyword classifier. Order matters: email presence wins outright. */
export function classifyIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (EMAIL_RE.test(t)) return "booking_status";
  for (const key of Object.keys(KEYWORDS) as (keyof typeof KEYWORDS)[]) {
    if (KEYWORDS[key].some((w) => t.includes(w))) return key;
  }
  return "fallback";
}

const TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1-Bedroom",
  "2br": "2-Bedroom",
};

export async function buildRatesReply(): Promise<string> {
  const units = await getUnitsFromDb();
  const active = units.filter((u) => u.active);

  const byType = new Map<string, Unit[]>();
  for (const u of active) {
    const list = byType.get(u.type);
    if (list) list.push(u);
    else byType.set(u.type, [u]);
  }

  const lines: string[] = ["Our current rates:"];
  for (const [type, list] of byType) {
    const minBase = Math.min(...list.map((u) => u.baseRate));
    const maxWeekend = Math.max(...list.map((u) => u.weekendRate));
    lines.push(
      `• ${TYPE_LABELS[type] ?? type}: from ${formatPHP(minBase)}/night (weekdays), up to ${formatPHP(maxWeekend)}/night (weekends)`,
    );
  }
  lines.push("");
  lines.push(`Check exact availability for your dates and book instantly here: ${SITE_URL}/book`);
  return lines.join("\n");
}

export function buildHouseRulesReply(): string {
  const settings = getSettings();
  const rules = settings.houseRules.map((r) => `• ${r}`).join("\n");
  return [
    `Check-in: ${settings.booking.checkInTime} · Check-out: ${settings.booking.checkOutTime}`,
    "",
    "House rules:",
    rules,
    "",
    "Amenities: swimming pool, sky garden, fitness gym, Netflix/Smart TV, Wi-Fi, equipped kitchen, air conditioning, secure key-card access.",
  ].join("\n");
}

export function matchFaq(text: string): string | null {
  const t = text.toLowerCase();
  const hit = DEFAULT_SITE_CONTENT.faq.items.find((item) => {
    const words = item.question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    return words.some((w) => t.includes(w));
  });
  return hit ? hit.answer : null;
}

/**
 * Looks up bookings by guest email — deliberately email-only (not
 * name+email like the "My Booking" page) since a Messenger reply is one
 * short message and email is what a guest can reliably type on mobile.
 */
export async function lookupBookingByEmail(email: string): Promise<string> {
  if (!isSupabaseConfigured) {
    return "Booking lookups aren't available right now — reply with your name and dates and a team member will check manually.";
  }
  const sb = getSupabaseAdmin();
  const { data: guests } = await sb
    .from("guests")
    .select("id")
    .ilike("email", email.trim());

  if (!guests || guests.length === 0) {
    return `I couldn't find a booking under ${email}. Please double-check the email, or a team member will follow up shortly.`;
  }

  const guestIds = guests.map((g: { id: string }) => g.id);
  const { data: bookings } = await sb
    .from("bookings")
    .select("check_in, check_out, status, gross_amount, amount_paid")
    .in("guest_id", guestIds)
    .is("deleted_at", null)
    .order("check_in", { ascending: false })
    .limit(3);

  if (!bookings || bookings.length === 0) {
    return `I couldn't find a booking under ${email}. A team member will follow up shortly.`;
  }

  const lines = bookings.map((b: Record<string, unknown>) => {
    const gross = Number(b.gross_amount ?? 0);
    const paid = Number(b.amount_paid ?? 0);
    const balance = gross - paid;
    const balanceStr = balance > 0 ? `${formatPHP(balance)} balance due` : "fully paid";
    const status = String(b.status).replace(/_/g, " ");
    return `${b.check_in} → ${b.check_out} · ${status} · ${balanceStr}`;
  });

  return ["Here's what I found:", ...lines, "", "Message us if anything here needs updating."].join("\n");
}

export async function handleIncomingMessage(text: string): Promise<string> {
  const intent = classifyIntent(text);

  switch (intent) {
    case "greeting":
      return "Hi! 👋 Welcome to Serin Tagaytay Staycation. I can help with rates & availability, house rules/amenities, or your booking status — what do you need?";

    case "rates_availability":
      return buildRatesReply();

    case "house_rules":
      return buildHouseRulesReply();

    case "booking_status": {
      const match = text.match(EMAIL_RE);
      if (match) return lookupBookingByEmail(match[0]);
      return "Sure — reply with the email address you used when booking and I'll look it up for you.";
    }

    default: {
      const faq = matchFaq(text);
      if (faq) return faq;
      return "Thanks for your message! Let me get a team member to help with that — we'll reply here shortly.";
    }
  }
}
