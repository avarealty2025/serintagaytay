import type { Unit } from "../lib/types.ts";

/**
 * The 18 units, seeded from the `Calendar link` tab of the owner's sheet.
 *
 * 17 are active. East 809 is seeded inactive �?" it carries a live Airbnb iCal
 * link but no metadata and no bookings, and the owner confirmed it is not
 * currently let. That reconciles the sheet's 18 rows to the spec's 17 units.
 *
 * Rates come from the promotional card on the same tab, applied by unit type:
 *   studio        �,�1,800 / �,�2,200   (2�?"4 pax)
 *   exec_studio   �,�2,000 / �,�2,500   (2�?"4 pax)
 *   1br           �,�3,000 / �,�3,500   (2�?"6 pax)
 *   2br           �,�5,000 / �,�5,500   (2�?"8 pax)
 *
 * capacity = 2 throughout, reading the card's own "(2�?"N pax)" notation as
 * "the rate covers two guests, N is the ceiling".
 *
 * OPEN �?" cleaningFee and extraGuestFee are 0 because the sheet does not record
 * them. They are not zero in reality. Do not launch the public site until the
 * owner supplies both; a wrong number here undercharges every booking.
 */

const RATES = {
  studio: { base: 1800, weekend: 2200, max: 4 },
  exec_studio: { base: 2000, weekend: 2500, max: 4 },
  "1br": { base: 3000, weekend: 3500, max: 6 },
  "2br": { base: 5000, weekend: 5500, max: 8 },
} as const;

type Seed = {
  code: string;
  tower: number;
  building: "west" | "east";
  type: keyof typeof RATES;
  name?: string;
  sqm?: number;
  active?: boolean;
  taalView?: boolean;
  description?: string;
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  studio: "Cozy studio unit perfect for solo travelers or couples. Open layout with sleeping and living area combined, kitchenette, and full bathroom.",
  exec_studio: "Spacious executive studio with a premium layout, wider floor area, and upgraded finishes. Ideal for couples or small groups wanting extra comfort.",
  "1br": "Separate bedroom with queen or king bed, full living area, dining space, and equipped kitchen. Great for families or groups wanting privacy.",
  "2br": "Two-bedroom suite with separate master and guest bedrooms, full living and dining area, and equipped kitchen. Perfect for families or group getaways.",
};

const INCLUSIONS_BY_TYPE: Record<string, string[]> = {
  studio: [
    "Wi-Fi",
    "Air Conditioning",
    "Smart TV with Netflix",
    "Refrigerator",
    "Electric Kettle",
    "Towels & Bed Linens",
    "Hot & Cold Shower",
    "Swimming Pool Access",
  ],
  exec_studio: [
    "Wi-Fi",
    "Air Conditioning",
    "Smart TV with Netflix",
    "Refrigerator",
    "Microwave",
    "Electric Kettle",
    "Rice Cooker",
    "Towels & Bed Linens",
    "Hot & Cold Shower",
    "Hair Dryer",
    "Swimming Pool Access",
  ],
  "1br": [
    "Wi-Fi",
    "Air Conditioning",
    "Smart TV with Netflix",
    "Refrigerator",
    "Microwave",
    "Electric Kettle",
    "Rice Cooker",
    "Induction Cooker",
    "Cooking Utensils",
    "Towels & Bed Linens",
    "Hot & Cold Shower",
    "Hair Dryer",
    "Iron & Board",
    "Swimming Pool Access",
  ],
  "2br": [
    "Wi-Fi",
    "Air Conditioning (all rooms)",
    "Smart TV with Netflix",
    "Refrigerator",
    "Microwave",
    "Electric Kettle",
    "Rice Cooker",
    "Induction Cooker",
    "Cooking Utensils & Dining Set",
    "Towels & Bed Linens",
    "Hot & Cold Shower",
    "Hair Dryer",
    "Iron & Board",
    "Balcony",
    "Swimming Pool Access",
  ],
};

/**
 * Units the sheet describes as facing Taal: 2-919 "Balcony Taal View 2 BR
 * Suite" and 2-1407 "Cozy Taal View 1Br". Everything else is ridge-side.
 */
