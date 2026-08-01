/**
 * iCal (.ics) parser for Airbnb and Agoda calendar feeds.
 *
 * Both OTAs publish their blocked dates as VEVENT entries with DTSTART/DTEND
 * in DATE (not DATE-TIME) format. We parse those into BookingRange-shaped
 * objects with half-open [checkIn, checkOut) semantics, matching the rest of
 * the engine.
 *
 * The UID of each VEVENT is the idempotency key: re-importing the same feed
 * updates rather than duplicates (enforced by the unique index on
 * (channel_link_id, external_ref) in 0004).
 */

import type { DateStr } from "./dates.ts";

export interface ICalEvent {
  uid: string;
  summary: string;
  checkIn: DateStr;
  checkOut: DateStr;
}

function parseICalDate(raw: string): DateStr | null {
  const d = raw.replace(/[^0-9]/g, "");
  if (d.length < 8) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

export function parseICalFeed(ics: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const blocks = ics.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]!;
    const end = block.indexOf("END:VEVENT");
    const body = end >= 0 ? block.slice(0, end) : block;

    let uid = "";
    let summary = "";
    let dtstart: DateStr | null = null;
    let dtend: DateStr | null = null;

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.startsWith("UID:")) uid = line.slice(4).trim();
      else if (line.startsWith("SUMMARY:")) summary = line.slice(8).trim();
      else if (line.startsWith("DTSTART")) {
        const val = line.includes(":") ? line.split(":").pop()! : "";
        dtstart = parseICalDate(val);
      } else if (line.startsWith("DTEND")) {
        const val = line.includes(":") ? line.split(":").pop()! : "";
        dtend = parseICalDate(val);
      }
    }

    if (uid && dtstart && dtend && dtstart < dtend) {
      events.push({ uid, summary, checkIn: dtstart, checkOut: dtend });
    }
  }

  return events;
}

export async function fetchICalFeed(url: string): Promise<ICalEvent[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SerinPMS/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`iCal fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseICalFeed(text);
}

export function generateICalFeed(
  events: { uid: string; summary: string; checkIn: DateStr; checkOut: DateStr }[],
  calName: string,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//SerinPMS//EN`,
    `X-WR-CALNAME:${calName}`,
    "METHOD:PUBLISH",
  ];

  for (const e of events) {
    const start = e.checkIn.replace(/-/g, "");
    const end = e.checkOut.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${e.summary}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
