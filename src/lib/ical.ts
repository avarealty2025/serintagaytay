export interface ICalEvent {
  uid: string;
  summary: string;
  dtStart: string;
  dtEnd: string;
  description: string;
  location: string;
}

export interface ParsedGuest {
  name: string;
  phone: string;
  email: string;
  guests: number;
  payout: number;
}

export function parseICal(raw: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const blocks = raw.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]!.split("END:VEVENT")[0] ?? "";
    const lines = unfold(block);

    let uid = "";
    let summary = "";
    let dtStart = "";
    let dtEnd = "";
    let description = "";
    let location = "";

    for (const line of lines) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":");
      const propName = (key ?? "").split(";")[0]!.trim().toUpperCase();

      switch (propName) {
        case "UID":
          uid = value.trim();
          break;
        case "SUMMARY":
          summary = value.trim();
          break;
        case "DTSTART":
          dtStart = parseICalDate(value.trim());
          break;
        case "DTEND":
          dtEnd = parseICalDate(value.trim());
          break;
        case "DESCRIPTION":
          description = value.trim().replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");
          break;
        case "LOCATION":
          location = value.trim().replace(/\\,/g, ",");
          break;
      }
    }

    if (dtStart && dtEnd) {
      events.push({ uid, summary, dtStart, dtEnd, description, location });
    }
  }

  return events;
}

export function extractGuestInfo(event: ICalEvent, platform: string): ParsedGuest {
  const result: ParsedGuest = {
    name: "",
    phone: "",
    email: "",
    guests: 2,
    payout: 0,
  };

  const desc = event.description || "";
  const summary = event.summary || "";

  if (platform === "airbnb") {
    // Airbnb summary: "Guest Name (HMXXXXXX)"
    const nameMatch = summary.match(/^(.+?)(?:\s*\(|$)/);
    if (nameMatch) result.name = nameMatch[1]!.trim();

    // Airbnb description fields
    const phoneMatch = desc.match(/Phone(?:\s*(?:Number|:))?\s*[:\-]?\s*\+?([\d\s\-().+]+)/i);
    if (phoneMatch) result.phone = phoneMatch[1]!.trim();

    const emailMatch = desc.match(/Email\s*[:\-]?\s*([\w.+-]+@[\w.-]+\.\w+)/i);
    if (emailMatch) result.email = emailMatch[1]!.trim();

    const guestsMatch = desc.match(/(?:Number of guests|Guests)\s*[:\-]?\s*(\d+)/i);
    if (guestsMatch) result.guests = parseInt(guestsMatch[1]!, 10);

    const payoutMatch = desc.match(/(?:Payout|Total)\s*[:\-]?\s*[\p{Sc}]?\s*([\d,]+(?:\.\d+)?)/iu);
    if (payoutMatch) result.payout = parseFloat(payoutMatch[1]!.replace(/,/g, ""));
  } else if (platform === "booking.com") {
    // Booking.com summary usually has guest name
    const bcName = summary.replace(/^(CLOSED|Not available)\s*[-–]\s*/i, "").trim();
    if (bcName && !bcName.match(/^(closed|not available|reserved)/i)) {
      result.name = bcName;
    }

    const phoneMatch = desc.match(/(?:Phone|Tel|Mobile)\s*[:\-]?\s*\+?([\d\s\-().+]+)/i);
    if (phoneMatch) result.phone = phoneMatch[1]!.trim();

    const emailMatch = desc.match(/([\w.+-]+@[\w.-]+\.\w+)/i);
    if (emailMatch) result.email = emailMatch[1]!.trim();

    const priceMatch = desc.match(/(?:Price|Total|Amount)\s*[:\-]?\s*[\p{Sc}]?\s*([\d,]+(?:\.\d+)?)/iu);
    if (priceMatch) result.payout = parseFloat(priceMatch[1]!.replace(/,/g, ""));

    const guestsMatch = desc.match(/(?:Guests?|Pax)\s*[:\-]?\s*(\d+)/i);
    if (guestsMatch) result.guests = parseInt(guestsMatch[1]!, 10);
  } else if (platform === "agoda") {
    // Agoda summary typically has guest name
    const agName = summary.replace(/^(Booking|Reserved)\s*[-–:]\s*/i, "").trim();
    if (agName && !agName.match(/^(not available|closed)/i)) {
      result.name = agName;
    }

    const phoneMatch = desc.match(/(?:Phone|Tel|Mobile|Contact)\s*[:\-]?\s*\+?([\d\s\-().+]+)/i);
    if (phoneMatch) result.phone = phoneMatch[1]!.trim();

    const emailMatch = desc.match(/([\w.+-]+@[\w.-]+\.\w+)/i);
    if (emailMatch) result.email = emailMatch[1]!.trim();

    const priceMatch = desc.match(/(?:Price|Total|Amount|Rate)\s*[:\-]?\s*[\p{Sc}]?\s*([\d,]+(?:\.\d+)?)/iu);
    if (priceMatch) result.payout = parseFloat(priceMatch[1]!.replace(/,/g, ""));

    const guestsMatch = desc.match(/(?:Guests?|Pax|Adults?)\s*[:\-]?\s*(\d+)/i);
    if (guestsMatch) result.guests = parseInt(guestsMatch[1]!, 10);
  }

  if (!result.name) {
    result.name = summary || `${platform} Guest`;
  }

  return result;
}

function unfold(text: string): string[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  return unfolded
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseICalDate(val: string): string {
  const clean = val.replace(/[^0-9T]/g, "");
  if (clean.length >= 8) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  return val;
}

/** Alias for backward compat with tests and existing code */
export function parseICalFeed(raw: string): { uid: string; summary: string; checkIn: string; checkOut: string }[] {
  return parseICal(raw)
    .filter((e) => e.dtStart <= e.dtEnd)
    .map((e) => ({
      uid: e.uid,
      summary: e.summary,
      checkIn: e.dtStart,
      checkOut: e.dtEnd,
    }));
}

export function generateICalFeed(
  events: { uid: string; summary: string; checkIn: string; checkOut: string }[],
  calName: string,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Serin PMS//EN",
    `X-WR-CALNAME:${calName}`,
    "METHOD:PUBLISH",
  ];
  for (const ev of events) {
    const start = ev.checkIn.replace(/-/g, "");
    const end = ev.checkOut.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${ev.summary}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function detectSource(
  calUrl: string,
  summary: string,
): "airbnb" | "booking.com" | "agoda" | "manual" {
  const lower = calUrl.toLowerCase();
  if (lower.includes("airbnb")) return "airbnb";
  if (lower.includes("booking.com")) return "booking.com";
  if (lower.includes("agoda")) return "agoda";

  const sumLower = summary.toLowerCase();
  if (sumLower.includes("airbnb")) return "airbnb";
  if (sumLower.includes("booking.com")) return "booking.com";
  if (sumLower.includes("agoda")) return "agoda";

  return "manual";
}
