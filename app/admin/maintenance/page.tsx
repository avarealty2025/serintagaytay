"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UNITS } from "../../../src/data/units.ts";
import { PermGuard } from "../_perm-guard.tsx";

interface UnitTaskCounts {
  pending: number;
  in_progress: number;
}

export default function MaintenancePage() {
  const [counts, setCounts] = useState<Record<string, UnitTaskCounts>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/unit-tasks?summary=1")
      .then((r) => r.json())
      .then((d) => setCounts(d.counts ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeUnits = UNITS.filter((u) => u.active !== false);
  const totalPending = Object.values(counts).reduce((s, c) => s + c.pending, 0);
  const totalInProgress = Object.values(counts).reduce((s, c) => s + c.in_progress, 0);

  return (
    <PermGuard perm="tasks.view">
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Maintenance Tasks</h1>
          <p style={{ color: "var(--text-2)", fontSize: "0.85rem", margin: 0 }}>
            Deep clean, repair, replacement &amp; disposal tracking per unit.
          </p>
        </div>
      </div>

      {!loading && (totalPending > 0 || totalInProgress > 0) && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div className="form-panel" style={{ flex: "1 1 120px", marginBottom: 0, textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--warn, #f39c12)" }}>{totalPending}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pending</div>
          </div>
          <div className="form-panel" style={{ flex: "1 1 120px", marginBottom: 0, textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent, #2980b9)" }}>{totalInProgress}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>In Progress</div>
          </div>
          <div className="form-panel" style={{ flex: "1 1 120px", marginBottom: 0, textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text)" }}>{activeUnits.length}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Units</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {activeUnits.map((unit) => {
            const c = counts[unit.id];
            const hasTasks = c && (c.pending > 0 || c.in_progress > 0);
            return (
              <Link
                key={unit.id}
                href={`/admin/maintenance/${unit.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="form-panel"
                  style={{
                    marginBottom: 0,
                    borderLeft: hasTasks ? "3px solid var(--warn, #f39c12)" : "3px solid var(--line-soft)",
                    cursor: "pointer",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "1rem" }}>{unit.name || `${unit.tower}-${unit.code}`}</h2>
                      <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "var(--text-3)" }}>
                        {unit.tower}-{unit.code} &middot; {unit.buildingId === "west" ? "West" : "East"}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", color: "#fff",
                      background: unit.type === "studio" ? "#3498db" : unit.type === "exec_studio" ? "#8e44ad" : unit.type === "1br" ? "#27ae60" : "#e67e22",
                      padding: "0.12rem 0.35rem", borderRadius: 4,
                    }}>
                      {unit.type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="form-body" style={{ paddingTop: "0.5rem" }}>
                    {hasTasks ? (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {c!.pending > 0 && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--warn, #f39c12)" }}>
                            {c!.pending} pending
                          </span>
                        )}
                        {c!.in_progress > 0 && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)" }}>
                            {c!.in_progress} in progress
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>No active tasks</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
    </PermGuard>
  );
}
