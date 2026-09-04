"use client";

import { useRouter } from "next/navigation";

export function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      style={{ cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {children}
    </tr>
  );
}
