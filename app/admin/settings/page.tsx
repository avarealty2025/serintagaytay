import { UNITS } from "../../../src/data/units.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Exec Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
};

export default function SettingsPage() {
  const active = UNITS.filter((u) => u.active);
  const types = [...new Set(active.map((u) => u.type))];

  return (
    <>
      <div className="page-head">
        <h1 className="today">Settings</h1>
      </div>

      <div className="cols">
        <div className="panel">
          <h2>
            Pricing Rules <span className="hint">per unit type</span>
          </h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Type</th>
                  <th className="tar">Weekday</th>
                  <th className="tar">Weekend</th>
                  <th className="tar">Max Guests</th>
                  <th className="tar">Min Stay</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type) => {
                  const sample = active.find((u) => u.type === type)!;
                  return (
                    <tr key={type}>
                      <td>{TYPE_LABEL[type]}</td>
                      <td className="tar mono">{formatPHP(sample.baseRate)}</td>
                      <td className="tar mono">
                        {formatPHP(sample.weekendRate)}
                      </td>
                      <td className="tar mono">{sample.maxGuests}</td>
                      <td className="tar mono">
                        {sample.minStay} night{sample.minStay > 1 ? "s" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h2>
            Fees <span className="hint">applied to all bookings</span>
          </h2>
          <div className="form-body">
            <div className="summary-row">
              <span>Cleaning fee</span>
              <span className="mono" style={{ color: "var(--crit)" }}>
                {formatPHP(0)} (not set)
              </span>
            </div>
            <div className="summary-row">
              <span>Extra guest fee (per night)</span>
              <span className="mono" style={{ color: "var(--crit)" }}>
                {formatPHP(0)} (not set)
              </span>
            </div>
            <div className="summary-row">
              <span>Reservation fee</span>
              <span className="mono" style={{ color: "var(--crit)" }}>
                Not configured
              </span>
            </div>
          </div>
          <div className="warnbox" style={{ margin: "0" }}>
            <span>
              <strong>Action needed.</strong> These fees are seeded at zero. Every
              booking undercharges until the owner provides cleaning fee, extra
              guest fee, and reservation fee amounts. Update in the database once
              Supabase is connected.
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>
          Units <span className="hint">{active.length} active</span>
        </h2>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Code</th>
                <th>Building</th>
                <th>Type</th>
                <th>Name</th>
                <th className="tar">Capacity</th>
                <th className="tar">Weekday</th>
                <th className="tar">Weekend</th>
                <th className="tar">Cleaning</th>
                <th className="tar">Extra Guest</th>
              </tr>
            </thead>
            <tbody>
              {active.map((u) => (
                <tr key={u.id}>
                  <td className="mono">
                    {u.tower}-{u.code}
                  </td>
                  <td>{u.buildingId === "west" ? "Serin West" : "Serin East"}</td>
                  <td>{TYPE_LABEL[u.type]}</td>
                  <td>{u.name ?? "—"}</td>
                  <td className="tar mono">
                    {u.capacity}-{u.maxGuests}
                  </td>
                  <td className="tar mono">{formatPHP(u.baseRate)}</td>
                  <td className="tar mono">{formatPHP(u.weekendRate)}</td>
                  <td className="tar mono">
                    {u.cleaningFee > 0 ? formatPHP(u.cleaningFee) : "—"}
                  </td>
                  <td className="tar mono">
                    {u.extraGuestFee > 0 ? formatPHP(u.extraGuestFee) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h2>
            Payment Instructions{" "}
            <span className="hint">shown to guests</span>
          </h2>
          <div className="form-body">
            <p style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>
              Configure GCash name, number, bank details, and payment instructions
              in the <code>settings</code> table once Supabase is connected.
            </p>
          </div>
        </div>

        <div className="panel">
          <h2>
            Operations <span className="hint">check-in/out times</span>
          </h2>
          <div className="form-body">
            <div className="summary-row">
              <span>Check-in time</span>
              <span className="mono">2:00 PM</span>
            </div>
            <div className="summary-row">
              <span>Check-out time</span>
              <span className="mono">12:00 PM</span>
            </div>
            <div className="summary-row">
              <span>Hold duration</span>
              <span className="mono">24 hours</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>
          System Status <span className="hint">infrastructure</span>
        </h2>
        <div className="form-body">
          <div className="summary-row">
            <span>Database</span>
            <span className="status-pill warn">Not connected</span>
          </div>
          <div className="summary-row">
            <span>Data source</span>
            <span className="mono">CSV files (local)</span>
          </div>
          <div className="summary-row">
            <span>iCal sync</span>
            <span className="status-pill warn">Pending setup</span>
          </div>
          <div className="summary-row">
            <span>Vercel deployment</span>
            <span className="status-pill warn">Not deployed</span>
          </div>
        </div>
      </div>
    </>
  );
}
