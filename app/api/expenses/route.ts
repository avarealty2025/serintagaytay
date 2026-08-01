import { NextRequest, NextResponse } from "next/server";
import { getExpenses, createExpense, updateExpense, deleteExpense, logAudit } from "../../../src/data/db.ts";

export async function GET() {
  const expenses = await getExpenses();
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, amount, date, vendor, notes, unitId } = body;
  if (!category || !amount || !date) {
    return NextResponse.json({ error: "category, amount, and date are required" }, { status: 400 });
  }
  const result = await createExpense({ category, amount: Number(amount), date, vendor, notes, unitId });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  await logAudit({ entity: "expenses", entityId: result.id!, action: "insert", after: body });
  return NextResponse.json({ id: result.id });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (data.amount !== undefined) data.amount = Number(data.amount);
  const result = await updateExpense(id, data);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  await logAudit({ entity: "expenses", entityId: id, action: "update", after: data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const result = await deleteExpense(id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  await logAudit({ entity: "expenses", entityId: id, action: "delete" });
  return NextResponse.json({ ok: true });
}
