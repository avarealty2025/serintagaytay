import { NextResponse } from "next/server";
import { getGuests } from "../../../src/data/db.ts";

export async function GET() {
  const guests = await getGuests();
  return NextResponse.json(guests);
}
