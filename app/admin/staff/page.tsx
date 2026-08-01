"use client";

import { useState } from "react";
import {
  ALL_PERMISSIONS,
  ROLE_LABELS,
  ROLE_DEFAULTS,
  type Role,
  type StaffMember,
} from "../../../src/lib/permissions.ts";

const SAMPLE_STAFF: StaffMember[] = [
  {
    id: "staff-1",
    name: "Admin",
    email: "avarealty2025@gmail.com",
    role: "super_admin",
    permissions: ALL_PERMISSIONS.map((p) => p.key),
    active: true,
    createdAt: "2026-07-31",
    lastLogin: "2026-08-01",
  },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(SAMPLE_STAFF);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "reception" as Role,
    password: "",
  });
  const [editPerms, setEditPerms] = useState<string | null>(null);
  const [perms, setPerms] = useState<string[]>([]);

  const roles = Object.entries(ROLE_LABELS) as [Role, string][];
  const permGroups = [...new Set(ALL_PERMISSIONS.map((p) => p.group))];

  function addStaff() {
    const member: StaffMember = {
      id: `staff-${Date.now()}`,
      name: form.name,
      email: form.email,
      role: form.role,
      permissions: ROLE_DEFAULTS[form.role],
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
      lastLogin: null,
    };
    setStaff((prev) => [...prev, member]);
    setShowForm(false);
    setForm({ name: "", email: "", role: "reception", password: "" });
  }

  function deactivate(id: string) {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
    );
  }

  function savePerms(id: string) {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, permissions: perms } : s)),
    );
    setEditPerms(null);
  }

  return (
    <>
      <div className="page-head">
        <h1 className="today">Staff</h1>
        <button className="btn" onClick={() => setShowForm(true)} type="button">
          + Add Staff
        </button>
      </div>

      <div className="tiles">
        <div className="tile">
          <p className="k">Total Staff</p>
          <p className="v">{staff.length}</p>
          <p className="s">{staff.filter((s) => s.active).length} active</p>
        </div>
        <div className="tile">
          <p className="k">Roles</p>
          <p className="v">{new Set(staff.map((s) => s.role)).size}</p>
          <p className="s">in use</p>
        </div>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2>Add Staff Member</h2>
          <div className="form-body">
            <div className="field-row">
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                >
                  {roles.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Temporary Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Must change on first login"
                />
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>
              Default permissions for the selected role will be applied.
              Customize from the staff list after creation.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="btn" onClick={addStaff} type="button">
                Create Account
              </button>
              <button
                className="btn-outline"
                onClick={() => setShowForm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>
          Staff Members <span className="hint">{staff.length} total</span>
        </h2>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Last Login</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} style={!s.active ? { opacity: 0.5 } : undefined}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="mono" style={{ fontSize: "0.75rem" }}>
                    {s.email}
                  </td>
                  <td>
                    <span className="src-pill direct">
                      {ROLE_LABELS[s.role]}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.75rem" }}>
                    {s.permissions.length} of {ALL_PERMISSIONS.length}
                  </td>
                  <td>
                    <span className={`status-pill ${s.active ? "ok" : "warn"}`}>
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: "0.75rem" }}>
                    {s.lastLogin ?? "Never"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="btn-xs"
                        onClick={() => {
                          setEditPerms(s.id);
                          setPerms([...s.permissions]);
                        }}
                        type="button"
                      >
                        Permissions
                      </button>
                      <button
                        className="btn-xs"
                        onClick={() => deactivate(s.id)}
                        type="button"
                      >
                        {s.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editPerms && (
        <div className="panel">
          <h2>
            Edit Permissions{" "}
            <span className="hint">
              {staff.find((s) => s.id === editPerms)?.name}
            </span>
          </h2>
          <div className="form-body">
            {permGroups.map((group) => (
              <div key={group} style={{ marginBottom: "0.75rem" }}>
                <p
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text-3)",
                    fontWeight: 700,
                    margin: "0 0 0.3rem",
                  }}
                >
                  {group}
                </p>
                <div className="amenity-grid">
                  {ALL_PERMISSIONS.filter((p) => p.group === group).map((p) => (
                    <label key={p.key} className="amenity-check">
                      <input
                        type="checkbox"
                        checked={perms.includes(p.key)}
                        onChange={() =>
                          setPerms((prev) =>
                            prev.includes(p.key)
                              ? prev.filter((x) => x !== p.key)
                              : [...prev, p.key],
                          )
                        }
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                className="btn"
                onClick={() => savePerms(editPerms)}
                type="button"
              >
                Save Permissions
              </button>
              <button
                className="btn-outline"
                onClick={() => setEditPerms(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="foot">
        Staff accounts require Supabase Auth. The current system uses a single
        admin password. Once the database is connected, each staff member gets
        their own login with role-based permissions.
      </p>
    </>
  );
}
