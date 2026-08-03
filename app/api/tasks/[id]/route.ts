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

  if (body.title !== undefined) tasks[idx].title = body.title;
  if (body.instructions !== undefined) tasks[idx].instructions = body.instructions;
  if (body.status !== undefined) tasks[idx].status = body.status;
  if (body.dueDate !== undefined) tasks[idx].dueDate = body.dueDate;
  if (body.priority !== undefined) tasks[idx].priority = body.priority;
  if (body.unitId !== undefined) tasks[idx].unitId = body.unitId;
  if (body.unitLabel !== undefined) tasks[idx].unitLabel = body.unitLabel;
  if (body.assignedTo !== undefined) tasks[idx].assignedTo = body.assignedTo;
  if (body.assignedName !== undefined) tasks[idx].assignedName = body.assignedName;
  if (body.recurrence !== undefined) tasks[idx].recurrence = body.recurrence;

  const result = await saveDbSettings("staff_tasks", tasks);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ task: tasks[idx] });
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
