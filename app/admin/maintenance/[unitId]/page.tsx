"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Category = "deep_clean" | "repair" | "change_replace" | "dispose";
type Status = "pending" | "in_progress" | "done" | "checked";

interface Task {
  id: string;
  category: Category;
  description: string;
  assigned_to: string | null;
  status: Status;
  priority: string;
  notes: string | null;
  created_at: string;
  accomplished_at: string | null;
  checked_at: string | null;
  checked_by: string | null;
}

const CATEGORIES: Category[] = ["deep_clean", "repair", "change_replace", "dispose"];
const CATEGORY_LABELS: Record<Category, string> = {
  deep_clean: "Deep Clean",
  repair: "Repair",
  change_replace: "Change / Replace",
  dispose: "Dispose",
};

const STATUSES: Status[] = ["pending", "in_progress", "done", "checked"];
const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  checked: "Checked",
};
const STATUS_COLORS: Record<Status, string> = {
  pending: "#f39c12",
  in_progress: "#2980b9",
  done: "#27ae60",
  checked: "#7f8c8d",
};

const STAFF = ["Jonelyn", "Ishi", "April"];

export default function UnitMaintenancePage() {
  const { unitId } = useParams<{ unitId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "done">("active");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("deep_clean");
  const [newAssign, setNewAssign] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newNotes, setNewNotes] = useState("");

  const load = useCallback(() => {
    fetch(`/api/unit-tasks?unitId=${unitId}`)
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [unitId]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter((t) => {
    if (statusFilter === "active") return t.status === "pending" || t.status === "in_progress";
    if (statusFilter === "done") return t.status === "done" || t.status === "checked";
    return true;
  });

  async function addTask() {
    if (!newDesc.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/unit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          tasks: [{
            category: newCategory,
            description: newDesc.trim(),
            assignedTo: newAssign || null,
            priority: newPriority,
            notes: newNotes.trim() || null,
          }],
        }),
      });
      setNewDesc(""); setNewNotes(""); setNewAssign(""); setNewPriority("normal");
      setShowAdd(false);
      load();
    } finally { setSaving(false); }
  }

  async function updateField(id: string, field: string, value: string) {
    await fetch("/api/unit-tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/unit-tasks?id=${id}`, { method: "DELETE" });
    load();
  }

  const label = unitId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin/maintenance" style={{ fontSize: "0.75rem", color: "var(--text-3)", textDecoration: "none" }}>
            &larr; All Units
          </Link>
          <h1 className="today" style={{ marginTop: "0.25rem" }}>{label} — Maintenance</h1>
          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
            {pendingCount > 0 && <span style={{ color: STATUS_COLORS.pending, fontWeight: 600 }}>{pendingCount} pending</span>}
            {inProgressCount > 0 && <span style={{ color: STATUS_COLORS.in_progress, fontWeight: 600 }}>{inProgressCount} in progress</span>}
            {pendingCount === 0 && inProgressCount === 0 && <span>No active tasks</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-start" }}>
          <select
            className="field"
            style={{ width: "auto", fontSize: "0.72rem", padding: "0.3rem 0.5rem" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "all" | "done")}
          >
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="done">Completed</option>
          </select>
          <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : "+ Add Task"}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="form-panel" style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>New Task</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">Description *</label>
              <input className="field" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What needs to be done..." onKeyDown={(e) => e.key === "Enter" && addTask()} />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field" value={newCategory} onChange={(e) => setNewCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Assign To</label>
              <select className="field" value={newAssign} onChange={(e) => setNewAssign(e.target.value)}>
                <option value="">Unassigned</option>
                {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Priority</label>
              <select className="field" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input className="field" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional..." />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
            <button className="btn-primary" onClick={addTask} disabled={saving || !newDesc.trim()}>
              {saving ? "Adding..." : "Add Task"}
            </button>
            <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>
          {tasks.length === 0 ? "No tasks yet. Click \"+Add Task\" to get started." : "No tasks match the current filter."}
        </div>
      ) : (
        <div className="tbl-scroll">
          <table className="tbl" style={{ fontSize: "0.78rem" }}>
            <thead>
              <tr>
                <th style={{ width: "1.5rem" }}></th>
                <th>Description</th>
                <th>Category</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Notes</th>
                <th>Created</th>
                <th>Done</th>
                <th>Checked</th>
                <th style={{ width: "2.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <TaskRow key={task.id} task={task} onUpdate={updateField} onDelete={deleteTask} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TaskRow({ task, onUpdate, onDelete }: {
  task: Task;
  onUpdate: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editDesc, setEditDesc] = useState(false);
  const [desc, setDesc] = useState(task.description);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(task.notes ?? "");

  const cellStyle: React.CSSProperties = {
    padding: "0.35rem 0.4rem",
    verticalAlign: "middle",
    opacity: task.status === "checked" ? 0.55 : 1,
  };

  const selectStyle: React.CSSProperties = {
    border: "none",
    background: "transparent",
    fontSize: "0.72rem",
    cursor: "pointer",
    padding: "0.15rem 0",
    width: "100%",
    color: "inherit",
  };

  return (
    <tr>
      {/* Priority indicator */}
      <td style={{ ...cellStyle, textAlign: "center" }}>
        <button
          onClick={() => onUpdate(task.id, "priority", task.priority === "high" ? "normal" : "high")}
          title={task.priority === "high" ? "High priority — click to set normal" : "Normal priority — click to set high"}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1 }}
        >
          {task.priority === "high" ? "!" : ""}
        </button>
      </td>

      {/* Description — click to edit */}
      <td style={{ ...cellStyle, minWidth: 180, maxWidth: 300 }}>
        {editDesc ? (
          <input
            autoFocus
            className="field"
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.3rem", width: "100%" }}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => { if (desc.trim() && desc !== task.description) onUpdate(task.id, "description", desc.trim()); setEditDesc(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { if (desc.trim() && desc !== task.description) onUpdate(task.id, "description", desc.trim()); setEditDesc(false); }
              if (e.key === "Escape") { setDesc(task.description); setEditDesc(false); }
            }}
          />
        ) : (
          <span onClick={() => setEditDesc(true)} style={{ cursor: "pointer", display: "block" }} title="Click to edit">
            {task.description}
          </span>
        )}
      </td>

      {/* Category dropdown */}
      <td style={cellStyle}>
        <select style={selectStyle} value={task.category} onChange={(e) => onUpdate(task.id, "category", e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </td>

      {/* Assigned To dropdown */}
      <td style={cellStyle}>
        <select style={selectStyle} value={task.assigned_to ?? ""} onChange={(e) => onUpdate(task.id, "assignedTo", e.target.value)}>
          <option value="">—</option>
          {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>

      {/* Status dropdown */}
      <td style={cellStyle}>
        <select
          style={{ ...selectStyle, color: STATUS_COLORS[task.status], fontWeight: 600 }}
          value={task.status}
          onChange={(e) => onUpdate(task.id, "status", e.target.value)}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </td>

      {/* Priority dropdown */}
      <td style={cellStyle}>
        <select style={selectStyle} value={task.priority} onChange={(e) => onUpdate(task.id, "priority", e.target.value)}>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </td>

      {/* Notes — click to edit */}
      <td style={{ ...cellStyle, minWidth: 100, maxWidth: 200 }}>
        {editNotes ? (
          <input
            autoFocus
            className="field"
            style={{ fontSize: "0.72rem", padding: "0.2rem 0.3rem", width: "100%" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== (task.notes ?? "")) onUpdate(task.id, "notes", notes); setEditNotes(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { if (notes !== (task.notes ?? "")) onUpdate(task.id, "notes", notes); setEditNotes(false); }
              if (e.key === "Escape") { setNotes(task.notes ?? ""); setEditNotes(false); }
            }}
          />
        ) : (
          <span
            onClick={() => setEditNotes(true)}
            style={{ cursor: "pointer", display: "block", color: task.notes ? "inherit" : "var(--text-3)", fontStyle: task.notes ? "normal" : "italic" }}
            title="Click to edit"
          >
            {task.notes || "—"}
          </span>
        )}
      </td>

      {/* Created */}
      <td style={{ ...cellStyle, fontSize: "0.68rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
        {new Date(task.created_at).toLocaleDateString()}
      </td>

      {/* Accomplished */}
      <td style={{ ...cellStyle, fontSize: "0.68rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
        {task.accomplished_at ? new Date(task.accomplished_at).toLocaleDateString() : "—"}
      </td>

      {/* Checked */}
      <td style={{ ...cellStyle, fontSize: "0.68rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
        {task.checked_at ? new Date(task.checked_at).toLocaleDateString() : "—"}
      </td>

      {/* Delete */}
      <td style={{ ...cellStyle, textAlign: "center" }}>
        <button
          onClick={() => onDelete(task.id)}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#e74c3c", fontSize: "0.75rem", fontWeight: 700 }}
          title="Delete task"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
