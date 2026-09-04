import { NextRequest, NextResponse } from "next/server";
import { getBookings, getExpenses, getDbSettings } from "../../../../src/data/db.ts";
import { UNITS } from "../../../../src/data/units.ts";
import { nightsBetween } from "../../../../src/lib/dates.ts";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../../src/lib/supabase.ts";

export const dynamic = "force-dynamic";

async function isOwner(req: NextRequest): Promise<boolean> {
  const userId = req.cookies.get("serin_admin")?.value;
  if (!userId || userId === "1") return true;
  if (!isSupabaseConfigured) return true;
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("users").select("role").eq("id", userId).single();
    return data?.role === "owner" || data?.role === "super_admin";
  } catch { return true; }
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDateRange(period: string, dateParam: string, currentMonth: string) {
  const now = new Date();
  if (period === "quarterly") {
    let year: number, quarter: number;
    if (dateParam && dateParam.includes("-Q")) {
      year = Number(dateParam.split("-Q")[0]);
      quarter = Number(dateParam.split("-Q")[1]);
    } else {
      year = now.getFullYear();
      quarter = Math.ceil((now.getMonth() + 1) / 3);
    }
    const startM = (quarter - 1) * 3 + 1;
    const startMonth = `${year}-${String(startM).padStart(2, "0")}`;
    const endM = startM + 3;
    const endYear = endM > 12 ? year + 1 : year;
    const endMAdj = endM > 12 ? endM - 12 : endM;
    const endMonth = `${endYear}-${String(endMAdj).padStart(2, "0")}`;
    return { startMonth, endMonth, numMonths: 3, label: `Q${quarter} ${year}`, dateKey: `${year}-Q${quarter}` };
  }
  if (period === "yearly") {
    const year = dateParam ? Number(dateParam) : now.getFullYear();
    return { startMonth: `${year}-01`, endMonth: `${year + 1}-01`, numMonths: 12, label: `${year}`, dateKey: `${year}` };
  }
  const month = dateParam || currentMonth;
  const parts = month.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  return {
    startMonth: month,
    endMonth: `${nextY}-${String(nextM).padStart(2, "0")}`,
    numMonths: 1,
    label: `${MONTH_NAMES[m - 1]} ${y}`,
    dateKey: month,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "monthly";
  const dateParam = url.searchParams.get("date") || "";

  const [{ bookings }, expenses, settings] = await Promise.all([
    getBookings(),
    getExpenses(),
    getDbSettings(),
  ]);

  const active = UNITS.filter((u) => u.active);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const range = getDateRange(period, dateParam, currentMonth);

  const allDataMonths = new Set<string>();
  for (const b of bookings) allDataMonths.add(b.checkIn.slice(0, 7));
  for (const e of expenses) allDataMonths.add(e.date.slice(0, 7));

  const filteredBookings = bookings.filter(b => {
    const m = b.checkIn.slice(0, 7);
    return m >= range.startMonth && m < range.endMonth;
  });
  const filteredExpenses = expenses.filter(e => {
    const m = e.date.slice(0, 7);
    return m >= range.startMonth && m < range.endMonth;
  });

  const numMonths = range.numMonths;

  const unitData: Record<string, {
    unitId: string;
    code: string;
    name: string;
    building: string;
    type: string;
    revenue: number;
    revenueThisMonth: number;
    expenses: number;
    expensesThisMonth: number;
    bookingCount: number;
    nights: number;
    nightsThisMonth: number;
    revenueBySource: Record<string, number>;
    expensesByCategory: Record<string, number>;
    monthlyRevenue: Record<string, number>;
    monthlyExpenses: Record<string, number>;
    ownerTarget: number;
    ownerTargetType: string;
    fixedMonthly: { label: string; amount: number }[];
    fixedMonthlyTotal: number;
    unitMode: string;
    mgmtFeePercent: number;
    cleaningFeePerBooking: number;
    pmFeeIncome: number;
    cleaningExpense: number;
    totalPmIncome: number;
    utilitiesPct: number;
    utilitiesExpense: number;
    parkingRevenue: number;
  }> = {};

  for (const u of active) {
    const targetKey = `owner_target:${u.id}`;
    const target = settings?.[targetKey] as { amount?: number; type?: string } | undefined;
    const fixedKey = `fixed_expenses:${u.id}`;
    const fixed = (settings?.[fixedKey] ?? []) as { label: string; amount: number }[];
    const fixedTotal = fixed.reduce((s, f) => s + (f.amount || 0), 0);
    const modeKey = `unit_mode:${u.id}`;
    const unitMode = (settings?.[modeKey] as string) || "rented";
    const mgmtKey = `mgmt_fee:${u.id}`;
    const mgmtFeePercent = Number(settings?.[mgmtKey] ?? 10);
    const cleanKey = `cleaning_fee_pnl:${u.id}`;
    const cleaningFeePerBooking = Number(settings?.[cleanKey] ?? 0);
    const utilKey = `utilities_pct:${u.id}`;
    const utilitiesPct = Number(settings?.[utilKey] ?? 30);
    unitData[u.id] = {
      unitId: u.id,
      code: `${u.tower}-${u.code}`,
      name: u.name || `${u.tower}-${u.code}`,
      building: u.buildingId === "west" ? "West" : "East",
      type: u.type,
      revenue: 0, revenueThisMonth: 0,
      expenses: 0, expensesThisMonth: 0,
      bookingCount: 0, nights: 0, nightsThisMonth: 0,
      revenueBySource: {}, expensesByCategory: {},
      monthlyRevenue: {}, monthlyExpenses: {},
      ownerTarget: target?.amount ?? 0,
      ownerTargetType: target?.type ?? "peso",
      fixedMonthly: fixed, fixedMonthlyTotal: fixedTotal,
      unitMode, mgmtFeePercent, cleaningFeePerBooking,
      pmFeeIncome: 0, cleaningExpense: 0, totalPmIncome: 0,
      utilitiesPct, utilitiesExpense: 0,
      parkingRevenue: 0,
    };
  }

  for (const b of filteredBookings) {
    const ud = unitData[b.unitId];
    if (!ud) continue;
    let nights = 0;
    try { nights = nightsBetween(b.checkIn, b.checkOut); } catch { continue; }
    if (nights <= 0) continue;

    const parkingFee = b.parkingFee || 0;
    const parkingTotal = parkingFee > 0
      ? (b.parkingFeeType === "per_night" ? parkingFee * nights : parkingFee)
      : 0;
    const rev = b.grossAmount > 0 ? b.grossAmount - parkingTotal : 0;
    const month = b.checkIn.slice(0, 7);
    const src = b.source || "unknown";

    ud.revenue += rev;
    ud.parkingRevenue += parkingTotal;
    ud.bookingCount++;
    ud.nights += nights;
    ud.revenueBySource[src] = (ud.revenueBySource[src] ?? 0) + rev;
    ud.monthlyRevenue[month] = (ud.monthlyRevenue[month] ?? 0) + rev;

    if (month === currentMonth) {
      ud.revenueThisMonth += rev;
      ud.nightsThisMonth += nights;
    }
  }

  let sharedExpenses = 0;
  for (const e of filteredExpenses) {
    if (!e.unitId) {
      sharedExpenses += e.amount;
      continue;
    }
    const ud = unitData[e.unitId];
    if (!ud) continue;
    const month = e.date.slice(0, 7);

    ud.expenses += e.amount;
    ud.expensesByCategory[e.category] = (ud.expensesByCategory[e.category] ?? 0) + e.amount;
    ud.monthlyExpenses[month] = (ud.monthlyExpenses[month] ?? 0) + e.amount;

    if (month === currentMonth) {
      ud.expensesThisMonth += e.amount;
    }
  }

  if (sharedExpenses > 0 && active.length > 0) {
    const perUnit = sharedExpenses / active.length;
    for (const ud of Object.values(unitData)) {
      ud.expenses += perUnit;
    }
  }

  for (const ud of Object.values(unitData)) {
    if (ud.fixedMonthlyTotal > 0) {
      ud.expenses += ud.fixedMonthlyTotal * numMonths;
    }
    ud.utilitiesExpense = Math.round(ud.revenue * (ud.utilitiesPct / 100));
    ud.expenses += ud.utilitiesExpense;
    ud.pmFeeIncome = Math.round(ud.revenue * (ud.mgmtFeePercent / 100));
    ud.cleaningExpense = ud.cleaningFeePerBooking * ud.bookingCount;
    ud.totalPmIncome = ud.pmFeeIncome;
    ud.expenses += ud.cleaningExpense;
  }

  const totalRevenue = Object.values(unitData).reduce((s, u) => s + u.revenue, 0);
  const totalParkingRevenue = Object.values(unitData).reduce((s, u) => s + u.parkingRevenue, 0);
  const totalExpenses = Object.values(unitData).reduce((s, u) => s + u.expenses, 0);

  const revenueBySource: Record<string, number> = {};
  for (const ud of Object.values(unitData)) {
    for (const [src, rev] of Object.entries(ud.revenueBySource)) {
      revenueBySource[src] = (revenueBySource[src] ?? 0) + rev;
    }
  }

  const canEdit = await isOwner(req);
  const availableYears = [...new Set([...allDataMonths].map(m => Number(m.split("-")[0])))].sort();

  return NextResponse.json({
    canEdit,
    units: Object.values(unitData).sort((a, b) => b.revenue - a.revenue),
    summary: {
      totalRevenue,
      totalParkingRevenue,
      totalExpenses,
      netProfit: totalRevenue + totalParkingRevenue - totalExpenses,
      margin: (totalRevenue + totalParkingRevenue) > 0 ? Math.round((((totalRevenue + totalParkingRevenue) - totalExpenses) / (totalRevenue + totalParkingRevenue)) * 100) : 0,
      totalUnits: active.length,
      totalBookings: filteredBookings.length,
    },
    revenueBySource,
    months: [...allDataMonths].sort(),
    currentMonth,
    numMonths,
    period,
    periodDate: range.dateKey,
    periodLabel: range.label,
    availableYears,
  });
}
