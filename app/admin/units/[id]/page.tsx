"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UNITS, TAAL_VIEW_CODES } from "../../../../src/data/units.ts";
import { formatPHP } from "../../../../src/lib/pricing.ts";
import { getSettings } from "../../../../src/lib/settings.ts";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Exec Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
};

const AMENITY_OPTIONS = [
  "Wi-Fi",
  "Air Conditioning",
  "TV / Smart TV",
  "Refrigerator",
  "Microwave",
  "Electric Kettle",
  "Rice Cooker",
  "Induction Cooker",
  "Cooking Utensils",
  "Towels & Linens",
  "Hot & Cold Shower",
  "Hair Dryer",
  "Iron & Board",
  "Balcony",
  "Parking",
  "Swimming Pool Access",
  "Building Gym Access",
];

export default function UnitEditPage() {
  const params = useParams();
  const unitId = params.id as string;
  const unit = UNITS.find((u) => u.id === unitId);
  const settings = getSettings();

  const [name, setName] = useState(unit?.name ?? "");
  const [description, setDescription] = useState(unit?.description ?? "");
  const [inclusions, setInclusions] = useState((unit?.inclusions ?? []).join("\n"));
  const [weekdayRate, setWeekdayRate] = useState(unit?.baseRate ?? 0);
  const [weekendRate, setWeekendRate] = useState(unit?.weekendRate ?? 0);
  const [holidayRate, setHolidayRate] = useState(0);
  const [peakRate, setPeakRate] = useState(0);
  const [cleaningFee, setCleaningFee] = useState(unit?.cleaningFee ?? 0);
  const [extraGuestFee, setExtraGuestFee] = useState(unit?.extraGuestFee ?? 0);
  const [securityDeposit, setSecurityDeposit] = useState(settings.fees.securityDeposit);
  const [capacity, setCapacity] = useState(unit?.capacity ?? 2);
  const [maxGuests, setMaxGuests] = useState(unit?.maxGuests ?? 4);
  const [minStay, setMinStay] = useState(unit?.minStay ?? 1);
  const [amenities, setAmenities] = useState<string[]>([
    "Wi-Fi",
    "Air Conditioning",
    "TV / Smart TV",
    "Refrigerator",
    "Hot & Cold Shower",
    "Towels & Linens",
    "Swimming Pool Access",
  ]);
  const [houseRules, setHouseRules] = useState(settings.houseRules.join("\n"));
  const [checkInTime, setCheckInTime] = useState(settings.booking.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(settings.booking.checkOutTime);
  const [status, setStatus] = useState<"available" | "occupied" | "maintenance">("available");
  const [saved, setSaved] = useState(false);

  if (!unit) {
    return (
      <div className="panel">
        <div className="form-body">
          <p>Unit not found: {unitId}</p>
          <Link href="/admin/units" className="btn-outline">
            Back to Units
          </Link>
        </div>
      </div>
    );
  }

  const taal = TAAL_VIEW_CODES.has(unit.code);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleAmenity(a: string) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin/units" className="back-link">
            &larr; All Units
          </Link>
          <h1 className="today">
            {unit.tower}-{unit.code}{" "}
            {unit.buildingId === "west" ? "West" : "East"}
            {unit.name ? ` — ${unit.name}` : ""}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link
            href={`/admin/units/${unit.id}/photos`}
            className="btn-outline btn-sm"
          >
            Photos
          </Link>
        </div>
      </div>

      {saved && (
        <div className="notice" style={{ borderLeftColor: "var(--good)", background: "color-mix(in srgb, var(--good) 12%, transparent)" }}>
          <strong>Saved.</strong> Changes will persist once the database is connected.
        </div>
      )}

      <div className="form-grid">
        <div>
          <div className="form-panel">
            <h2>Unit Details</h2>
            <div className="form-body">
              <div className="field">
                <label>Unit Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SINAG, TANAW"
                />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this unit for the public listing..."
                />
              </div>
              <div className="field">
                <label>Inclusions (one per line)</label>
                <textarea
                  rows={4}
                  value={inclusions}
                  onChange={(e) => setInclusions(e.target.value)}
                  placeholder="Wi-Fi&#10;Air Conditioning&#10;Smart TV with Netflix"
                />
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                  {inclusions.split("\n").filter(Boolean).length} items &middot; shown on the public unit page
                </p>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Type</label>
                  <input type="text" value={TYPE_LABEL[unit.type]} disabled />
                </div>
                <div className="field">
                  <label>View</label>
                  <input
                    type="text"
                    value={taal ? "Taal Caldera View" : "Ridge Side"}
                    disabled
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
                <div className="field">
                  <label>Building</label>
                  <input
                    type="text"
                    value={`Serin ${unit.buildingId === "west" ? "West" : "East"}, Tower ${unit.tower}`}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>Rates</h2>
            <div className="form-body">
              <div className="field-row">
                <div className="field">
                  <label>Weekday Rate (PHP)</label>
                  <input
                    type="number"
                    value={weekdayRate}
                    onChange={(e) => setWeekdayRate(Number(e.target.value))}
                    min={0}
                    step={100}
                  />
                </div>
                <div className="field">
                  <label>Weekend Rate (PHP)</label>
                  <input
                    type="number"
                    value={weekendRate}
                    onChange={(e) => setWeekendRate(Number(e.target.value))}
                    min={0}
                    step={100}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Holiday Rate (PHP)</label>
                  <input
                    type="number"
                    value={holidayRate}
                    onChange={(e) => setHolidayRate(Number(e.target.value))}
                    min={0}
                    step={100}
                    placeholder="0 = use weekend rate"
                  />
                </div>
                <div className="field">
                  <label>Peak Season Rate (PHP)</label>
                  <input
                    type="number"
                    value={peakRate}
                    onChange={(e) => setPeakRate(Number(e.target.value))}
                    min={0}
                    step={100}
                    placeholder="0 = use weekend rate"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>Fees</h2>
            <div className="form-body">
              <div className="field-row">
                <div className="field">
                  <label>Cleaning Fee (PHP)</label>
                  <input
                    type="number"
                    value={cleaningFee}
                    onChange={(e) => setCleaningFee(Number(e.target.value))}
                    min={0}
                    step={50}
                  />
                </div>
                <div className="field">
                  <label>Extra Guest Fee / Night (PHP)</label>
                  <input
                    type="number"
                    value={extraGuestFee}
                    onChange={(e) => setExtraGuestFee(Number(e.target.value))}
                    min={0}
                    step={50}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Security Deposit (PHP)</label>
                  <input
                    type="number"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                    min={0}
                    step={100}
                  />
                </div>
                <div className="field">
                  <label>&nbsp;</label>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-3)" }}>
                    Refundable upon checkout inspection
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>Capacity &amp; Stay Rules</h2>
            <div className="form-body">
              <div className="field-row">
                <div className="field">
                  <label>Base Capacity (included in rate)</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    min={1}
                    max={12}
                  />
                </div>
                <div className="field">
                  <label>Max Guests</label>
                  <input
                    type="number"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    min={1}
                    max={12}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Min Stay (nights)</label>
                  <input
                    type="number"
                    value={minStay}
                    onChange={(e) => setMinStay(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="field">
                  <label>&nbsp;</label>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-3)" }}>
                    Bookings shorter than this are rejected
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>Check-in / Check-out Times</h2>
            <div className="form-body">
              <div className="field-row">
                <div className="field">
                  <label>Check-in Time</label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Check-out Time</label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>Amenities</h2>
            <div className="form-body">
              <div className="amenity-grid">
                {AMENITY_OPTIONS.map((a) => (
                  <label key={a} className="amenity-check">
                    <input
                      type="checkbox"
                      checked={amenities.includes(a)}
                      onChange={() => toggleAmenity(a)}
                    />
                    <span>{a}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>House Rules</h2>
            <div className="form-body">
              <div className="field">
                <label>Rules (one per line)</label>
                <textarea
                  rows={6}
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="price-summary" style={{ position: "sticky", top: "1.25rem" }}>
            <h2>Summary</h2>
            <div className="form-body">
              <div className="summary-row">
                <span>Unit</span>
                <span className="mono">
                  {unit.tower}-{unit.code}
                </span>
              </div>
              <div className="summary-row">
                <span>Building</span>
                <span>{unit.buildingId === "west" ? "Serin West" : "Serin East"}</span>
              </div>
              <div className="summary-row">
                <span>Type</span>
                <span>{TYPE_LABEL[unit.type]}</span>
              </div>
              <div className="summary-row">
                <span>View</span>
                <span>{taal ? "Taal View" : "Ridge Side"}</span>
              </div>
              <div className="sep" />
              <div className="summary-row">
                <span>Weekday</span>
                <span className="mono">{formatPHP(weekdayRate)}</span>
              </div>
              <div className="summary-row">
                <span>Weekend</span>
                <span className="mono">{formatPHP(weekendRate)}</span>
              </div>
              {holidayRate > 0 && (
                <div className="summary-row">
                  <span>Holiday</span>
                  <span className="mono">{formatPHP(holidayRate)}</span>
                </div>
              )}
              {peakRate > 0 && (
                <div className="summary-row">
                  <span>Peak</span>
                  <span className="mono">{formatPHP(peakRate)}</span>
                </div>
              )}
              <div className="sep" />
              <div className="summary-row">
                <span>Cleaning</span>
                <span className="mono">
                  {cleaningFee > 0 ? formatPHP(cleaningFee) : "Not set"}
                </span>
              </div>
              <div className="summary-row">
                <span>Extra Guest</span>
                <span className="mono">
                  {extraGuestFee > 0 ? formatPHP(extraGuestFee) : "Not set"}
                </span>
              </div>
              <div className="summary-row">
                <span>Deposit</span>
                <span className="mono">
                  {securityDeposit > 0 ? formatPHP(securityDeposit) : "Not set"}
                </span>
              </div>
              <div className="sep" />
              <div className="summary-row">
                <span>Capacity</span>
                <span>{capacity}-{maxGuests} guests</span>
              </div>
              <div className="summary-row">
                <span>Min Stay</span>
                <span>{minStay} night{minStay > 1 ? "s" : ""}</span>
              </div>
              <div className="summary-row">
                <span>Amenities</span>
                <span>{amenities.length} selected</span>
              </div>

              <button
                className="btn"
                style={{ marginTop: "0.75rem", width: "100%" }}
                onClick={handleSave}
                type="button"
              >
                Save Changes
              </button>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  textAlign: "center",
                }}
              >
                Changes will persist once Supabase is connected
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
