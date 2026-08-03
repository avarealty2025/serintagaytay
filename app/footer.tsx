import Link from "next/link";
import { Mark } from "./mark.tsx";

export function Footer() {
  return (
    <footer className="pub-footer lux-footer">
      <div className="wrap">
        <div className="lux-footer-top">
          <div className="lux-footer-brand">
            <div className="lockup">
              <Mark />
              <p className="brand">
                Serin
                <small>Tagaytay</small>
              </p>
            </div>
            <p className="lux-footer-story">
              Premium staycation suites in the heart of Tagaytay. Cool mountain
              air, stunning caldera views, and the convenience of a prime location
              — your perfect escape from the city.
            </p>
          </div>

          <div className="lux-footer-links">
            <h4>Suites</h4>
            <Link href="/book">Browse &amp; Book</Link>
            <Link href="/compare">Compare Units</Link>
            <Link href="/#suites">Featured Suites</Link>
          </div>

          <div className="lux-footer-links">
            <h4>Discover</h4>
            <Link href="/#amenities">Amenities</Link>
            <Link href="/#reviews">Guest Reviews</Link>
            <Link href="/#faq">FAQ</Link>
          </div>

          <div className="lux-footer-links">
            <h4>Contact</h4>
            <a href="mailto:avarealty2025@gmail.com">avarealty2025@gmail.com</a>
            <a
              href="https://tagaytaystaycation.com"
              target="_blank"
              rel="noopener"
            >
              tagaytaystaycation.com
            </a>
            <p className="lux-footer-addr">
              Serin West &amp; Serin East
              <br />
              Tagaytay City, Cavite, Philippines
            </p>
          </div>
        </div>

        <div className="lux-footer-divider" />

        <div className="lux-footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} Serin Tagaytay Staycation. All
            rights reserved.
          </p>
          <div className="lux-footer-social">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
