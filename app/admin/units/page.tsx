import Link from "next/link";
import { UNITS, TAAL_VIEW_CODES } from "../../../src/data/units.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";
import { PermGuard } from "../_perm-guard.tsx";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Exec Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
};

export default function UnitsPage() {
  const active = UNITS.filter((u) => u.active);
  const inactive = UNITS.filter((u) => !u.active);

  return (
    <PermGuard perm="units.view">
    <>
      <div className="page-head">
        <h1 className="today">Units</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span className="hint" style={{ fontSize: "0.82rem" }}>
            {active.length} active, {inactive.length} inactive
          </span>
          <Link href="/admin/units/bulk" className="btn btn-outline">
            Bulk Edit
          </Link>
          <Link href="/admin/units/new" className="btn">
            + Add Unit
          </Link>
        </div>
      </div>

      <div className="unit-grid">
        {active.map((u) => {
          const taal = TAAL_VIEW_CODES.has(u.code);
          const label = u.name ?? `${u.tower}-${u.code}`;
          return (
            <Link
              href={`/admin/units/${u.id}`}
              key={u.id}
              className="unit-card"
            >
              <div className="uc-header">
                <span className="uc-code">
                  {u.tower}-{u.code}
                </span>
                <span className="uc-building">
                  {u.buildingId === "west" ? "West" : "East"}
                </span>
              </div>
              {u.name && <p className="uc-name">{u.name}</p>}
              <div className="uc-facts">
                <span>{TYPE_LABEL[u.type]}</span>
                <span>Sleeps {u.maxGuests}</span>
                {taal && <span className="uc-view">Taal View</span>}
              </div>
              <div className="uc-rates">
                <div>
                  <span className="uc-rate-label">Weekday</span>
                  <span className="uc-rate-val">{formatPHP(u.baseRate)}</span>
                </div>
                <div>
                  <span className="uc-rate-label">Weekend</span>
                  <span className="uc-rate-val">{formatPHP(u.weekendRate)}</span>
                </div>
              </div>
              <div className="uc-fees">
                {u.cleaningFee > 0 ? (
                  <span>Cleaning: {formatPHP(u.cleaningFee)}</span>
                ) : (
                  <span className="uc-warn">Cleaning fee not set</span>
                )}
                {u.extraGuestFee > 0 ? (
                  <span>Extra guest: {formatPHP(u.extraGuestFee)}</span>
                ) : (
                  <span className="uc-warn">Extra guest fee not set</span>
                )}
              </div>
              <div className="uc-footer">
                <span className="status-pill ok">Active</span>
                <span className="uc-edit">Edit &rarr;</span>
              </div>
            </Link>
          );
        })}
      </div>

      {inactive.length > 0 && (
        <div className="panel" style={{ marginTop: "2rem" }}>
          <h2>Inactive Units <span className="hint">{inactive.length}</span></h2>
          {inactive.map((u) => (
            <div className="row" key={u.id}>
              <span className="stripe" />
              <span>
                <p className="who">
                  {u.tower}-{u.code} {u.buildingId === "west" ? "West" : "East"}
                </p>
                <p className="sub">{TYPE_LABEL[u.type]} {u.name ? `(${u.name})` : ""}</p>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
    </PermGuard>
  );
}
