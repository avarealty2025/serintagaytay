"use client";

import { useState, useEffect } from "react";
import { UNITS } from "../../../src/data/units.ts";

interface ChannelCalendar {
  platform: "airbnb" | "booking.com" | "agoda";
  icalUrl: string;
  enabled: boolean;
}

interface UnitChannels {
  unitId: string;
  calendars: ChannelCalendar[];
}

interface PreviewEvent {
  unit: string;
  platform: string;
  checkIn: string;
  checkOut: string;
  guest: string;
  phone: string;
  email: string;
  pax: number;
  payout: number;
  summary: string;
  description: string;
  uid: string;
  status: "new" | "exists" | "blocked";
  notes: string;
}

interface EditableEvent extends PreviewEvent {
  selected: boolean;
  editGuest: string;
  editPhone: string;
  editPax: number;
  editRate: number;
}

const PLATFORMS: { id: "airbnb" | "booking.com" | "agoda"; label: string; color: string }[] = [
  { id: "airbnb", label: "Airbnb", color: "#FF5A5F" },
  { id: "booking.com", label: "Booking.com", color: "#003580" },
  { id: "agoda", label: "Agoda", color: "#5542F6" },
];

const activeUnits = UNITS.filter((u) => u.active);

function emptyCalendars(): ChannelCalendar[] {
  return PLATFORMS.map((p) => ({ platform: p.id, icalUrl: "", enabled: false }));
}

function unitLabel(unitId: string): string {
  const u = activeUnits.find((x) => x.id === unitId);
  return u ? `${u.tower}-${u.code}${u.buildingId === "east" ? " E" : ""}` : unitId;
}

