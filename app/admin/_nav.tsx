"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useMe, hasPerm } from "./_perm-guard.tsx";

interface NavLink {
  href: string;
  label: string;
  perm?: string;
}

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Operations",
    links: [
      { href: "/admin", label: "Dashboard", perm: "dashboard.view" },
      { href: "/admin/calendar", label: "Calendar", perm: "calendar.view" },
      { href: "/admin/bookings", label: "Bookings", perm: "bookings.view" },
      { href: "/admin/bookings/history", label: "History", perm: "bookings.view" },
      { href: "/admin/guests", label: "Guests", perm: "guests.view" },
      { href: "/admin/tasks", label: "Tasks", perm: "tasks.view" },
      { href: "/admin/cleaning", label: "Cleaning", perm: "cleaning.view" },
      { href: "/admin/maintenance", label: "Maintenance", perm: "tasks.view" },
    ],
  },
  {
    title: "Units",
    links: [
      { href: "/admin/units", label: "All Units", perm: "units.view" },
    ],
  },
  {
    title: "Business",
    links: [
      { href: "/admin/reports", label: "Reports & P&L", perm: "reports.view" },
      { href: "/admin/reports/parking", label: "Parking", perm: "reports.view" },
      { href: "/admin/invoices", label: "Invoices", perm: "payments.view" },
      { href: "/admin/expenses", label: "Expenses", perm: "expenses.view" },
      { href: "/admin/reviews", label: "Reviews", perm: "settings.view" },
      { href: "/admin/promo-codes", label: "Promo Codes", perm: "settings.edit" },
      { href: "/admin/channels", label: "OTA Channels", perm: "settings.view" },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/admin/settings", label: "Settings", perm: "settings.view" },
      { href: "/admin/staff", label: "Staff", perm: "staff.view" },
      { href: "/admin/audit", label: "Audit Logs", perm: "audit.view" },
    ],
  },
  {
    title: "Site",
    links: [
      { href: "/admin/site-content", label: "Site Content", perm: "settings.edit" },
      { href: "/admin/templates", label: "Templates", perm: "settings.edit" },
      { href: "/", label: "Public Site" },
    ],
  },
];

export function SideNav() {
  const path = usePathname();
  const me = useMe();

  if (!me) {
    return (
      <nav className="navgrp">
        <h3>Loading...</h3>
      </nav>
    );
  }

  return (
    <>
      {GROUPS.map(({ title, links }) => {
        const visible = links.filter((l) => !l.perm || hasPerm(me, l.perm));
        if (visible.length === 0) return null;
        return (
          <nav className="navgrp" key={title}>
            <h3>{title}</h3>
            {visible.map(({ href, label }) => {
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
        );
      })}
    </>
  );
}
