import { NextRequest, NextResponse } from "next/server";
import { getGuest, updateGuest, logAudit } from "../../../../src/data/db.ts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guest = await getGuest(id);
  if (!guest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(guest);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { error } = await updateGuest(id, body);
  if (error) return NextResponse.json({ error }, { status: 500 });
  await logAudit({ entity: "guest", entityId: id, action: "update", after: body });
  return NextResponse.json({ ok: true });
}