export default function ChannelsPage() {
  const [configs, setConfigs] = useState<UnitChannels[]>([]);
  const [syncLog, setSyncLog] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [previewing, setPreviewing] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<EditableEvent[] | null>(null);
  const [previewCounts, setPreviewCounts] = useState<{ total: number; new: number; existing: number; blocked: number } | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((d) => {
        setConfigs(d.configs ?? []);
        setSyncLog(d.syncLog ?? {});
      })
      .catch(() => setStatus("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  function getUnitConfig(unitId: string): UnitChannels {
    return configs.find((c) => c.unitId === unitId) ?? { unitId, calendars: emptyCalendars() };
  }

  function updateCalendar(unitId: string, platform: string, patch: Partial<ChannelCalendar>) {
    setConfigs((prev) => {
      const existing = prev.find((c) => c.unitId === unitId);
      if (existing) {
        return prev.map((c) =>
          c.unitId === unitId
            ? { ...c, calendars: c.calendars.map((cal) => cal.platform === platform ? { ...cal, ...patch } : cal) }
            : c,
        );
      }
      return [...prev, { unitId, calendars: emptyCalendars().map((cal) => cal.platform === platform ? { ...cal, ...patch } : cal) }];
    });
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/channels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ configs }) });
      if (!res.ok) throw new Error();
      setStatus("Saved");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setPreviewEvents(null);
    setPreviewCounts(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/channels/sync-preview");
      const data = await res.json();
      const events: PreviewEvent[] = data.events ?? [];
      setPreviewCounts({ total: data.total, new: data.new, existing: data.existing, blocked: data.blocked });
      setPreviewEvents(
        events.map((e) => ({
          ...e,
          selected: e.status === "new" || e.status === "blocked",
          editGuest: e.guest || "",
          editPhone: e.phone || "",
          editPax: e.pax || 2,
          editRate: e.payout || 0,
        })),
      );
    } catch {
      setStatus("Preview failed — check iCal URLs");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!previewEvents) return;
    const selected = previewEvents.filter((e) => e.selected && e.status !== "exists");
    if (selected.length === 0) {
      setStatus("No entries selected");
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const entries = selected.map((e) => ({
        uid: e.uid,
        guest: e.editGuest || undefined,
        phone: e.editPhone || undefined,
        pax: e.editPax || undefined,
        rate: e.editRate || undefined,
      }));
      const res = await fetch("/api/channels/sync-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, includePast: true }),
      });
      const data = await res.json();
      setImportResult(data);
      setPreviewEvents(null);
      setPreviewCounts(null);
    } catch {
      setStatus("Import failed");
    } finally {
      setImporting(false);
    }
  }

  function updateEvent(idx: number, patch: Partial<EditableEvent>) {
    setPreviewEvents((prev) => prev ? prev.map((e, i) => i === idx ? { ...e, ...patch } : e) : prev);
  }

  function toggleAll(checked: boolean) {
    setPreviewEvents((prev) => prev ? prev.map((e) => e.status === "exists" ? e : { ...e, selected: checked }) : prev);
  }

  const totalConfigured = configs.reduce(
    (sum, c) => sum + c.calendars.filter((cal) => cal.enabled && cal.icalUrl).length, 0,
  );

  if (loading) {
    return <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>Loading channel settings...</div>;
  }

  const newEvents = previewEvents?.filter((e) => e.status === "new") ?? [];
  const blockedEvents = previewEvents?.filter((e) => e.status === "blocked") ?? [];
  const existingEvents = previewEvents?.filter((e) => e.status === "exists") ?? [];
  const selectedCount = previewEvents?.filter((e) => e.selected && e.status !== "exists").length ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">OTA Channels</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-2)" }}>
            Connect Airbnb, Booking.com, and Agoda calendars. Preview before importing.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {status && (
            <span style={{ fontSize: "0.85rem", color: status === "Saved" ? "var(--good)" : "var(--crit)" }}>
              {status}
            </span>
          )}
          <button
            className="btn-outline"
            onClick={handlePreview}
            disabled={previewing || totalConfigured === 0}
            type="button"
          >
            {previewing ? "Loading Preview..." : "Sync Preview"}
          </button>
          <button className="btn" onClick={handleSave} disabled={saving} type="button">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="notice" style={{ borderLeftColor: "var(--good)", background: "color-mix(in srgb, var(--good) 12%, transparent)", marginBottom: "1rem" }}>
          <strong>Import complete:</strong> {importResult.imported} imported, {importResult.skipped} skipped
          {importResult.errors.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--crit)" }}>
              {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {previewEvents && previewCounts && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>
              Sync Preview
              <span className="hint" style={{ marginLeft: "0.5rem" }}>
                {previewCounts.new} new, {previewCounts.blocked} blocked, {previewCounts.existing} existing
              </span>
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>{selectedCount} selected</span>
              <button className="btn" onClick={handleImport} disabled={importing || selectedCount === 0} type="button">
                {importing ? "Importing..." : `Import ${selectedCount} Selected`}
              </button>
              <button className="btn-outline" onClick={() => { setPreviewEvents(null); setPreviewCounts(null); }} type="button">
                Cancel
              </button>
            </div>
          </div>

          {newEvents.length > 0 && (
            <>
              <h3 style={{ fontSize: "0.9rem", margin: "1rem 0 0.5rem", color: "var(--good)" }}>
                New Bookings ({newEvents.length})
              </h3>
              <div className="tbl-scroll">
                <table className="tbl" style={{ fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={newEvents.every((e) => e.selected)} onChange={(ev) => {
                        const val = ev.target.checked;
                        setPreviewEvents((prev) => prev ? prev.map((e) => e.status === "new" ? { ...e, selected: val } : e) : prev);
                      }} /></th>
                      <th>Unit</th>
                      <th>Platform</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Guest Name</th>
                      <th>Phone</th>
                      <th>Pax</th>
                      <th>Rate</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEvents.map((e, idx) => {
                      if (e.status !== "new") return null;
                      return (
                        <tr key={e.uid} style={{ background: e.selected ? "color-mix(in srgb, var(--good) 8%, transparent)" : undefined }}>
                          <td><input type="checkbox" checked={e.selected} onChange={(ev) => updateEvent(idx, { selected: ev.target.checked })} /></td>
                          <td className="mono" style={{ fontWeight: 600 }}>{unitLabel(e.unit)}</td>
                          <td><span className={`src-pill ${e.platform === "booking.com" ? "booking" : e.platform}`}>{e.platform}</span></td>
                          <td className="mono">{e.checkIn}</td>
                          <td className="mono">{e.checkOut}</td>
                          <td>
                            <input type="text" value={e.editGuest} onChange={(ev) => updateEvent(idx, { editGuest: ev.target.value })}
                              style={{ width: "10rem", fontSize: "0.8rem", padding: "0.2rem 0.4rem" }} placeholder="Guest name" />
                          </td>
                          <td>
                            <input type="text" value={e.editPhone} onChange={(ev) => updateEvent(idx, { editPhone: ev.target.value })}
                              style={{ width: "8rem", fontSize: "0.8rem", padding: "0.2rem 0.4rem" }} placeholder="Phone" />
                          </td>
                          <td>
                            <input type="number" value={e.editPax} onChange={(ev) => updateEvent(idx, { editPax: Number(ev.target.value) || 2 })}
                              style={{ width: "3rem", fontSize: "0.8rem", padding: "0.2rem 0.4rem", textAlign: "center" }} min={1} />
                          </td>
                          <td>
                            <input type="number" value={e.editRate} onChange={(ev) => updateEvent(idx, { editRate: Number(ev.target.value) || 0 })}
                              style={{ width: "5rem", fontSize: "0.8rem", padding: "0.2rem 0.4rem", textAlign: "right" }} min={0} />
                          </td>
                          <td style={{ fontSize: "0.75rem", color: "var(--text-3)", maxWidth: "12rem" }}>{e.notes || e.summary}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {blockedEvents.length > 0 && (
            <>
              <h3 style={{ fontSize: "0.9rem", margin: "1.5rem 0 0.5rem", color: "var(--text-3)" }}>
                Blocked Dates ({blockedEvents.length})
                <span style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "0.5rem" }}>synced to calendar only</span>
              </h3>
              <div className="tbl-scroll">
                <table className="tbl" style={{ fontSize: "0.8rem" }}>
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={blockedEvents.every((e) => e.selected)} onChange={(ev) => {
                        const val = ev.target.checked;
                        setPreviewEvents((prev) => prev ? prev.map((e) => e.status === "blocked" ? { ...e, selected: val } : e) : prev);
                      }} /></th>
                      <th>Unit</th>
                      <th>Platform</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEvents.map((e, idx) => {
                      if (e.status !== "blocked") return null;
                      return (
                        <tr key={e.uid} style={{ opacity: e.selected ? 1 : 0.5 }}>
                          <td><input type="checkbox" checked={e.selected} onChange={(ev) => updateEvent(idx, { selected: ev.target.checked })} /></td>
                          <td className="mono" style={{ fontWeight: 600 }}>{unitLabel(e.unit)}</td>
                          <td>{e.platform}</td>
                          <td className="mono">{e.checkIn}</td>
                          <td className="mono">{e.checkOut}</td>
                          <td style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{e.notes || e.summary}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {existingEvents.length > 0 && (
            <>
              <h3 style={{ fontSize: "0.9rem", margin: "1.5rem 0 0.5rem", color: "var(--text-3)" }}>
                Already Synced ({existingEvents.length})
              </h3>
              <div className="tbl-scroll">
                <table className="tbl" style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Platform</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Guest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingEvents.map((e) => (
                      <tr key={e.uid}>
                        <td className="mono">{unitLabel(e.unit)}</td>
                        <td>{e.platform}</td>
                        <td className="mono">{e.checkIn}</td>
                        <td className="mono">{e.checkOut}</td>
                        <td>{e.guest || e.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", gap: "0.5rem" }}>
            <button className="btn" onClick={handleImport} disabled={importing || selectedCount === 0} type="button">
              {importing ? "Importing..." : `Import ${selectedCount} Selected`}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {PLATFORMS.map((p) => {
          const count = configs.reduce(
            (n, c) => n + (c.calendars.find((cal) => cal.platform === p.id && cal.enabled && cal.icalUrl) ? 1 : 0), 0,
          );
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-sm)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, display: "inline-block" }} />
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{p.label}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>{count} unit{count !== 1 ? "s" : ""}</span>
            </div>
          );
        })}
      </div>

      <div className="form-panel">
        <h2>iCal Calendar URLs</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 1rem" }}>
          Paste the iCal export URL from each platform for each unit. Find these in:
        </p>
        <ul style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 1.5rem", paddingLeft: "1.25rem" }}>
          <li><strong>Airbnb:</strong> Listing &rarr; Calendar &rarr; Availability &rarr; Export Calendar</li>
          <li><strong>Booking.com:</strong> Property &rarr; Rates &amp; Availability &rarr; Sync Calendars &rarr; Export</li>
          <li><strong>Agoda:</strong> Property &rarr; Rate &amp; Availability &rarr; iCal &rarr; Export URL</li>
        </ul>

        <div className="form-body">
          {activeUnits.map((unit) => {
            const config = getUnitConfig(unit.id);
            const hasAny = config.calendars.some((c) => c.icalUrl);
            return (
              <div key={unit.id} style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", marginBottom: "1rem", borderLeft: hasAny ? "3px solid var(--good)" : "3px solid var(--line-soft)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <strong>{unit.name || `${unit.tower}-${unit.code}`}</strong>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-3)", marginLeft: "0.5rem" }}>{unit.tower}-{unit.code}</span>
                  </div>
                </div>
                {PLATFORMS.map((p) => {
                  const cal = config.calendars.find((c) => c.platform === p.id) ?? { platform: p.id, icalUrl: "", enabled: false };
                  const lastSync = syncLog[`${unit.id}:${p.id}`];
                  return (
                    <div key={p.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", minWidth: 120, fontSize: "0.85rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={cal.enabled} onChange={(e) => updateCalendar(unit.id, p.id, { enabled: e.target.checked })} />
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                        {p.label}
                      </label>
                      <input
                        type="url"
                        placeholder={`Paste ${p.label} iCal URL...`}
                        value={cal.icalUrl}
                        onChange={(e) => updateCalendar(unit.id, p.id, { icalUrl: e.target.value })}
                        style={{ flex: 1, fontSize: "0.8rem" }}
                      />
                      {lastSync && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                          Last: {new Date(lastSync).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-panel" style={{ marginTop: "1.5rem" }}>
        <h2>Export to OTA Platforms</h2>
        <div className="form-body">
          <p style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 0.5rem" }}>
            Import these iCal URLs into Airbnb / Booking.com / Agoda so they see your direct bookings
            and block those dates automatically (two-way sync).
          </p>
          <ul style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 1rem", paddingLeft: "1.25rem" }}>
            <li><strong>Airbnb:</strong> Listing &rarr; Calendar &rarr; Availability &rarr; Import Calendar &rarr; paste URL</li>
            <li><strong>Agoda:</strong> Property &rarr; Rate &amp; Availability &rarr; iCal &rarr; Import URL</li>
            <li>When you block or unblock dates here, OTAs will pick it up on their next sync (usually every 1-4 hours).</li>
          </ul>
          {activeUnits.map((unit) => {
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
            const token = unit.id.replace(/[^a-z0-9]/g, "");
            const exportUrl = `${baseUrl}/api/ical/${token}`;
            return (
              <div key={unit.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ minWidth: 140, fontWeight: 500, fontSize: "0.85rem" }}>{unit.name || `${unit.tower}-${unit.code}`}</span>
                <input type="text" readOnly value={exportUrl} style={{ flex: 1, fontSize: "0.75rem", color: "var(--text-2)" }} onFocus={(e) => e.target.select()} />
                <button className="btn-outline btn-sm" type="button" onClick={() => { navigator.clipboard.writeText(exportUrl); }}>Copy</button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
