import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { MessengerBtn } from "./_components/messenger-btn.tsx";
import { SWRegister } from "./_components/sw-register.tsx";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2f5a1e",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Serin Tagaytay Staycation | Premium Staycations in the Heart of Tagaytay",
    template: "%s | Serin Tagaytay Staycation",
  },
  description:
    "Stay in the best premium staycation units in Serin Tagaytay. Enjoy stylish, professionally maintained accommodations with Taal volcano views, pool access, and direct booking rates.",
  keywords: [
    "Tagaytay staycation",
    "Serin Tagaytay",
    "condo staycation Tagaytay",
    "Taal view accommodation",
    "family staycation Tagaytay",
    "weekend staycation Tagaytay",
    "staycation near Ayala Serin",
    "1 bedroom staycation Tagaytay",
    "2 bedroom staycation Tagaytay",
    "vacation rental Tagaytay",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Serin Tagaytay",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Serin Tagaytay Staycation — Premium Staycations in the Heart of Tagaytay",
    description:
      "Seventeen premium condominium units on the Tagaytay ridge. Book direct for the best rates — no platform fees, instant confirmation.",
    siteName: "Serin Tagaytay Staycation",
    type: "website",
    url: "https://tagaytaystaycation.com",
    locale: "en_PH",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://tagaytaystaycation.com" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        {children}
        <MessengerBtn />
        <SWRegister />
      </body>
    </html>
  );
}
