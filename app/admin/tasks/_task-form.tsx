"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const UNITS = [
  { id: "west-1-517", label: "1-517" },
  { id: "west-1-520", label: "1-520" },
  { id: "west-1-609", label: "1-609" },
  { id: "west-1-611", label: "1-611" },
  { id: "west-1-612", label: "1-612" },
  { id: "west-2-518", label: "2-518" },
  { id: "west-2-616", label: "2-616" },
  { id: "west-2-617", label: "2-617" },
  { id: "west-2-619", label: "2-619" },
  { id: "west-2-811", label: "2-811" },
  { id: "west-2-906", label: "2-906" },
  { id: "west-2-911", label: "2-911" },
  { id: "east-3-517", label: "3-517 E" },
  { id: "east-3-612", label: "3-612 E" },
  { id: "east-3-617", label: "3-617 E" },
  { id: "east-3-618", label: "3-618 E" },
  { id: "east-3-906", label: "3-906 E" },
];

interface StaffOption {
  id: string;
  name: string;
}

export function TaskForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [unitId, setUnitId] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignedTo, setAssignedTo] = useState("");
  const [recurrence, setRecurrence] = useState("once");
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      fetch("/api/staff")
        .then((r) => r.json())
        .then((d) => {
          if (d.staff) {
            setStaffList(
              d.staff
                .filter((s: { active: boolean }) => s.active)
                .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })),
            );
          }
        })
        .catch(() => {});
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const unit = UNITS.find((u) => u.id === unitId);
      const staff = staffList.find((s) => s.id === assignedTo);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          instructions,
          unitId: unitId || null,
          unitLabel: unit?.label || null,
          dueDate,
          assignedTo: assignedTo || null,
          assignedName: staff?.name || null,
          recurrence,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to create task");
        return;
      }
      setTitle("");
      setInstructions("");
      setUnitId("");
      setDueDate(new Date().toISOString().slice(0, 10));
      setAssignedTo("");
      setRecurrence("once");
      setOpen(false);
      window.dispatchEvent(new Event("tasks-updated"));
      router.refresh();
    } catch {
      alert("Connection error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + New Task
      </button>
    );
  }

  return (
    <div className="panel" style={{ marginBottom: "1.5rem" }}>
      <h2>New Task (Utos)</h2>
      <form onSubmit={handleSubmit} className="form-body" style={{ padding: "1rem" }}>
        <div className="field">
          <label htmlFor="task-title">Task Title *</label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Replace towels, Fix AC..."
            required
          />
        </div>
        <div className="field">
          <label htmlFor="task-instructions">Instructions (Utos)</label>
          <textarea
            id="task-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Detailed instructions for staff..."
            rows={4}
            style={{ resize: "vertical" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="task-assigned">Assign To</label>
            <select id="task-assigned" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">— Not assigned —</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-recurrence">Repeat</label>
            <select id="task-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              <option value="once">Once (one-time)</option>
              <option value="daily">Every Day</option>
              <option value="weekly">Every Week</option>
              <option value="monthly">Every Month</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="task-unit">Unit (optional)</label>
            <select id="task-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">— All / General —</option>
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-due">Due Date</label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
          <button className="btn" type="submit" disabled={saving || !title.trim()}>
            {saving ? "Saving..." : "Create Task"}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
