import { describe, it, expect } from "vitest";
import { parseICalFeed, generateICalFeed } from "./ical.ts";

const SAMPLE_FEED = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Airbnb//EN",
  "BEGIN:VEVENT",
  "UID:abc123@airbnb.com",
  "DTSTART;VALUE=DATE:20260801",
  "DTEND;VALUE=DATE:20260803",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:def456@airbnb.com",
  "DTSTART;VALUE=DATE:20260810",
  "DTEND;VALUE=DATE:20260815",
  "SUMMARY:Not available",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseICalFeed", () => {
  it("parses two events from Airbnb-style feed", () => {
    const events = parseICalFeed(SAMPLE_FEED);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      uid: "abc123@airbnb.com",
      summary: "Reserved",
      checkIn: "2026-08-01",
      checkOut: "2026-08-03",
    });
    expect(events[1]).toEqual({
      uid: "def456@airbnb.com",
      summary: "Not available",
      checkIn: "2026-08-10",
      checkOut: "2026-08-15",
    });
  });

  it("skips events with missing dates", () => {
    const bad = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:x@test",
      "SUMMARY:No dates",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    expect(parseICalFeed(bad)).toHaveLength(0);
  });

  it("skips events where end is before start", () => {
    const bad = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:x@test",
      "DTSTART;VALUE=DATE:20260810",
      "DTEND;VALUE=DATE:20260805",
      "SUMMARY:Bad range",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    expect(parseICalFeed(bad)).toHaveLength(0);
  });

  it("handles empty feed", () => {
    expect(parseICalFeed("")).toHaveLength(0);
    expect(parseICalFeed("BEGIN:VCALENDAR\r\nEND:VCALENDAR")).toHaveLength(0);
  });
});

describe("generateICalFeed", () => {
  it("produces a valid iCal string", () => {
    const events = [
      { uid: "test1", summary: "Blocked", checkIn: "2026-08-01", checkOut: "2026-08-03" },
    ];
    const ical = generateICalFeed(events, "Test Calendar");
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("UID:test1");
    expect(ical).toContain("DTSTART;VALUE=DATE:20260801");
    expect(ical).toContain("DTEND;VALUE=DATE:20260803");
    expect(ical).toContain("X-WR-CALNAME:Test Calendar");
  });

  it("round-trips through parse", () => {
    const events = [
      { uid: "rt1", summary: "Reserved", checkIn: "2026-09-01", checkOut: "2026-09-05" },
      { uid: "rt2", summary: "Blocked", checkIn: "2026-09-10", checkOut: "2026-09-12" },
    ];
    const ical = generateICalFeed(events, "Test");
    const parsed = parseICalFeed(ical);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]!.uid).toBe("rt1");
    expect(parsed[0]!.checkIn).toBe("2026-09-01");
    expect(parsed[1]!.uid).toBe("rt2");
    expect(parsed[1]!.checkOut).toBe("2026-09-12");
  });
});
