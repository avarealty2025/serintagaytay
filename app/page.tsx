import Link from "next/link";
import { Mark, RidgePlate } from "./mark.tsx";
import { Footer } from "./footer.tsx";
import { Testimonials } from "./testimonials.tsx";
import { UNITS, TAAL_VIEW_CODES } from "../src/data/units.ts";
import { getUnitCoverThumb } from "../src/data/unit-photos.ts";
import { getBookings } from "../src/data/db.ts";
import { isAvailable } from "../src/lib/availability.ts";
import { PricingError, formatPHP, quote } from "../src/lib/pricing.ts";
import { addDays, nightsBetween, toDateStr } from "../src/lib/dates.ts";
import type { PriceBreakdown } from "../src/lib/types.ts";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive studio",
  "1br": "1 bedroom",
  "2br": "2 bedrooms",
};

interface Result {
  unit: (typeof UNITS)[number];
  price: PriceBreakdown | null;
  reason: string | null;
  free: boolean;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const today = toDateStr(new Date());
  const checkIn = sp.checkIn || addDays(today, 1);
  const checkOut = sp.checkOut || addDays(today, 3);
  const guests = Number(sp.guests) || 2;

  const { bookings } = await getBookings();

  let nights = 0;
  let rangeError: string | null = null;
  try {
    nights = nightsBetween(checkIn, checkOut);
    if (nights <= 0) rangeError = "Check-out must be after check-in.";
  } catch (e) {
    rangeError = e instanceof Error ? e.message : "Invalid dates.";
  }

  const results: Result[] = rangeError
    ? []
    : UNITS.filter((u) => u.active).map((unit) => {
        const free = isAvailable(unit.id, checkIn, checkOut, bookings);
        let price: PriceBreakdown | null = null;
        let reason: string | null = null;
        try {
          price = quote(unit, checkIn, checkOut, guests);
        } catch (e) {
          reason =
            e instanceof PricingError ? e.message : "Not available for these dates.";
        }
        return { unit, price, reason, free };
      });

  const bookable = results.filter((r) => r.free && r.price && !r.price.requiresManualQuote);
  const rest = results.filter((r) => !bookable.includes(r));

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
            <Link href="/compare">Compare</Link>
            <Link href="/book">Book</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
      </header>

      <div className="wrap">
        <div className="hero">
          <h1>Cool air, and the whole caldera below you.</h1>
          <p>
            Seventeen condominium units on the Tagaytay ridge, at Serin West and
            Serin East. Pick your dates and see the real price, itemised, before
            you pay anything.
          </p>
        </div>

        <p className="notice">
          <strong>Direct booking.</strong> Rates shown include nightly charges.
          Cleaning and extra-guest fees will be added at checkout if applicable.
          Select your dates to see real-time availability and pricing.
        </p>

        <form className="searchbar" method="get">
          <div className="field">
            <label htmlFor="checkIn">Check in</label>
            <input type="date" id="checkIn" name="checkIn" defaultValue={checkIn} />
          </div>
          <div className="field">
            <label htmlFor="checkOut">Check out</label>
            <input type="date" id="checkOut" name="checkOut" defaultValue={checkOut} />
          </div>
          <div className="field">
            <label htmlFor="guests">Guests</label>
            <select id="guests" name="guests" defaultValue={String(guests)}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit">
            Search
          </button>
        </form>

        {rangeError ? (
          <div className="empty">{rangeError}</div>
        ) : (
          <>
            <p style={{ color: "var(--text-2)", marginTop: 0 }}>
              <strong>{bookable.length}</strong> of {results.length} units free for{" "}
              {nights} {nights === 1 ? "night" : "nights"}, {guests}{" "}
              {guests === 1 ? "guest" : "guests"}.
            </p>

            <div className="cards">
              {[...bookable, ...rest].map(({ unit, price, reason, free }) => {
                const taal = TAAL_VIEW_CODES.has(unit.code);
                const label = unit.name ?? `${unit.code} ${unit.buildingId}`;
                const cover = getUnitCoverThumb(unit.id);
                return (
                  <article className="card" key={unit.id}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={label} className="card-cover" loading="lazy" />
                    ) : (
                      <div className="plate">
                        <RidgePlate taalView={taal} />
                        <span className="nm">{label}</span>
                      </div>
                    )}
                    <div className="body">
                      <span className="code">
                        {unit.tower}-{unit.code}{" "}
                        {unit.buildingId === "west" ? "West" : "East"}
                        {unit.sqm ? ` · ${unit.sqm} sqm` : ""}
                      </span>
                      <ul className="facts">
                        <li>{TYPE_LABEL[unit.type]}</li>
                        <li>Sleeps {unit.maxGuests}</li>
                        <li>{taal ? "Taal view" : "Ridge side"}</li>
                      </ul>

                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        {free ? (
                          <Link
                            href={`/book?unit=${unit.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}
                            className="pill free"
                            style={{ textDecoration: "none" }}
                          >
                            Book now
                          </Link>
                        ) : (
                          <span className="pill gone">Booked</span>
                        )}
                        <Link
                          href={`/units/${unit.id}`}
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--accent)",
                            fontWeight: 600,
                          }}
                        >
                          View details
                        </Link>
                      </div>

                      <div className="rate">
                        {price && !price.requiresManualQuote ? (
                          <>
                            <span className="amt">{formatPHP(price.total)}</span>{" "}
                            <span className="per">
                              total &middot; {nights}{" "}
                              {nights === 1 ? "night" : "nights"}
                            </span>
                            <ul className="lines">
                              {price.nights.map((n) => (
                                <li key={n.date}>
                                  <span>
                                    {n.date}{" "}
                                    {n.basis === "weekend" ? "(weekend)" : ""}
                                    {n.basis === "override"
                                      ? `(${n.overrideLabel ?? "special"})`
                                      : ""}
                                  </span>
                                  <span>{formatPHP(n.rate)}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : price?.requiresManualQuote ? (
                          <span className="per">
                            Long stay &mdash; monthly rate on request
                          </span>
                        ) : (
                          <span className="per">{reason}</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="wrap">
        <Testimonials />
      </div>

      <Footer />
    </>
  );
}
