import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Serin Tagaytay Staycation",
    template: "%s | Serin Tagaytay Staycation",
  },
  description:
    "Condominium staycations on the Tagaytay ridge, overlooking the Taal caldera. 17 units at Serin West & East with Taal view.",
  keywords: ["Tagaytay", "staycation", "condo", "Serin", "Taal view", "accommodation", "vacation rental"],
  openGraph: {
    title: "Serin Tagaytay Staycation",
    description: "Cool air, and the whole caldera below you. Book direct for the best rates.",
    siteName: "Serin Tagaytay Staycation",
    type: "website",
    url: "https://serintagaytaystaycation.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
