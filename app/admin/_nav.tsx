"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Operations",
    links: [
      { href: "/admin", label: "Today" },
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/tasks", label: "Tasks" },
    ],
  },
  {
    title: "Business",
    links: [
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/settings", label: "Settings" },
    ],
  },
  {
    title: "Site",
    links: [{ href: "/", label: "Public site" }],
  },
];

export function SideNav() {
  const path = usePathname();

  return (
    <>
      {GROUPS.map(({ title, links }) => (
        <nav className="navgrp" key={title}>
          <h3>{title}</h3>
          {links.map(({ href, label }) => {
            const active =
              href === "/admin"
                ? path === "/admin"
                : href === "/"
                  ? false
                  : path.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "on" : ""}>
                {label}
              </Link>
            );
          })}
        </nav>
      ))}
    </>
  );
}
