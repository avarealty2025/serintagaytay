import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings } from "../../../src/data/db.ts";

export interface StaffTask {
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

async function loadTasks(): Promise<StaffTask[]> {
  const settings = await getDbSettings();
  if (!settings || !settings.staff_tasks) return [];
  return settings.staff_tasks as StaffTask[];
}

export async function GET() {
  const tasks = await loadTasks();
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, instructions, unitId, unitLabel, dueDate, priority, assignedTo, assignedName, recurrence } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const tasks = await loadTasks();

  const newTask: StaffTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim(),
    instructions: (instructions || "").trim(),
    unitId: unitId || null,
    unitLabel: unitLabel || null,
    assignedTo: assignedTo || null,
    assignedName: assignedName || null,
    recurrence: recurrence || "once",
    dueDate: dueDate || new Date().toISOString().slice(0, 10),
    type: "custom",
    status: "todo",
    priority: priority ?? 1,
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  const result = await saveDbSettings("staff_tasks", tasks);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ task: newTask });
}
