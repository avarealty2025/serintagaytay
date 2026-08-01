import { join } from "node:path";
import Link from "next/link";
import { UNITS } from "../../../src/data/units.ts";
import { loadSheet } from "../../../src/data/sheet.ts";
import { nightsBetween, toDateStr } from "../../../src/lib/dates.ts";
import { formatPHP, quote } from "../../../src/lib/pricing.ts";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  agoda: "Agoda",
  facebook: "Facebook",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { bookings } = loadSheet(join(process.cwd(), "data"));

  const filterSource = sp.source || "";
  const filterUnit = sp.unit || "";
  const search = (sp.q || "").toLowerCase();

  let filtered = bookings;
  if (filterSource) {
    filtered = filtered.filter((b) => b.source === filterSource);
  }
  if (filterUnit) {
    filtered = filtered.filter((b) => b.unitId === filterUnit);
  }
  if (search) {
    filtered = filtered.filter(
      (b) =>
        b.guest.toLowerCase().includes(search) ||
        b.unitId.toLowerCase().includes(search),
    );
  }

  const sorted = [...filtered].sort((a, b) =>
    b.checkIn.localeCompare(a.checkIn),
  );

  const unitMap = new Map(UNITS.map((u) => [u.id, u]));

  const sources = [...new Set(bookings.map((b) => b.source).filter(Boolean))];
  const unitIds = [...new Set(bookings.map((b) => b.unitId))].sort();

  return (
    <>
      <div className="page-head">
        <h1 className="today">Bookings</h1>
        <Link href="/admin/bookings/new" className="btn">
          + New Booking
        </Link>
      </div>

      <div className="panel">
        <form className="filter-bar" method="get">
          <div className="field">
            <label htmlFor="q">Search</label>
            <input
              type="text"
              id="q"
              name="q"
              placeholder="Guest name..."
              defaultValue={search}
            />
          </div>
          <div className="field">
            <label htmlFor="source">Source</label>
            <select id="source" name="source" defaultValue={filterSource}>
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s!}>
                  {SOURCE_LABEL[s!] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="unit">Unit</label>
            <select id="unit" name="unit" defaultValue={filterUnit}>
              <option value="">All units</option>
              {unitIds.map((id) => {
                const u = unitMap.get(id);
                return (
                  <option key={id} value={id}>
                    {u ? `${u.tower}-${u.code}` : id}
                  </option>
                );
              })}
            </select>
          </div>
          <button className="btn" type="submit">
            Filter
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>
          {sorted.length} bookings{" "}
          <span className="hint">sorted by check-in, newest first</span>
        </h2>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Guest</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Nights</th>
                <th>Pax</th>
                <th>Source</th>
                <th className="tar">Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => {
                const unit = unitMap.get(b.unitId);
                let nights = 0;
                try {
                  nights = nightsBetween(b.checkIn, b.checkOut);
                } catch {
                  /* skip */
                }
                let amount = "";
                if (unit && nights > 0 && nights < 28) {
                  try {
                    const p = quote(unit, b.checkIn, b.checkOut, b.guests || 2);
                    amount = formatPHP(p.total);
                  } catch {
                    /* skip */
                  }
                }
                return (
                  <tr key={b.id}>
                    <td className="mono">
                      {unit
                        ? `${unit.tower}-${unit.code}${unit.buildingId === "east" ? " E" : ""}`
                        : b.unitId}
                    </td>
                    <td>{b.guest || "—"}</td>
                    <td className="mono">{b.checkIn}</td>
                    <td className="mono">{b.checkOut}</td>
                    <td className="tar mono">{nights}</td>
                    <td className="tar">{b.guests || "—"}</td>
                    <td>
                      <span className={`src-pill ${b.source ?? "unknown"}`}>
                        {SOURCE_LABEL[b.source ?? ""] ?? b.source ?? "—"}
                      </span>
                    </td>
                    <td className="tar mono">{amount || "—"}</td>
                    <td className="balance-note">{b.balanceNote || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
