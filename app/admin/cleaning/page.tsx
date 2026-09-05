"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UNITS } from "../../../src/data/units.ts";
import { PermGuard } from "../_perm-guard.tsx";

interface CleaningLog {
  id: string;
  unit_id: string;
  items: { category: string; items: { item: string; checked: boolean }[] }[];
  cleaned_by: string;
  notes: string | null;
  signed_at: string;
}

const activeUnits = UNITS.filter((u) => u.active);

export default function CleaningPage() {
  const [logs, setLogs] = useState<Record<string, CleaningLog | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      activeUnits.map((u) =>
        fetch(`/api/cleaning-logs?unitId=${u.id}`)
          .then((r) => r.json())
          .then((d) => ({ unitId: u.id, log: d.logs?.[0] ?? null }))
          .catch(() => ({ unitId: u.id, log: null }))
      )
    ).then((results) => {
      const map: Record<string, CleaningLog | null> = {};
      for (const r of results) map[r.unitId] = r.log;
      setLogs(map);
      setLoading(false);
    });
  }, []);

  function getStatus(log: CleaningLog | null | undefined) {
    if (!log) return { label: "Never cleaned", color: "var(--text-3)", bg: "var(--surface-2)" };
    const hoursSince = (Date.now() - new Date(log.signed_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return { label: "Clean", color: "#fff", bg: "var(--good, #27ae60)" };
    if (hoursSince < 72) return { label: "Due soon", color: "#fff", bg: "var(--warn, #f39c12)" };
    return { label: "Overdue", color: "#fff", bg: "var(--crit, #c0392b)" };
  }

  return (
    <PermGuard perm="cleaning.view">
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Cleaning Checklist</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-2)" }}>
            Per-unit cleaning checklists. Staff checks items and signs off after cleaning.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {activeUnits.map((unit) => {
            const log = logs[unit.id];
            const status = getStatus(log);
            const totalItems = log?.items?.reduce((s, c) => s + c.items.length, 0) ?? 0;
            const checkedItems = log?.items?.reduce((s, c) => s + c.items.filter((i) => i.checked).length, 0) ?? 0;

            return (
              <div
                key={unit.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "var(--radius-sm, 10px)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem" }}>
                      {unit.name || `${unit.tower}-${unit.code}`}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-3)" }}>
                      {unit.tower}-{unit.code} &middot; {unit.buildingId === "west" ? "Serin West" : "Serin East"}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: status.color,
                      background: status.bg,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "9px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                {log ? (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
                    <p style={{ margin: 0 }}>
                      <strong>Last cleaned by:</strong> {log.cleaned_by}
                    </p>
                    <p style={{ margin: "0.15rem 0 0" }}>
                      <strong>Date:</strong> {new Date(log.signed_at).toLocaleDateString()} {new Date(log.signed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p style={{ margin: "0.15rem 0 0" }}>
                      <strong>Checked:</strong> {checkedItems} / {totalItems} items
                    </p>
                    {log.notes && (
                      <p style={{ margin: "0.15rem 0 0", fontStyle: "italic", color: "var(--text-3)" }}>
                        {log.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: 0 }}>
                    No cleaning records yet
                  </p>
                )}

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                  <Link
                    href={`/admin/cleaning/${unit.id}`}
                    className="btn"
                    style={{ flex: 1, textAlign: "center", fontSize: "0.82rem" }}
                  >
                    Start Cleaning
                  </Link>
                  <Link
                    href={`/admin/cleaning/${unit.id}?tab=template`}
                    className="btn-outline"
                    style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}
                  >
                    Edit Checklist
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
    </PermGuard>
  );
}
