import Link from "next/link";
import { notFound } from "next/navigation";
import { Mark, RidgePlate } from "../../mark.tsx";
import { UNITS, TAAL_VIEW_CODES } from "../../../src/data/units.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
};

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const unit = UNITS.find((u) => u.id === id && u.active);
  if (!unit) notFound();

  const taal = TAAL_VIEW_CODES.has(unit.code);
  const building = unit.buildingId === "west" ? "Serin West" : "Serin East";
  const similar = UNITS.filter(
    (u) => u.active && u.type === unit.type && u.id !== unit.id,
  ).slice(0, 3);

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

        <div className="ud-hero">
          <div className="ud-plate">
            <RidgePlate taalView={taal} />
            <span className="nm">
              {unit.name ?? `${unit.tower}-${unit.code}`}
            </span>
          </div>
          <div className="ud-info">
            <p className="ud-building">{building}</p>
            <h1 className="ud-title">
              {unit.name ?? `Unit ${unit.tower}-${unit.code}`}
            </h1>
            <p className="ud-code">
              Tower {unit.tower} &middot; Unit {unit.code}
            </p>
            <div className="ud-tags">
              <span className="ud-tag">{TYPE_LABEL[unit.type]}</span>
              {unit.sqm && <span className="ud-tag">{unit.sqm} sqm</span>}
              <span className="ud-tag">Sleeps {unit.maxGuests}</span>
              <span className="ud-tag">{taal ? "Taal View" : "Ridge Side"}</span>
            </div>
          </div>
        </div>

        {unit.description && (
          <div className="ud-section">
            <h2>About this unit</h2>
            <p>{unit.description}</p>
          </div>
        )}

        <div className="ud-grid">
          <div className="ud-section">
            <h2>Rates</h2>
            <div className="ud-rates">
              <div className="ud-rate-card">
                <span className="ud-rate-label">Weekday</span>
                <span className="ud-rate-val">{formatPHP(unit.baseRate)}</span>
                <span className="ud-rate-sub">per night</span>
              </div>
              <div className="ud-rate-card">
                <span className="ud-rate-label">Weekend</span>
                <span className="ud-rate-val">{formatPHP(unit.weekendRate)}</span>
                <span className="ud-rate-sub">Fri & Sat</span>
              </div>
              {unit.monthlyRate && (
                <div className="ud-rate-card">
                  <span className="ud-rate-label">Monthly</span>
                  <span className="ud-rate-val">{formatPHP(unit.monthlyRate)}</span>
                  <span className="ud-rate-sub">long stay</span>
                </div>
              )}
            </div>
            <p className="ud-note">
              Base rate includes {unit.capacity} guests. Extra guest fee applies
              for additional guests up to max of {unit.maxGuests}.
            </p>
          </div>

          <div className="ud-section">
            <h2>What&rsquo;s included</h2>
            {unit.inclusions && unit.inclusions.length > 0 ? (
              <ul className="ud-inclusions">
                {unit.inclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--text-3)" }}>
                Inclusions to be added.
              </p>
            )}
          </div>
        </div>

        <div className="ud-cta">
          <Link href={`/book`} className="btn">
            Book this unit
          </Link>
          {similar.length > 0 && (
            <Link
              href={`/compare?a=${unit.id}&b=${similar[0].id}`}
              className="btn-outline"
            >
              Compare units
            </Link>
          )}
        </div>

        {similar.length > 0 && (
          <div className="ud-section">
            <h2>Similar units</h2>
            <div className="ud-similar">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/units/${s.id}`}
                  className="ud-similar-card"
                >
                  <span className="ud-similar-code">
                    {s.tower}-{s.code}{" "}
                    {s.buildingId === "west" ? "West" : "East"}
                  </span>
                  {s.name && (
                    <span className="ud-similar-name">{s.name}</span>
                  )}
                  <span className="ud-similar-rate">
                    from {formatPHP(s.baseRate)}/night
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ paddingBottom: "3rem" }} />
      </div>
    </>
  );
}
