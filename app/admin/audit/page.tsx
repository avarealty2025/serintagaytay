"use client";

import { useState } from "react";
import { DataTable, type Column } from "../../../src/components/data-table.tsx";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ip: string;
}

const SAMPLE_AUDIT: AuditEntry[] = [
  {
    id: "a1",
    timestamp: "2026-08-01 09:00:00",
    user: "Admin",
    action: "login",
    resource: "session",
    resourceId: "-",
    details: "Logged in via admin password",
    ip: "127.0.0.1",
  },
  {
    id: "a2",
    timestamp: "2026-08-01 08:45:00",
    user: "System",
    action: "create",
    resource: "deployment",
    resourceId: "vercel-prod",
    details: "Deployed to Vercel production",
    ip: "-",
  },
  {
    id: "a3",
    timestamp: "2026-07-31 22:30:00",
    user: "Admin",
    action: "create",
    resource: "booking",
    resourceId: "BK-001",
    details: "Created booking for unit 2-919 via admin portal",
    ip: "127.0.0.1",
  },
];

const ACTION_COLORS: Record<string, string> = {
  create: "ok",
  update: "warn",
  delete: "",
  login: "ok",
  export: "warn",
};

export default function AuditPage() {
  const [entries] = useState<AuditEntry[]>(SAMPLE_AUDIT);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  let filtered = entries;
  if (dateFrom) {
    filtered = filtered.filter((e) => e.timestamp >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter((e) => e.timestamp <= dateTo + " 23:59:59");
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: "timestamp",
      label: "Timestamp",
      sortable: true,
      className: "mono",
      render: (row) => (
        <span style={{ fontSize: "0.75rem" }}>{row.timestamp}</span>
      ),
    },
    {
      key: "user",
      label: "User",
      sortable: true,
      render: (row) => <span style={{ fontWeight: 600 }}>{row.user}</span>,
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      filterOptions: [
        { label: "Create", value: "create" },
        { label: "Update", value: "update" },
        { label: "Delete", value: "delete" },
        { label: "Login", value: "login" },
        { label: "Export", value: "export" },
      ],
      render: (row) => (
        <span
          className={`status-pill ${ACTION_COLORS[row.action] ?? ""}`}
          style={
            row.action === "delete"
              ? {
                  background: "color-mix(in srgb, var(--crit) 18%, transparent)",
                  color: "var(--crit)",
                }
              : undefined
          }
        >
          {row.action}
        </span>
      ),
    },
    {
      key: "resource",
      label: "Resource",
      sortable: true,
      filterOptions: [
        { label: "Booking", value: "booking" },
        { label: "Unit", value: "unit" },
        { label: "Payment", value: "payment" },
        { label: "Expense", value: "expense" },
        { label: "Settings", value: "settings" },
        { label: "Session", value: "session" },
        { label: "Deployment", value: "deployment" },
      ],
    },
    {
      key: "resourceId",
      label: "ID",
      className: "mono",
      render: (row) => (
        <span style={{ fontSize: "0.75rem" }}>{row.resourceId}</span>
      ),
    },
    { key: "details", label: "Details" },
    {
      key: "ip",
      label: "IP",
      className: "mono",
      render: (row) => (
        <span style={{ fontSize: "0.72rem" }}>{row.ip}</span>
      ),
    },
  ];

  return (
    <>
      <div className="page-head">
        <h1 className="today">Audit Logs</h1>
      </div>

      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="dt-toolbar">
          <div className="field">
            <label>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="field">
            <label>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowKey={(e) => e.id}
        searchFields={[(e) => e.user, (e) => e.details, (e) => e.resource]}
        searchPlaceholder="Search logs..."
        exportFilename="audit-log"
        emptyMessage="No audit entries found for the selected period."
        title="Activity Log"
        titleHint={`${filtered.length} entries`}
      />

      <p className="foot">
        Audit logging is active once Supabase is connected. Every create,
        update, delete, login, and export action is recorded with the user,
        timestamp, and IP address.
      </p>
    </>
  );
}
