"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TYPE_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "exec_studio", label: "Executive Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedrooms" },
];

export default function NewUnitPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [building, setBuilding] = useState("west");
  const [tower, setTower] = useState("1");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState("studio");
  const [unitView, setUnitView] = useState("");
  const [weekdayRate, setWeekdayRate] = useState(3000);
  const [weekendRate, setWeekendRate] = useState(3500);
  const [cleaningFee, setCleaningFee] = useState(500);
  const [extraGuestFee, setExtraGuestFee] = useState(300);
  const [capacity, setCapacity] = useState(2);
  const [maxGuests, setMaxGuests] = useState(4);
  const [icalUrl, setIcalUrl] = useState("");

  async function handleSave() {
    if (!code.trim()) {
      setError("Unit code is required (e.g. 517, 612)");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building,
          tower: Number(tower),
          code: code.trim(),
          name: name.trim() || null,
          type: unitType,
          view: unitView.trim() || null,
          baseRate: weekdayRate,
          weekendRate,
          cleaningFee,
          extraGuestFee,
          capacity,
          maxGuests,
          icalUrl: icalUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to create unit");
        return;
      }
      router.push("/admin/units");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin/units" className="back-link">
            &larr; All Units
          </Link>
          <h1 className="today">Add New Unit</h1>
        </div>
      </div>

      {error && (
        <div className="notice" style={{ background: "var(--crit)", color: "#fff", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="form-grid">
        <div>
          <div className="form-panel">
            <h2>Unit Details</h2>
            <div className="form-body">
              <div className="field-row">
                <div className="field">
                  <label>Building *</label>
                  <select value={building} onChange={(e) => setBuilding(e.target.value)}>
                    <option value="west">Serin West</option>
                    <option value="east">Serin East</option>
                  </select>
                </div>
                <div className="field">
                  <label>Tower *</label>
                  <select value={tower} onChange={(e) => setTower(e.target.value)}>
                    <option value="1">Tower 1</option>
                    <option value="2">Tower 2</option>
                    <option value="3">Tower 3</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Unit Code * (room number)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 517, 612, 906"
                  />
                </div>
                <div className="field">
                  <label>Unit Name (optional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SINAG, TANAW"
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Type</label>
                  <select value={unitType} onChange={(e) => setUnitType(e.target.value)}>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
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
                  Paste the iCal URL from Airbnb or Agoda to sync bookings
                </p>
              </div>
            </div>
          </div>

          <div className="form-panel" style={{ marginTop: "1.5rem" }}>
            <h2>Rates & Capacity</h2>
            <div className="form-body">
              <div className="field-row">
                <div className="field">
                  <label>Weekday Rate (PHP)</label>
                  <input type="number" value={weekdayRate} onChange={(e) => setWeekdayRate(Number(e.target.value))} min={0} step={100} />
                </div>
                <div className="field">
                  <label>Weekend Rate (PHP)</label>
                  <input type="number" value={weekendRate} onChange={(e) => setWeekendRate(Number(e.target.value))} min={0} step={100} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Cleaning Fee (PHP)</label>
                  <input type="number" value={cleaningFee} onChange={(e) => setCleaningFee(Number(e.target.value))} min={0} step={50} />
                </div>
                <div className="field">
                  <label>Extra Guest Fee / Night (PHP)</label>
                  <input type="number" value={extraGuestFee} onChange={(e) => setExtraGuestFee(Number(e.target.value))} min={0} step={50} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Base Capacity</label>
                  <input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} min={1} max={12} />
                </div>
                <div className="field">
                  <label>Max Guests</label>
                  <input type="number" value={maxGuests} onChange={(e) => setMaxGuests(Number(e.target.value))} min={1} max={12} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="price-summary" style={{ position: "sticky", top: "1.25rem" }}>
            <h2>Preview</h2>
            <div className="form-body">
              <div className="summary-row">
                <span>Unit</span>
                <span className="mono">{tower}-{code || "???"}</span>
              </div>
              <div className="summary-row">
                <span>Building</span>
                <span>Serin {building === "west" ? "West" : "East"}</span>
              </div>
              <div className="summary-row">
                <span>Type</span>
                <span>{TYPE_OPTIONS.find((t) => t.value === unitType)?.label}</span>
              </div>
              {unitView && (
                <div className="summary-row">
                  <span>View</span>
                  <span>{unitView}</span>
                </div>
              )}
              <div className="sep" />
              <div className="summary-row">
                <span>Weekday</span>
                <span className="mono">₱{weekdayRate.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Weekend</span>
                <span className="mono">₱{weekendRate.toLocaleString()}</span>
              </div>
              <div className="sep" />
              <div className="summary-row">
                <span>Capacity</span>
                <span>{capacity}-{maxGuests} guests</span>
              </div>

              <button
                className="btn"
                style={{ marginTop: "0.75rem", width: "100%" }}
                onClick={handleSave}
                disabled={saving || !code.trim()}
                type="button"
              >
                {saving ? "Creating..." : "Create Unit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
