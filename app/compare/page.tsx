"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mark } from "../mark.tsx";
import { Footer } from "../footer.tsx";
import { UNITS, TAAL_VIEW_CODES } from "../../src/data/units.ts";
import { formatPHP } from "../../src/lib/pricing.ts";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
};

export default function ComparePage() {
  return (
    <Suspense>
      <ComparePageInner />
    </Suspense>
  );
}

function ComparePageInner() {
  const sp = useSearchParams();
  const active = UNITS.filter((u) => u.active);
  const [unitA, setUnitA] = useState(sp.get("a") || active[0]?.id || "");
  const [unitB, setUnitB] = useState(sp.get("b") || active[1]?.id || "");

  const a = active.find((u) => u.id === unitA);
  const b = active.find((u) => u.id === unitB);

  function label(u: (typeof active)[number]) {
    return `${u.tower}-${u.code} ${u.buildingId === "west" ? "West" : "East"}${u.name ? ` (${u.name})` : ""}`;
  }

  const rows: { label: string; a: string; b: string; highlight?: boolean }[] =
    a && b
      ? [
          { label: "Type", a: TYPE_LABEL[a.type] ?? a.type, b: TYPE_LABEL[b.type] ?? b.type },
          { label: "Building", a: a.buildingId === "west" ? "Serin West" : "Serin East", b: b.buildingId === "west" ? "Serin West" : "Serin East" },
          { label: "Tower", a: `Tower ${a.tower}`, b: `Tower ${b.tower}` },
          { label: "Floor Area", a: a.sqm ? `${a.sqm} sqm` : "—", b: b.sqm ? `${b.sqm} sqm` : "—" },
          { label: "View", a: TAAL_VIEW_CODES.has(a.code) ? "Taal View" : "Ridge Side", b: TAAL_VIEW_CODES.has(b.code) ? "Taal View" : "Ridge Side" },
          { label: "Max Guests", a: `${a.maxGuests}`, b: `${b.maxGuests}` },
          { label: "Base Capacity", a: `${a.capacity} guests`, b: `${b.capacity} guests` },
          { label: "Weekday Rate", a: formatPHP(a.baseRate), b: formatPHP(b.baseRate), highlight: true },
          { label: "Weekend Rate", a: formatPHP(a.weekendRate), b: formatPHP(b.weekendRate), highlight: true },
          { label: "Min Stay", a: `${a.minStay} night${a.minStay > 1 ? "s" : ""}`, b: `${b.minStay} night${b.minStay > 1 ? "s" : ""}` },
        ]
      : [];

  const allInclusionsSet = new Set<string>();
  if (a?.inclusions) a.inclusions.forEach((i) => allInclusionsSet.add(i));
  if (b?.inclusions) b.inclusions.forEach((i) => allInclusionsSet.add(i));
  const allInclusions = [...allInclusionsSet];

  return (
    <>
      <header className="pub-head">
        <div className="wrap">
          <div className="lockup">
            <Mark />
            <p className="brand">
              Serin
              <small>Tagaytay</small>
            </p>
          </div>
          <nav>
            <Link href="/">Stay</Link>
            <Link href="/book">Book</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
      </header>

      <div className="wrap">
        <Link href="/" className="back-link" style={{ marginTop: "1rem" }}>
          &larr; Back to all units
        </Link>

        <h1
          style={{
            fontFamily: "var(--display)",
            fontWeight: 400,
            fontSize: "1.5rem",
            margin: "0.5rem 0 1.5rem",
          }}
        >
          Compare Units
        </h1>

        <div className="cmp-selectors">
          <div className="field">
            <label>Unit A</label>
            <select value={unitA} onChange={(e) => setUnitA(e.target.value)}>
              {active.map((u) => (
                <option key={u.id} value={u.id}>
                  {label(u)}
                </option>
              ))}
            </select>
          </div>

          <span className="cmp-vs">VS</span>

          <div className="field">
            <label>Unit B</label>
            <select value={unitB} onChange={(e) => setUnitB(e.target.value)}>
              {active.map((u) => (
                <option key={u.id} value={u.id}>
                  {label(u)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {a && b && unitA === unitB && (
          <p className="notice">Select two different units to compare.</p>
        )}

        {a && b && unitA !== unitB && (
          <>
            <div className="cmp-table-wrap">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>
                      <span className="cmp-unit-head">
                        {a.tower}-{a.code}
                        {a.name && <small>{a.name}</small>}
                      </span>
                    </th>
                    <th>
                      <span className="cmp-unit-head">
                        {b.tower}-{b.code}
                        {b.name && <small>{b.name}</small>}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className={r.highlight ? "cmp-hl" : ""}>
                      <td className="cmp-label">{r.label}</td>
                      <td className={r.highlight ? "mono" : ""}>{r.a}</td>
                      <td className={r.highlight ? "mono" : ""}>{r.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {allInclusions.length > 0 && (
              <div className="cmp-table-wrap" style={{ marginTop: "1.5rem" }}>
                <h2
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "0.17em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--text-2)",
                    margin: "0 0 0.75rem",
                  }}
                >
                  Inclusions
                </h2>
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>{a.tower}-{a.code}</th>
                      <th>{b.tower}-{b.code}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInclusions.map((item) => {
                      const hasA = a.inclusions?.includes(item);
                      const hasB = b.inclusions?.includes(item);
                      return (
                        <tr key={item}>
                          <td className="cmp-label">{item}</td>
                          <td>
                            <span style={{ color: hasA ? "var(--good)" : "var(--text-3)" }}>
                              {hasA ? "✓" : "—"}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: hasB ? "var(--good)" : "var(--text-3)" }}>
                              {hasB ? "✓" : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div
              className="cmp-actions"
              style={{ display: "flex", gap: "0.75rem", padding: "1.5rem 0 3rem" }}
            >
              <Link href={`/units/${a.id}`} className="btn-outline">
                View {a.tower}-{a.code}
              </Link>
              <Link href={`/units/${b.id}`} className="btn-outline">
                View {b.tower}-{b.code}
              </Link>
              <Link href="/book" className="btn">
                Book now
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
