import Link from "next/link";
import { Mark } from "./mark.tsx";

export function Footer() {
  return (
    <footer className="pub-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="lockup">
              <Mark />
              <p className="brand">
                Serin
                <small>Tagaytay</small>
              </p>
            </div>
            <p className="footer-tagline">
              Cool air, and the whole caldera below you.
            </p>
          </div>
          <div className="footer-links">
            <h4>Browse</h4>
            <Link href="/">All Units</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/book">Book Now</Link>
          </div>
          <div className="footer-links">
            <h4>Info</h4>
            <Link href="/admin">Admin Portal</Link>
            <a href="https://serintagaytaystaycation.com">serintagaytaystaycation.com</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Serin Tagaytay Staycation. All rights reserved.</p>
          <p>Serin West &amp; East, Tagaytay City, Cavite</p>
        </div>
      </div>
    </footer>
  );
}
