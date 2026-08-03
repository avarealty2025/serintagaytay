import { NextRequest, NextResponse } from "next/server";
import { getDbSettings, saveDbSettings } from "../../../../src/data/db.ts";
import type { StaffTask } from "../route.ts";

async function loadTasks(): Promise<StaffTask[]> {
  const settings = await getDbSettings();
  if (!settings || !settings.staff_tasks) return [];
  return settings.staff_tasks as StaffTask[];
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const tasks = await loadTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = tasks[idx]!;
  if (body.title !== undefined) task.title = body.title;
  if (body.instructions !== undefined) task.instructions = body.instructions;
  if (body.status !== undefined) task.status = body.status;
  if (body.dueDate !== undefined) task.dueDate = body.dueDate;
  if (body.priority !== undefined) task.priority = body.priority;
  if (body.unitId !== undefined) task.unitId = body.unitId;
  if (body.unitLabel !== undefined) task.unitLabel = body.unitLabel;
  if (body.assignedTo !== undefined) task.assignedTo = body.assignedTo;
  if (body.assignedName !== undefined) task.assignedName = body.assignedName;
  if (body.recurrence !== undefined) task.recurrence = body.recurrence;
  tasks[idx] = task;

  const result = await saveDbSettings("staff_tasks", tasks);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tasks = await loadTasks();
  const filtered = tasks.filter((t) => t.id !== id);

  if (filtered.length === tasks.length) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const result = await saveDbSettings("staff_tasks", filtered);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
