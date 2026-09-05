"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ALL_PERMISSIONS,
  ROLE_LABELS,
  ROLE_DEFAULTS,
  type Role,
  type StaffMember,
} from "../../../src/lib/permissions.ts";
import { PermGuard } from "../_perm-guard.tsx";

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "reception" as Role,
    password: "",
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [editPerms, setEditPerms] = useState<string | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const roles = Object.entries(ROLE_LABELS) as [Role, string][];
  const permGroups = [...new Set(ALL_PERMISSIONS.map((p) => p.group))];

  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (data.staff) setStaff(data.staff);
    } catch {
      /* skip */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function addStaff() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("All fields are required");
      return;
    }
    setCreating(true);
    setFormError("");

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          permissions: ROLE_DEFAULTS[form.role],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setFormError(data.error || "Failed to create staff");
        return;
      }
      setShowForm(false);
      setForm({ name: "", email: "", role: "reception", password: "" });
      loadStaff();
    } catch {
      setFormError("Connection error");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    const newActive = !member.active;
    if (!newActive && !confirm(`Deactivate ${member.name}? They will no longer be able to log in.`)) return;

    try {
      await fetch(`/api/staff/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
      loadStaff();
    } catch {
      alert("Failed to update");
    }
  }

  async function savePerms(id: string) {
    setSavingPerms(true);
    try {
      await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
      setEditPerms(null);
      loadStaff();
    } catch {
      alert("Failed to save permissions");
    } finally {
      setSavingPerms(false);
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-head">
          <h1 className="today">Staff</h1>
        </div>
        <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading...</p>
      </>
    );
  }

  return (
    <PermGuard perm="staff.view">
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
            {formError && (
              <p style={{ color: "var(--crit)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>{formError}</p>
            )}
            <div className="field-row">
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Maria Santos"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="staff@email.com"
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
                <label>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>
              This will create a login account. The staff member can sign in at the admin login page with their email and password.
              Default permissions for the selected role will be applied.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="btn" onClick={addStaff} disabled={creating} type="button">
                {creating ? "Creating..." : "Create Account"}
              </button>
              <button
                className="btn-outline"
                onClick={() => { setShowForm(false); setFormError(""); }}
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
        {staff.length === 0 ? (
          <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>
            No staff members yet. Click &ldquo;+ Add Staff&rdquo; to create the first account.
          </p>
        ) : (
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
                        {ROLE_LABELS[s.role] ?? s.role}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>
                      {(s.permissions || []).length} of {ALL_PERMISSIONS.length}
                    </td>
                    <td>
                      <span className={`pill ${s.active ? "free" : "gone"}`} style={{ fontSize: "0.68rem" }}>
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: "0.75rem" }}>
                      {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : "Never"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="btn-xs"
                          onClick={() => {
                            setEditPerms(s.id);
                            setPerms([...(s.permissions || [])]);
                          }}
                          type="button"
                        >
                          Permissions
                        </button>
                        <button
                          className="btn-xs"
                          onClick={() => toggleActive(s)}
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
        )}
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
                disabled={savingPerms}
                type="button"
              >
                {savingPerms ? "Saving..." : "Save Permissions"}
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
    </>
    </PermGuard>
  );
}
