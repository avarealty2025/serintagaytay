"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveClock({ refreshInterval = 60 }: { refreshInterval?: number }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const sync = setInterval(() => router.refresh(), refreshInterval * 1000);
    return () => clearInterval(sync);
  }, [refreshInterval, router]);

  const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const day = dow[now.getDay()];
  const month = months[now.getMonth()];
  const date = now.getDate();
  const year = now.getFullYear();

  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--mono)", letterSpacing: "-0.02em", color: "var(--text-1)" }}>
        {h12}:{m}:{s}
        <span style={{ fontSize: "0.7rem", fontWeight: 600, marginLeft: "0.25rem", color: "var(--accent)" }}>{ampm}</span>
      </span>
      <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>
        {day}, {month} {date}, {year}
      </span>
    </div>
  );
}