export const TAAL_VIEW_CODES = new Set(["919", "1407"]);

const SEEDS: Seed[] = [
  // �"?�"? Serin West �"?�"?
  { code: "121", tower: 1, building: "west", type: "1br", sqm: 56.61 },
  { code: "201", tower: 2, building: "west", type: "2br", sqm: 75 },
  { code: "210", tower: 1, building: "west", type: "studio", name: "SINAG", sqm: 22.58 },
  { code: "221", tower: 2, building: "west", type: "2br" },
  { code: "420", tower: 2, building: "west", type: "1br", name: "AMIHAN", sqm: 50.75 },
  { code: "511", tower: 1, building: "west", type: "1br", name: "PAYAPA", sqm: 41.02 },
  { code: "517", tower: 1, building: "west", type: "exec_studio", sqm: 30.51 },
  { code: "605", tower: 1, building: "west", type: "exec_studio", name: "DAPITHAPON", sqm: 32 },
  { code: "906", tower: 1, building: "west", type: "exec_studio", sqm: 32 },
  { code: "919", tower: 2, building: "west", type: "2br", name: "TANAW", sqm: 80 },
  { code: "1407", tower: 2, building: "west", type: "1br", name: "DUNGAW", sqm: 41.02 },

  // �"?�"? Serin East �"?�"?
  { code: "114", tower: 2, building: "east", type: "exec_studio", sqm: 32.8 },
  { code: "220", tower: 1, building: "east", type: "exec_studio", sqm: 30.45 },
  { code: "407", tower: 2, building: "east", type: "studio", sqm: 22.7 },
  { code: "414", tower: 1, building: "east", type: "studio", sqm: 22.4 },
  { code: "517", tower: 1, building: "east", type: "studio", sqm: 23.2 },
  { code: "726", tower: 2, building: "east", type: "1br", name: "KANLUNGAN", sqm: 54.5 },
  { code: "809", tower: 1, building: "east", type: "exec_studio", active: false },
];

export const UNITS: Unit[] = SEEDS.map((s) => {
  const r = RATES[s.type];
  const unit: Unit = {
    id: `${s.building}-${s.tower}-${s.code}`,
    buildingId: s.building,
    tower: s.tower,
    code: s.code,
    type: s.type,
    description: s.description ?? TYPE_DESCRIPTIONS[s.type] ?? "",
    inclusions: INCLUSIONS_BY_TYPE[s.type] ?? [],
    sqm: s.sqm,
    capacity: 2,
    maxGuests: r.max,
    baseRate: r.base,
    weekendRate: r.weekend,
    cleaningFee: 0,
    extraGuestFee: 0,
    minStay: 1,
    active: s.active !== false,
  };
  if (s.name) unit.name = s.name;
  return unit;
});

/**
 * Resolves the sheet's informal unit tokens ("2-919", "1-517 EAST", "906.0").
 *
 * The tower digit does NOT encode the building �?" 2-420 is West, 2-407 is East
 * �?" so the code alone identifies a unit, with one exception: 517 exists in
 * both buildings and must carry an explicit EAST/WEST marker. Anything
 * ambiguous returns null rather than guessing, because a wrong guess
 * attributes a booking to the wrong building.
 */
export function resolveUnit(token: string): Unit | null {
  const raw = token.trim().toUpperCase();
  if (!raw) return null;

  const explicitEast = raw.includes("EAST");
  const explicitWest = raw.includes("WEST");

  // "2-919" �?' 919 ; "906.0" �?' 906 ; "1-517 EAST" �?' 517
  const cleaned = raw.replace(/EAST|WEST/g, "").trim();
  const dashed = cleaned.match(/^(\d)\s*-\s*(\d{3,4})/);
  const plain = cleaned.match(/^(\d{3,4})(?:\.0)?$/);
  const code = dashed?.[2] ?? plain?.[1];
  if (!code) return null;

  const matches = UNITS.filter((u) => u.code === code);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  // Only 517 collides. Require the explicit marker.
  if (explicitEast) return matches.find((u) => u.buildingId === "east") ?? null;
  if (explicitWest) return matches.find((u) => u.buildingId === "west") ?? null;
  return null;
}
