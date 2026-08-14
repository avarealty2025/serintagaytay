"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Operations",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/guests", label: "Guests" },
      { href: "/admin/tasks", label: "Tasks" },
    ],
  },
  {
    title: "Units",
    links: [
      { href: "/admin/units", label: "All Units" },
    ],
  },
  {
    title: "Business",
    links: [
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/invoices", label: "Invoices" },
      { href: "/admin/expenses", label: "Expenses" },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/promo-codes", label: "Promo Codes" },
      { href: "/admin/channels", label: "OTA Channels" },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/staff", label: "Staff" },
      { href: "/admin/audit", label: "Audit Logs" },
    ],
  },
  {
    title: "Site",
    links: [
      { href: "/admin/site-content", label: "Site Content" },
      { href: "/admin/templates", label: "Templates" },
      { href: "/", label: "Public Site" },
    ],
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
