"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface StaffTask {
  id: string;
  title: string;
  instructions: string;
  unitId: string | null;
  unitLabel: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  recurrence: "once" | "daily" | "weekly" | "monthly";
  dueDate: string;
  type: "custom";
  status: "todo" | "in_progress" | "done";
  priority: number;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_CYCLE: Record<string, string> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const RECURRENCE_LABELS: Record<string, string> = {
  once: "",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function CustomTasks() {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  function fetchTasks() {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    fetchTasks();
    const handler = () => fetchTasks();
    window.addEventListener("tasks-updated", handler);
    return () => window.removeEventListener("tasks-updated", handler);
  }, []);

  async function updateStatus(task: StaffTask) {
    const nextStatus = STATUS_CYCLE[task.status] as StaffTask["status"];
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      );
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      const res = await fetch("/api/tasks");
      const d = await res.json();
      setTasks(d.tasks ?? []);
    }
  }

  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  function renderTask(t: StaffTask, isDone: boolean) {
    return (
      <div className="row" key={t.id} style={{ flexWrap: "wrap" }}>
        <span
          className="stripe"
          style={{ background: isDone ? "var(--good)" : "var(--info, #3b82f6)" }}
        />
        <span
          style={{
            flex: 1,
            cursor: t.instructions ? "pointer" : "default",
            textDecoration: isDone ? "line-through" : "none",
            opacity: isDone ? 0.7 : 1,
          }}
          onClick={() =>
            t.instructions && setExpandedId(expandedId === t.id ? null : t.id)
          }
        >
          <p className="who">
            {t.title}
            {t.recurrence !== "once" && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "0.65rem",
                  background: "var(--accent)",
                  color: "#fff",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "3px",
                  fontWeight: 600,
                  verticalAlign: "middle",
                }}
              >
                {RECURRENCE_LABELS[t.recurrence]}
              </span>
            )}
          </p>
          <p className="sub">
            {t.unitLabel || "General"}
            {t.assignedName ? ` · Assigned: ${t.assignedName}` : ""}
            {t.dueDate ? ` · Due: ${t.dueDate}` : ""}
          </p>
        </span>
        <button
          onClick={() => updateStatus(t)}
          style={{
            cursor: "pointer",
            border: "none",
            fontSize: "0.7rem",
            padding: "0.2rem 0.6rem",
            borderRadius: "4px",
            fontWeight: 600,
            background:
              t.status === "todo"
                ? "var(--warn)"
                : t.status === "in_progress"
                  ? "var(--info, #3b82f6)"
                  : "var(--good)",
            color: "#fff",
          }}
        >
          {STATUS_LABELS[t.status]}
        </button>
        <button
          onClick={() => deleteTask(t.id)}
          style={{
            background: "none",
            border: "none",
            color: "var(--crit)",
            cursor: "pointer",
            fontSize: "0.8rem",
            padding: "0 0.25rem",
          }}
        >
          &times;
        </button>
        {expandedId === t.id && t.instructions && (
          <div
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 2rem",
              background: "var(--surface-2, #f5f5f5)",
              borderRadius: "6px",
              marginTop: "0.5rem",
              fontSize: "0.85rem",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              color: "var(--text-1)",
            }}
          >
            <strong
              style={{
                fontSize: "0.75rem",
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Instructions:
            </strong>
            <br />
            {t.instructions}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {activeTasks.length > 0 && (
        <div className="panel">
          <h2>
            Custom Tasks (Utos){" "}
            <span className="hint">{activeTasks.length} active</span>
          </h2>
          {activeTasks.map((t) => renderTask(t, false))}
        </div>
      )}

      {doneTasks.length > 0 && (
        <div className="panel" style={{ opacity: 0.7 }}>
          <h2>
            Completed <span className="hint">{doneTasks.length} done</span>
          </h2>
          {doneTasks.map((t) => renderTask(t, true))}
        </div>
      )}
    </>
  );
}
