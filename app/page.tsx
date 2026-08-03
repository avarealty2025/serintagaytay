import Link from "next/link";
import { Mark } from "./mark.tsx";
import { Footer } from "./footer.tsx";
import { Testimonials } from "./testimonials.tsx";
import { FAQ } from "./_components/faq.tsx";
import { UNITS, TAAL_VIEW_CODES } from "../src/data/units.ts";
import {
  getUnitCover,
  getUnitCoverThumb,
  getUnitPhotos,
  hasPhotos,
} from "../src/data/unit-photos.ts";
import { getBookings, getDbSettings } from "../src/data/db.ts";
import { isAvailable } from "../src/lib/availability.ts";
import { formatPHP, quote, PricingError } from "../src/lib/pricing.ts";
import { addDays, nightsBetween, toDateStr } from "../src/lib/dates.ts";
import type { SiteContent } from "./api/site-content/route.ts";
import { DEFAULT_SITE_CONTENT } from "./api/site-content/route.ts";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Executive Studio",
  "1br": "1 Bedroom Suite",
  "2br": "2 Bedroom Suite",
};

function drivePhoto(id: string, size = 1200): string {
  return `https://lh3.googleusercontent.com/d/${id}=s${size}`;
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
  const settings = await getDbSettings();
  const content: SiteContent = (settings?.site_content as SiteContent) ?? DEFAULT_SITE_CONTENT;

  let nights = 0;
  try {
    nights = nightsBetween(checkIn, checkOut);
    if (nights <= 0) nights = 2;
  } catch {
    nights = 2;
  }

  const featuredUnits = content.featuredUnitIds
    .map((id) => UNITS.find((u) => u.id === id))
    .filter((u): u is (typeof UNITS)[number] => !!u && u.active);

  const allUnits = UNITS.filter((u) => u.active);

  const heroPhotos = [
    "1VG31wyETnAhanJlnwjh17HJKssDEyN86",
    "1IRtoZbhiEJiamLMG1fVAhChKoIvpslhj",
    "1x5YXqMzeRkIo8vVEMW0SD4JWjzBeUavv",
    "1aZpmQdrz60FKq2vIJyLELvq0UpD5dDYi",
    "1qBXcfl8JGRgfSy2Iot4aeYbuWlqLCXjC",
    "1pziyW403F4p80SkeZ1HIIX7PWvxSUSsA",
  ];

  return (
    <>
      {/* ── Header ── */}
      <header className="pub-head">
        <div className="wrap">
          <Link href="/" style={{ textDecoration: "none" }}>
            <div className="lockup">
              <Mark />
              <p className="brand">
                Serin
                <small>Tagaytay</small>
              </p>
            </div>
          </Link>
          <nav>
            <Link href="#suites">Suites</Link>
            <Link href="#amenities">Amenities</Link>
            <Link href="#reviews">Reviews</Link>
            <Link href="/book">Book</Link>
          </nav>
        </div>
      </header>

      {/* ── 1. Hero ── */}
      <section className="lux-hero">
        <div className="lux-hero-bg">
          {heroPhotos.map((id, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={drivePhoto(id, 1600)}
              alt=""
              className="lux-hero-img"
              style={{ animationDelay: `${i * 6}s` }}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          <div className="lux-hero-overlay" />
        </div>
        <div className="lux-hero-content">
          <span className="lux-hero-eyebrow">{content.hero.tagline}</span>
          <h1 className="lux-hero-headline">{content.hero.headline}</h1>
          <p className="lux-hero-sub">{content.hero.subheadline}</p>
          <div className="lux-hero-actions">
            <Link href="/book" className="btn lux-btn-primary">
              {content.hero.primaryCta}
            </Link>
            <Link href="#suites" className="btn lux-btn-ghost">
              {content.hero.secondaryCta}
            </Link>
          </div>
        </div>
        <div className="lux-hero-scroll">
          <span>Scroll to explore</span>
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
            <rect x="1" y="1" width="18" height="26" rx="9" stroke="currentColor" strokeWidth="1.5" />
            <circle className="lux-scroll-dot" cx="10" cy="8" r="2.5" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="lux-trust">
        <div className="wrap">
          <div className="lux-trust-grid">
            {content.trustStrip.map((t, i) => (
              <div key={i} className="lux-trust-item">
                <span className="lux-trust-val">{t.value}</span>
                <span className="lux-trust-label">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Why Guests Love Serin ── */}
      <section className="lux-section">
        <div className="wrap">
          <div className="lux-section-head">
            <span className="lux-eyebrow">The Serin Experience</span>
            <h2>{content.whySection.heading}</h2>
          </div>
          <div className="lux-why-grid">
            {content.whySection.cards.map((card, i) => {
              const photoSrc = card.photoId
                ? drivePhoto(card.photoId, 800)
                : i === 0
                  ? drivePhoto("1IP7j77477Wi_BmTv0U7rOXlyFw98ppu9", 800)
                  : i === 1
                    ? drivePhoto("1hIciOpX9KuSAOJ19XmbkGrE8rXp_KiJS", 800)
                    : drivePhoto("1x5YXqMzeRkIo8vVEMW0SD4JWjzBeUavv", 800);
              return (
                <div key={i} className="lux-why-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoSrc} alt={card.title} className="lux-why-img" loading="lazy" />
                  <div className="lux-why-body">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Featured Suites ── */}
      <section className="lux-section lux-section-alt" id="suites">
        <div className="wrap">
          <div className="lux-section-head">
            <span className="lux-eyebrow">Our Suites</span>
            <h2>Handpicked for Your Stay</h2>
            <p className="lux-section-sub">
              Each suite is personally maintained with premium amenities, fresh
              linens, and everything you need for a perfect Tagaytay getaway.
            </p>
          </div>
          <div className="lux-suites-grid">
            {(featuredUnits.length > 0 ? featuredUnits : allUnits.slice(0, 6)).map(
              (unit) => {
                const cover = getUnitCover(unit.id);
                const taal = TAAL_VIEW_CODES.has(unit.code);
                const name = unit.name || `${unit.tower}-${unit.code}`;
                const free = isAvailable(unit.id, checkIn, checkOut, bookings);
                let priceStr = "";
                try {
                  const p = quote(unit, checkIn, checkOut, guests);
                  if (p && !p.requiresManualQuote) {
                    priceStr = formatPHP(p.total);
                  }
                } catch {}

                return (
                  <article key={unit.id} className="lux-suite-card">
                    <Link href={`/units/${unit.id}`} className="lux-suite-link">
                      <div className="lux-suite-img-wrap">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={name}
                            className="lux-suite-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="lux-suite-placeholder">
                            <Mark className="lux-suite-mark" />
                          </div>
                        )}
                        <div className="lux-suite-img-overlay" />
                        {free ? (
                          <span className="lux-suite-badge lux-badge-available">
                            Available
                          </span>
                        ) : (
                          <span className="lux-suite-badge lux-badge-booked">
                            Booked
                          </span>
                        )}
                      </div>
                      <div className="lux-suite-info">
                        <h3 className="lux-suite-name">{name}</h3>
                        <p className="lux-suite-type">
                          {TYPE_LABEL[unit.type]} &middot; Sleeps{" "}
                          {unit.maxGuests}{" "}
                          {taal ? " · Taal view" : ""}
                        </p>
                        <p className="lux-suite-code">
                          Tower {unit.tower}-{unit.code}{" "}
                          {unit.buildingId === "west" ? "Serin West" : "Serin East"}
                          {unit.sqm ? ` · ${unit.sqm} sqm` : ""}
                        </p>
                        <div className="lux-suite-footer">
                          {priceStr ? (
                            <span className="lux-suite-price">
                              {priceStr}{" "}
                              <span className="lux-suite-per">
                                / {nights} {nights === 1 ? "night" : "nights"}
                              </span>
                            </span>
                          ) : (
                            <span className="lux-suite-price">
                              From {formatPHP(unit.baseRate)}
                              <span className="lux-suite-per"> / night</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              },
            )}
          </div>
          <div className="lux-suites-cta">
            <Link href="/book" className="btn lux-btn-outline">
              View All Suites &amp; Check Availability
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Amenities ── */}
      <section className="lux-section" id="amenities">
        <div className="wrap">
          <div className="lux-section-head">
            <span className="lux-eyebrow">Amenities</span>
            <h2>{content.amenities.heading}</h2>
          </div>
          <div className="lux-amenities-grid">
            {content.amenities.items.map((item, i) => (
              <div key={i} className="lux-amenity-card">
                <div className="lux-amenity-icon" aria-hidden="true">
                  {item.icon === "pool" && "🏊"}
                  {item.icon === "garden" && "🌿"}
                  {item.icon === "dumbbell" && "💪"}
                  {item.icon === "tv" && "📺"}
                  {item.icon === "wifi" && "📶"}
                  {item.icon === "chef-hat" && "🍳"}
                  {item.icon === "snowflake" && "❄️"}
                  {item.icon === "shield-lock" && "🔐"}
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Guest Reviews ── */}
      <section className="lux-section lux-section-alt" id="reviews">
        <div className="wrap">
          <Testimonials />
        </div>
      </section>

      {/* ── 6. Nearby Attractions ── */}
      <section className="lux-section">
        <div className="wrap">
          <div className="lux-section-head">
            <span className="lux-eyebrow">Location</span>
            <h2>{content.attractions.heading}</h2>
            <p className="lux-section-sub">
              Serin is at the center of everything Tagaytay has to offer.
            </p>
          </div>
          <div className="lux-attractions-grid">
            {content.attractions.items.map((item, i) => (
              <div key={i} className="lux-attraction-card">
                <div className="lux-attraction-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="lux-attraction-meta">
                    <span>{item.distance}</span>
                    <span className="lux-attraction-dot">&middot;</span>
                    <span>{item.travelTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Photo Gallery ── */}
      <section className="lux-section lux-section-alt">
        <div className="wrap">
          <div className="lux-section-head">
            <span className="lux-eyebrow">Gallery</span>
            <h2>A Glimpse of Your Stay</h2>
          </div>
          <div className="lux-gallery-grid">
            {[
              "1VG31wyETnAhanJlnwjh17HJKssDEyN86",
              "1IRtoZbhiEJiamLMG1fVAhChKoIvpslhj",
              "1x5YXqMzeRkIo8vVEMW0SD4JWjzBeUavv",
              "1aZpmQdrz60FKq2vIJyLELvq0UpD5dDYi",
              "1qBXcfl8JGRgfSy2Iot4aeYbuWlqLCXjC",
              "1pziyW403F4p80SkeZ1HIIX7PWvxSUSsA",
              "1IP7j77477Wi_BmTv0U7rOXlyFw98ppu9",
              "1hIciOpX9KuSAOJ19XmbkGrE8rXp_KiJS",
            ].map((id, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={id}
                src={drivePhoto(id, 800)}
                alt="Serin Tagaytay suite"
                className={`lux-gallery-img ${i === 0 ? "lux-gallery-wide" : ""} ${i === 3 ? "lux-gallery-tall" : ""}`}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ── */}
      <section className="lux-section" id="faq">
        <div className="wrap">
          <div className="lux-section-head">
            <span className="lux-eyebrow">Help</span>
            <h2>{content.faq.heading}</h2>
          </div>
          <FAQ items={content.faq.items} />
        </div>
      </section>

      {/* ── 9. Booking CTA ── */}
      <section className="lux-booking-cta">
        <div className="wrap">
          <div className="lux-booking-content">
            <h2>Ready for Your Tagaytay Escape?</h2>
            <p>
              Book directly with us for the best rates, instant confirmation, and
              no hidden fees. Your perfect staycation is just a few clicks away.
            </p>
            <form className="lux-searchbar" method="get" action="/book">
              <div className="lux-search-field">
                <label htmlFor="h-checkIn">Check in</label>
                <input type="date" id="h-checkIn" name="checkIn" defaultValue={checkIn} />
              </div>
              <div className="lux-search-field">
                <label htmlFor="h-checkOut">Check out</label>
                <input type="date" id="h-checkOut" name="checkOut" defaultValue={checkOut} />
              </div>
              <div className="lux-search-field">
                <label htmlFor="h-guests">Guests</label>
                <select id="h-guests" name="guests" defaultValue={String(guests)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn lux-btn-primary" type="submit">
                Check Availability
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── 10. Footer ── */}
      <Footer />
    </>
  );
}
