"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UNITS, TAAL_VIEW_CODES } from "../../../../src/data/units.ts";
import { formatPHP } from "../../../../src/lib/pricing.ts";

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

  const [name, setName] = useState(unit?.name ?? "");
  const [description, setDescription] = useState(unit?.description ?? "");
  const [inclusions, setInclusions] = useState((unit?.inclusions ?? []).join("\n"));
  const [weekdayRate, setWeekdayRate] = useState(unit?.baseRate ?? 0);
  const [weekendRate, setWeekendRate] = useState(unit?.weekendRate ?? 0);
  const [cleaningFee, setCleaningFee] = useState(unit?.cleaningFee ?? 0);
  const [extraGuestFee, setExtraGuestFee] = useState(unit?.extraGuestFee ?? 0);
  const [parkingFee, setParkingFee] = useState(0);
  const [earlyCheckinFee, setEarlyCheckinFee] = useState(0);
  const [lateCheckoutFee, setLateCheckoutFee] = useState(0);
  const [weeklyDiscountPct, setWeeklyDiscountPct] = useState(0);
  const [monthlyDiscountPct, setMonthlyDiscountPct] = useState(0);
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
  const [unitType, setUnitType] = useState<string>(unit?.type ?? "studio");
  const [unitView, setUnitView] = useState(unit ? (TAAL_VIEW_CODES.has(unit.code) ? "Taal Caldera View" : "Ridge Side") : "");
  const [icalUrl, setIcalUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/units/${unitId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setName(data.name || "");
          setDescription(data.description || "");
          setWeekdayRate(data.baseRate ?? 0);
          setWeekendRate(data.weekendRate ?? 0);
          setCleaningFee(data.cleaningFee ?? 0);
          setExtraGuestFee(data.extraGuestFee ?? 0);
          setParkingFee(data.parkingFee ?? 0);
          setEarlyCheckinFee(data.earlyCheckinFee ?? 0);
          setLateCheckoutFee(data.lateCheckoutFee ?? 0);
          setWeeklyDiscountPct(data.weeklyDiscountPct ?? 0);
          setMonthlyDiscountPct(data.monthlyDiscountPct ?? 0);
          setCapacity(data.capacity ?? 2);
          setMaxGuests(data.maxGuests ?? 4);
          setMinStay(data.minStay ?? 1);
          if (data.amenities?.length) setAmenities(data.amenities);
          if (data.type) setUnitType(data.type);
        }
        setDbLoaded(true);
      })
      .catch(() => setDbLoaded(true));

    fetch("/api/units/ical-urls")
      .then((r) => r.json())
      .then((data) => {
        if (data.urls && data.urls[unitId]) {
          setIcalUrl(data.urls[unitId]);
        }
      })
      .catch(() => {});
  }, [unitId]);

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

  async function handleSave() {
    setSaving(true);
    try {
      const [unitRes, icalRes] = await Promise.all([
        fetch(`/api/units/${unitId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            type: unitType,
            baseRate: weekdayRate,
            weekendRate,
            cleaningFee,
            extraGuestFee,
            parkingFee,
            earlyCheckinFee,
            lateCheckoutFee,
            weeklyDiscountPct,
            monthlyDiscountPct,
            capacity,
            maxGuests,
            minStay,
            amenities,
          }),
        }),
        fetch("/api/units/ical-urls", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId, icalUrl }),
        }),
      ]);

      const unitData = await unitRes.json();
      if (!unitRes.ok || unitData.error) {
        alert(`Failed to save unit: ${unitData.error || "Unknown error"}`);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
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
            href={`/admin/units/${unit.id}/calendar`}
            className="btn-outline btn-sm"
          >
            Calendar
          </Link>
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
          <strong>Saved.</strong> Unit updated successfully.
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
              <div className="field-row">
                <div className="field">
                  <label>Type</label>
                  <select value={unitType} onChange={(e) => setUnitType(e.target.value)}>
                    <option value="studio">Studio</option>
                    <option value="exec_studio">Executive Studio</option>
                    <option value="1br">1 Bedroom</option>
                    <option value="2br">2 Bedrooms</option>
                  </select>
                </div>
                <div className="field">
                  <label>View</label>
                  <input
                    type="text"
                    value={unitView}
                    onChange={(e) => setUnitView(e.target.value)}
                    placeholder="e.g. Taal Caldera View, Ridge Side..."
                  />
                </div>
              </div>
              <div className="field">
                <label>iCal Calendar URL</label>
                <input
                  type="url"
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                />
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                  Paste the iCal URL from Airbnb, Agoda, or other platforms to sync bookings
                </p>
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
                  <label>Parking Fee (PHP)</label>
                  <input
                    type="number"
                    value={parkingFee}
                    onChange={(e) => setParkingFee(Number(e.target.value))}
                    min={0}
                    step={50}
                  />
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                    Per stay. Set 0 if parking is free or not available.
                  </p>
                </div>
                <div className="field">
                  <label>&nbsp;</label>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Early Check-in Fee (PHP)</label>
                  <input
                    type="number"
                    value={earlyCheckinFee}
                    onChange={(e) => setEarlyCheckinFee(Number(e.target.value))}
                    min={0}
                    step={50}
                  />
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                    Charged when guest requests early check-in
                  </p>
                </div>
                <div className="field">
                  <label>Late Check-out Fee (PHP)</label>
                  <input
                    type="number"
                    value={lateCheckoutFee}
                    onChange={(e) => setLateCheckoutFee(Number(e.target.value))}
                    min={0}
                    step={50}
                  />
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                    Charged when guest requests late check-out
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>Discounts</h2>
            <div className="form-body">
              <div className="field-row">
                <div className="field">
                  <label>Weekly Discount (%)</label>
                  <input
                    type="number"
                    value={weeklyDiscountPct}
                    onChange={(e) => setWeeklyDiscountPct(Number(e.target.value))}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                    Applied to stays of 7+ nights
                  </p>
                </div>
                <div className="field">
                  <label>Monthly Discount (%)</label>
                  <input
                    type="number"
                    value={monthlyDiscountPct}
                    onChange={(e) => setMonthlyDiscountPct(Number(e.target.value))}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                    Applied to stays of 28+ nights
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
                <span>{TYPE_LABEL[unitType] ?? unitType}</span>
              </div>
              <div className="summary-row">
                <span>View</span>
                <span>{unitView || "—"}</span>
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
              {parkingFee > 0 && (
                <div className="summary-row">
                  <span>Parking</span>
                  <span className="mono">{formatPHP(parkingFee)}</span>
                </div>
              )}
              {earlyCheckinFee > 0 && (
                <div className="summary-row">
                  <span>Early Check-in</span>
                  <span className="mono">{formatPHP(earlyCheckinFee)}</span>
                </div>
              )}
              {lateCheckoutFee > 0 && (
                <div className="summary-row">
                  <span>Late Check-out</span>
                  <span className="mono">{formatPHP(lateCheckoutFee)}</span>
                </div>
              )}
              <div className="sep" />
              {(weeklyDiscountPct > 0 || monthlyDiscountPct > 0) && (
                <>
                  {weeklyDiscountPct > 0 && (
                    <div className="summary-row">
                      <span>Weekly Discount</span>
                      <span>{weeklyDiscountPct}%</span>
                    </div>
                  )}
                  {monthlyDiscountPct > 0 && (
                    <div className="summary-row">
                      <span>Monthly Discount</span>
                      <span>{monthlyDiscountPct}%</span>
                    </div>
                  )}
                  <div className="sep" />
                </>
              )}
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
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
