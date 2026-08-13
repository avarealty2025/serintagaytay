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

interface SyncResult {
  unitId: string;
  platform: string;
  imported: number;
  skipped: number;
  errors: string[];
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

export default function ChannelsPage() {
  const [configs, setConfigs] = useState<UnitChannels[]>([]);
  const [syncLog, setSyncLog] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

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
            ? {
                ...c,
                calendars: c.calendars.map((cal) =>
                  cal.platform === platform ? { ...cal, ...patch } : cal,
                ),
              }
            : c,
        );
      }
      return [
        ...prev,
        {
          unitId,
          calendars: emptyCalendars().map((cal) =>
            cal.platform === platform ? { ...cal, ...patch } : cal,
          ),
        },
      ];
    });
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });
      if (!res.ok) throw new Error();
      setStatus("Saved");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSync(unitId?: string) {
    setSyncing(unitId ?? "all");
    setSyncResults(null);
    setMigrationNeeded(false);
    try {
      const res = await fetch("/api/channels/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitId ? { unitId } : {}),
      });
      const data = await res.json();
      const results: SyncResult[] = data.results ?? [];
      setSyncResults(results);

      const hasExternalIdError = results.some((r) =>
        r.errors.some((e) => e.includes("external_id")),
      );
      if (hasExternalIdError) setMigrationNeeded(true);

      // Refresh sync log
      const logRes = await fetch("/api/channels");
      const logData = await logRes.json();
      setSyncLog(logData.syncLog ?? {});
    } catch {
      setStatus("Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  const totalConfigured = configs.reduce(
    (sum, c) => sum + c.calendars.filter((cal) => cal.enabled && cal.icalUrl).length,
    0,
  );

  if (loading) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        Loading channel settings...
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">OTA Channels</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-2)" }}>
            Connect Airbnb, Booking.com, and Agoda calendars to auto-import bookings.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {status && (
            <span
              style={{
                fontSize: "0.85rem",
                color: status === "Saved" ? "var(--good)" : "var(--crit)",
              }}
            >
              {status}
            </span>
          )}
          <button
            className="btn-outline"
            onClick={() => handleSync()}
            disabled={syncing !== null || totalConfigured === 0}
            type="button"
          >
            {syncing === "all" ? "Syncing..." : "Sync All"}
          </button>
          <button
            className="btn"
            onClick={handleSave}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {migrationNeeded && (
        <div
          className="notice"
          style={{
            borderLeftColor: "var(--warn)",
            background: "color-mix(in srgb, var(--warn) 12%, transparent)",
            marginBottom: "1rem",
          }}
        >
          <strong>Database migration needed.</strong> Run this SQL in your{" "}
          <a
            href="https://supabase.com/dashboard/project/ooydinobvwjcagptgolw/sql"
            target="_blank"
            rel="noreferrer"
          >
            Supabase SQL Editor
          </a>
          :
          <pre
            style={{
              background: "var(--surface-2)",
              padding: "0.75rem",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.8rem",
              marginTop: "0.5rem",
              overflow: "auto",
            }}
          >
{`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_external_id
  ON bookings(external_id) WHERE external_id IS NOT NULL;`}
          </pre>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
            After running, click Sync All again.
          </p>
        </div>
      )}

      {syncResults && syncResults.length > 0 && (
        <div
          className="notice"
          style={{
            borderLeftColor: "var(--good)",
            background: "color-mix(in srgb, var(--good) 12%, transparent)",
            marginBottom: "1rem",
          }}
        >
          <strong>Sync complete:</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
            {syncResults.map((r, i) => (
              <li key={i}>
                <strong>{r.platform}</strong> ({activeUnits.find((u) => u.id === r.unitId)?.name || r.unitId})
                : {r.imported} imported, {r.skipped} skipped
                {r.errors.length > 0 && (
                  <span style={{ color: "var(--crit)" }}>
                    {" "}
                    — {r.errors.join("; ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {PLATFORMS.map((p) => {
          const count = configs.reduce(
            (n, c) => n + (c.calendars.find((cal) => cal.platform === p.id && cal.enabled && cal.icalUrl) ? 1 : 0),
            0,
          );
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "var(--surface)",
                border: "1px solid var(--line-soft)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: p.color,
                  display: "inline-block",
                }}
              />
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{p.label}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
                {count} unit{count !== 1 ? "s" : ""}
              </span>
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
              <div
                key={unit.id}
                style={{
                  padding: "1rem",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1rem",
                  borderLeft: hasAny ? "3px solid var(--good)" : "3px solid var(--line-soft)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <strong>
                      {unit.name || `${unit.tower}-${unit.code}`}
                    </strong>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-3)", marginLeft: "0.5rem" }}>
                      {unit.tower}-{unit.code}
                    </span>
                  </div>
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => handleSync(unit.id)}
                    disabled={syncing !== null || !hasAny}
                    type="button"
                  >
                    {syncing === unit.id ? "Syncing..." : "Sync"}
                  </button>
                </div>

                {PLATFORMS.map((p) => {
                  const cal = config.calendars.find((c) => c.platform === p.id) ?? {
                    platform: p.id,
                    icalUrl: "",
                    enabled: false,
                  };
                  const lastSync = syncLog[`${unit.id}:${p.id}`];
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          minWidth: 120,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={cal.enabled}
                          onChange={(e) =>
                            updateCalendar(unit.id, p.id, { enabled: e.target.checked })
                          }
                        />
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: p.color,
                            display: "inline-block",
                          }}
                        />
                        {p.label}
                      </label>
                      <input
                        type="url"
                        placeholder={`Paste ${p.label} iCal URL...`}
                        value={cal.icalUrl}
                        onChange={(e) =>
                          updateCalendar(unit.id, p.id, { icalUrl: e.target.value })
                        }
                        style={{ flex: 1, fontSize: "0.8rem" }}
                      />
                      {lastSync && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-3)",
                            whiteSpace: "nowrap",
                          }}
                        >
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
          <p style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 1rem" }}>
            Import these iCal URLs into Airbnb / Booking.com / Agoda so they see your direct bookings
            and block those dates automatically (two-way sync).
          </p>
          {activeUnits.map((unit) => {
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
            const token = unit.id.replace(/[^a-z0-9]/g, "");
            const exportUrl = `${baseUrl}/api/ical/${token}`;
            return (
              <div
                key={unit.id}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ minWidth: 140, fontWeight: 500, fontSize: "0.85rem" }}>
                  {unit.name || `${unit.tower}-${unit.code}`}
                </span>
                <input
                  type="text"
                  readOnly
                  value={exportUrl}
                  style={{ flex: 1, fontSize: "0.75rem", color: "var(--text-2)" }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="btn-outline btn-sm"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(exportUrl);
                  }}
                >
                  Copy
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-panel" style={{ marginTop: "1.5rem" }}>
        <h2>How It Works</h2>
        <div className="form-body" style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>
          <ol style={{ paddingLeft: "1.25rem", margin: 0 }}>
            <li>Paste the iCal export URL from Airbnb / Booking.com / Agoda for each unit</li>
            <li>Enable the checkbox and click <strong>Save Settings</strong></li>
            <li>Click <strong>Sync All</strong> or sync individual units</li>
            <li>Bookings are imported with guest name, dates, contact info, and rate</li>
            <li>Duplicate bookings are automatically skipped</li>
            <li>Imported bookings appear in your Bookings page with the platform source tag</li>
            <li>Copy the export URLs above and paste into Airbnb / Booking.com / Agoda to complete two-way sync</li>
          </ol>
        </div>
      </div>
    </>
  );
}
