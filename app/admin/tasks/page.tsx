import { UNITS } from "../../../src/data/units.ts";
import { getBookings } from "../../../src/data/db.ts";
import { toDateStr, addDays } from "../../../src/lib/dates.ts";
import { TaskForm } from "./_task-form.tsx";
import { CustomTasks } from "./_custom-tasks.tsx";

export const dynamic = "force-dynamic";

interface Task {
  id: string;
  type: "housekeeping" | "caretaker";
  title: string;
  unit: string;
  unitLabel: string;
  guest: string;
  dueDate: string;
  status: "todo" | "in_progress" | "done";
  priority: number;
}

export default async function TasksPage() {
  const today = toDateStr(new Date());
  const tomorrow = addDays(today, 1);
  const { bookings } = await getBookings();
  const unitMap = new Map(UNITS.map((u) => [u.id, u]));

  const tasks: Task[] = [];

  const departures = bookings.filter((b) => b.checkOut === today);
  for (const b of departures) {
    const u = unitMap.get(b.unitId);
    tasks.push({
      id: `turnover-${b.id}`,
      type: "housekeeping",
      title: "Turnover cleaning",
      unit: b.unitId,
      unitLabel: u ? `${u.tower}-${u.code}` : b.unitId,
      guest: b.guest,
      dueDate: today,
      status: "todo",
      priority: 1,
    });
  }

  const arrivals = bookings.filter((b) => b.checkIn === today);
  for (const b of arrivals) {
    const u = unitMap.get(b.unitId);
    tasks.push({
      id: `arrival-${b.id}`,
      type: "caretaker",
      title: "Arrival preparation",
      unit: b.unitId,
      unitLabel: u ? `${u.tower}-${u.code}` : b.unitId,
      guest: b.guest,
      dueDate: today,
      status: "todo",
      priority: 1,
    });
  }

  const tomorrowDepartures = bookings.filter((b) => b.checkOut === tomorrow);
  for (const b of tomorrowDepartures) {
    const u = unitMap.get(b.unitId);
    tasks.push({
      id: `turnover-tmrw-${b.id}`,
      type: "housekeeping",
      title: "Turnover cleaning (tomorrow)",
      unit: b.unitId,
      unitLabel: u ? `${u.tower}-${u.code}` : b.unitId,
      guest: b.guest,
      dueDate: tomorrow,
      status: "todo",
      priority: 2,
    });
  }

  const tomorrowArrivals = bookings.filter((b) => b.checkIn === tomorrow);
  for (const b of tomorrowArrivals) {
    const u = unitMap.get(b.unitId);
    tasks.push({
      id: `arrival-tmrw-${b.id}`,
      type: "caretaker",
      title: "Arrival prep (tomorrow)",
      unit: b.unitId,
      unitLabel: u ? `${u.tower}-${u.code}` : b.unitId,
      guest: b.guest,
      dueDate: tomorrow,
      status: "todo",
      priority: 2,
    });
  }

  tasks.sort((a, b) => a.priority - b.priority || a.dueDate.localeCompare(b.dueDate));

  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const upcomingTasks = tasks.filter((t) => t.dueDate > today);

  return (
    <>
      <div className="page-head">
        <h1 className="today">Tasks</h1>
        <TaskForm />
      </div>

      <div className="tiles">
        <div className="tile">
          <p className="k">Today</p>
          <p className="v">{todayTasks.length}</p>
          <p className="s">tasks due</p>
        </div>
        <div className="tile">
          <p className="k">Tomorrow</p>
          <p className="v">{upcomingTasks.length}</p>
          <p className="s">upcoming</p>
        </div>
        <div className="tile">
          <p className="k">Housekeeping</p>
          <p className="v">{tasks.filter((t) => t.type === "housekeeping").length}</p>
          <p className="s">turnovers</p>
        </div>
        <div className="tile">
          <p className="k">Caretaker</p>
          <p className="v">{tasks.filter((t) => t.type === "caretaker").length}</p>
          <p className="s">arrivals</p>
        </div>
      </div>

      <CustomTasks />

      {todayTasks.length > 0 && (
        <div className="panel">
          <h2>
            Due today <span className="hint">{todayTasks.length} tasks</span>
          </h2>
          {todayTasks.map((t) => (
            <div className="row" key={t.id}>
              <span
                className="stripe"
                style={{
                  background:
                    t.type === "housekeeping" ? "var(--warn)" : "var(--accent)",
                }}
              />
              <span style={{ flex: 1 }}>
                <p className="who">{t.title}</p>
                <p className="sub">
                  {t.unitLabel} &middot; {t.guest || "(no guest)"}
                </p>
              </span>
              <span className={`task-badge ${t.type}`}>{t.type}</span>
            </div>
          ))}
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className="panel">
          <h2>
            Tomorrow <span className="hint">{upcomingTasks.length} tasks</span>
          </h2>
          {upcomingTasks.map((t) => (
            <div className="row" key={t.id}>
              <span
                className="stripe"
                style={{
                  background:
                    t.type === "housekeeping" ? "var(--warn)" : "var(--accent)",
                }}
              />
              <span style={{ flex: 1 }}>
                <p className="who">{t.title}</p>
                <p className="sub">
                  {t.unitLabel} &middot; {t.guest || "(no guest)"}
                </p>
              </span>
              <span className={`task-badge ${t.type}`}>{t.type}</span>
            </div>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-2)" }}>
            No auto-generated tasks today or tomorrow. Click &ldquo;+ New Task&rdquo; above to add custom tasks with instructions for staff.
          </p>
        </div>
      )}
    </>
  );
}
