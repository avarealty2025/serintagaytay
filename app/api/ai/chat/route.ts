import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBookings, getDbSettings } from "../../../../src/data/db.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { getUnitsFromDb } from "../../../../src/data/units-server.ts";
import { toDateStr } from "../../../../src/lib/dates.ts";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

function buildSystemContext(bookings: unknown[], units: unknown[], settings: unknown) {
  const today = toDateStr(new Date());
  return `You are the AI Marketing & Operations Assistant for Serin Tagaytay Staycation — a premium condo-hotel property management business in Tagaytay, Philippines. You help the admin team optimize their property for maximum bookings and revenue.

Today's date: ${today}

PROPERTY OVERVIEW:
- ${Array.isArray(units) ? units.length : 0} active units across Serin West and Serin East towers
- Unit types: Studio, Executive Studio, 1-Bedroom Suite, 2-Bedroom Suite
- Target market: Families, couples, groups looking for Tagaytay staycations
- Booking sources: Airbnb, Facebook, Direct bookings

CURRENT DATA:
- Total bookings in system: ${Array.isArray(bookings) ? bookings.length : 0}
- Units: ${JSON.stringify(Array.isArray(units) ? units.map((u: any) => ({ id: u.id, name: u.name, type: u.type, baseRate: u.baseRate, weekendRate: u.weekendRate })) : []).slice(0, 3000)}

You can help with:
1. **Photo & Listing Optimization** — suggest better photo arrangements, cover photos, listing descriptions
2. **Pricing Strategy** — suggest rate adjustments based on demand, seasons, competition
3. **Marketing Ideas** — promotions, social media content, package deals
4. **Operations** — cleaning schedules, guest experience improvements
5. **Revenue Growth** — upselling strategies, add-on services, loyalty programs
6. **Competitive Analysis** — positioning against other Tagaytay staycation properties

Be specific, actionable, and data-driven. When suggesting prices, use Philippine Peso (₱). Keep responses concise but helpful. Use bullet points for clarity. If suggesting changes, explain the expected impact.`;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to your environment variables to enable AI features." },
      { status: 500 },
    );
  }

  const { messages, context } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    context?: string;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  let bookings: unknown[] = [];
  let units: unknown[] = [];
  let settings: unknown = {};
  try {
    const b = await getBookings();
    bookings = b.bookings || [];
    units = await getUnitsFromDb();
    settings = await getDbSettings();
  } catch {}

  const systemPrompt = buildSystemContext(bookings, units, settings) +
    (context ? `\n\nCURRENT PAGE CONTEXT:\n${context}` : "");

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return NextResponse.json({ reply: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
