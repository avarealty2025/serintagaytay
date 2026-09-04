import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";
import { getUnitIdMap } from "../../../src/data/db.ts";

const VALID_CATEGORIES = ["deep_clean", "repair", "change_replace", "dispose"];
const VALID_STATUSES = ["pending", "in_progress", "done", "checked"];
const CATEGORY_LABELS: Record<string, string> = {
  deep_clean: "Deep Clean", repair: "Repair",
  change_replace: "Change/Replace", dispose: "Dispose",
};

async function notifyStaff(staffName: string, title: string, message: string, link: string) {
  if (!isSupabaseConfigured) return;
  try {
    const sb = getSupabaseAdmin();
    const { data: users } = await sb.from("users").select("id").ilike("name", `%${staffName}%`).limit(1);
    await sb.from("notifications").insert({
      user_id: users?.[0]?.id ?? null,
      staff_name: staffName,
      title,
      message,
      type: "task",
      link,
    });
  } catch { /* best effort */ }
}

async function resolveUnitUuid(appId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const idMap = await getUnitIdMap();
  return idMap.get(appId) ?? null;
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const unitId = req.nextUrl.searchParams.get("unitId");
  const status = req.nextUrl.searchParams.get("status");
  const assignedTo = req.nextUrl.searchParams.get("assignedTo");
  const summary = req.nextUrl.searchParams.get("summary");

  const sb = getSupabaseAdmin();

  if (summary === "1") {
    const { data, error } = await sb
      .from("unit_tasks")
      .select("unit_id, status")
      .in("status", ["pending", "in_progress"]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const idMap = await getUnitIdMap();
    const counts: Record<string, { pending: number; in_progress: number }> = {};
    for (const row of data ?? []) {
      const uuid = row.unit_id as string;
      const appId = idMap.get(uuid) ?? uuid;
      if (!counts[appId]) counts[appId] = { pending: 0, in_progress: 0 };
      const s = row.status as string;
      if (s === "pending") counts[appId]!.pending++;
      else if (s === "in_progress") counts[appId]!.in_progress++;
    }
    return NextResponse.json({ counts });
  }

  let query = sb.from("unit_tasks").select("*").order("created_at", { ascending: false });

  if (unitId) {
    const uuid = await resolveUnitUuid(unitId);
    if (!uuid) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    query = query.eq("unit_id", uuid);
  }
  if (status) query = query.eq("status", status);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const body = await req.json();
  const { unitId, tasks } = body;

  if (!unitId) return NextResponse.json({ error: "unitId required" }, { status: 400 });

  const uuid = await resolveUnitUuid(unitId);
  if (!uuid) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const items = Array.isArray(tasks) ? tasks : [body];
  const rows = items.map((t: Record<string, unknown>) => ({
    unit_id: uuid,
    category: VALID_CATEGORIES.includes(t.category as string) ? t.category : "deep_clean",
    description: String(t.description || "").trim(),
    assigned_to: t.assignedTo ? String(t.assignedTo).trim() : null,
    status: "pending",
    priority: t.priority === "high" ? "high" : "normal",
    notes: t.notes ? String(t.notes).trim() : null,
  })).filter((r) => r.description.length > 0);

  if (rows.length === 0) return NextResponse.json({ error: "No valid tasks" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("unit_tasks").insert(rows).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const row of rows) {
    if (row.assigned_to) {
      const cat = CATEGORY_LABELS[row.category as string] ?? row.category;
      notifyStaff(
        row.assigned_to as string,
        `New task assigned: ${cat}`,
        `${row.description} (${unitId})`,
        `/admin/maintenance/${unitId}`,
      );
    }
  }

  return NextResponse.json({ created: data?.length ?? 0 });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const body = await req.json();
  const { id, status, assignedTo, description, category, notes, priority } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status && VALID_STATUSES.includes(status)) {
    updates.status = status;
    if (status === "done") updates.accomplished_at = new Date().toISOString();
    if (status === "checked") updates.checked_at = new Date().toISOString();
  }
  if (assignedTo !== undefined) updates.assigned_to = assignedTo || null;
  if (description) updates.description = String(description).trim();
  if (category && VALID_CATEGORIES.includes(category)) updates.category = category;
  if (notes !== undefined) updates.notes = notes || null;
  if (priority) updates.priority = priority === "high" ? "high" : "normal";
  if (body.checkedBy) updates.checked_by = body.checkedBy;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: before } = await sb.from("unit_tasks").select("assigned_to, description, category, unit_id").eq("id", id).single();

  const { error } = await sb.from("unit_tasks").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (assignedTo && assignedTo !== before?.assigned_to) {
    const idMap = await getUnitIdMap();
    const appId = idMap.get(before?.unit_id) ?? "unit";
    const cat = CATEGORY_LABELS[before?.category] ?? before?.category ?? "Task";
    notifyStaff(
      assignedTo,
      `Task assigned to you: ${cat}`,
      `${before?.description ?? description ?? "Task"} (${appId})`,
      `/admin/maintenance/${appId}`,
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("unit_tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
