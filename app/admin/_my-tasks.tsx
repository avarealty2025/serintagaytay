"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface Task {
  id: string;
  category: string;
  description: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  unit_id: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f39c12",
  in_progress: "#2980b9",
  done: "#27ae60",
};

const CAT_LABELS: Record<string, string> = {
  deep_clean: "Deep Clean",
  repair: "Repair",
  change_replace: "Change/Replace",
  dispose: "Dispose",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/notifications?unread=1")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => {});
    const iv = setInterval(() => {
      fetch("/api/notifications?unread=1")
        .then((r) => r.json())
        .then((d) => setNotifications(d.notifications ?? []))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: notifications.map((n) => n.id), read: true }),
    });
    setNotifications([]);
    setOpen(false);
  }

  const count = notifications.length;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          border: "none", background: "transparent", cursor: "pointer",
          fontSize: "1.2rem", position: "relative", padding: "0.25rem 0.5rem",
        }}
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0, background: "#e74c3c", color: "#fff",
            fontSize: "0.55rem", fontWeight: 700, borderRadius: "50%", width: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "100%", width: 320, maxHeight: 400,
          overflowY: "auto", background: "var(--bg, #fff)", border: "1px solid var(--line-soft)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 1000,
        }}>
          <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.8rem" }}>Notifications</span>
            {count > 0 && (
              <button onClick={markAllRead} style={{ border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-3)", fontSize: "0.75rem" }}>
              No new notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--line-soft)" }}>
                {n.link ? (
                  <Link href={n.link} onClick={() => setOpen(false)} style={{ textDecoration: "none", color: "inherit" }}>
                    <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600 }}>{n.title}</p>
                    {n.message && <p style={{ margin: "0.15rem 0 0", fontSize: "0.7rem", color: "var(--text-3)" }}>{n.message}</p>}
                  </Link>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600 }}>{n.title}</p>
                    {n.message && <p style={{ margin: "0.15rem 0 0", fontSize: "0.7rem", color: "var(--text-3)" }}>{n.message}</p>}
                  </>
                )}
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.6rem", color: "var(--text-3)" }}>
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function MyTasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitMap, setUnitMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/unit-tasks?status=pending")
      .then((r) => r.json())
      .then((d) => {
        const all = (d.tasks ?? []) as Task[];
        setTasks(all.slice(0, 20));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/unit-tasks?summary=1")
      .then((r) => r.json())
      .then(() => {})
      .catch(() => {});
  }, []);

  useEffect(() => {
    import("../../src/data/units.ts").then((m) => {
      const map: Record<string, string> = {};
      for (const u of m.UNITS) {
        map[u.id] = u.name ? `${u.name} (${u.tower}-${u.code})` : `${u.tower}-${u.code}`;
      }
      setUnitMap(map);
    }).catch(() => {});
  }, []);

  if (loading) return null;
  if (tasks.length === 0) return null;

  const byStaff: Record<string, Task[]> = {};
  const unassigned: Task[] = [];
  for (const t of tasks) {
    if (t.assigned_to) {
      if (!byStaff[t.assigned_to]) byStaff[t.assigned_to] = [];
      byStaff[t.assigned_to]!.push(t);
    } else {
      unassigned.push(t);
    }
  }

  return (
    <div className="panel" style={{ marginTop: "1.5rem" }}>
      <h2>
        Pending Maintenance Tasks{" "}
        <span className="hint">{tasks.length} tasks</span>
        <Link href="/admin/maintenance" style={{ fontSize: "0.72rem", marginLeft: "0.5rem", color: "var(--accent)" }}>
          View All →
        </Link>
      </h2>

      {Object.entries(byStaff).map(([staff, staffTasks]) => (
        <div key={staff} style={{ marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-2)", margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {staff} ({staffTasks.length})
          </p>
          {staffTasks.map((t) => (
            <div key={t.id} className="row" style={{ padding: "0.3rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="stripe" style={{ background: STATUS_COLORS[t.status] ?? "#999" }} />
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: "0.78rem" }}>{t.description}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--text-3)", marginLeft: "0.4rem" }}>
                  {CAT_LABELS[t.category] ?? t.category}
                </span>
              </span>
              {t.priority === "high" && (
                <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#fff", background: "#e74c3c", padding: "0.05rem 0.2rem", borderRadius: 3 }}>
                  HIGH
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      {unassigned.length > 0 && (
        <div>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Unassigned ({unassigned.length})
          </p>
          {unassigned.map((t) => (
            <div key={t.id} className="row" style={{ padding: "0.3rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="stripe" style={{ background: STATUS_COLORS[t.status] ?? "#999" }} />
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: "0.78rem" }}>{t.description}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--text-3)", marginLeft: "0.4rem" }}>
                  {CAT_LABELS[t.category] ?? t.category}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
