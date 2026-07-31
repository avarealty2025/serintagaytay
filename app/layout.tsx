import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serin Tagaytay Staycation",
  description:
    "Condominium staycations on the Tagaytay ridge, overlooking the Taal caldera.",
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
