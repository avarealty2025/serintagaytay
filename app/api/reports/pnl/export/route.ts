import { NextRequest, NextResponse } from "next/server";
import { getBookings, getExpenses, getDbSettings, getUnits } from "../../../../../src/data/db.ts";
import { nightsBetween } from "../../../../../src/lib/dates.ts";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string): string {
  const parts = d.split("-");
  const m = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  return `${MONTH_NAMES[m]}-${day}`;
}

function getDateRange(period: string, dateParam: string) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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
    return { startMonth, endMonth, label: `Q${quarter} ${year}` };
  }
  if (period === "yearly") {
    const year = dateParam ? Number(dateParam) : now.getFullYear();
    return { startMonth: `${year}-01`, endMonth: `${year + 1}-01`, label: `${year}` };
  }
  const month = dateParam || currentMonth;
  const parts = month.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return {
    startMonth: month,
    endMonth: `${nextY}-${String(nextM).padStart(2, "0")}`,
    label: `${FULL_MONTHS[m - 1]} ${y}`,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const unitId = url.searchParams.get("unit") || "";
  const period = url.searchParams.get("period") || "monthly";
  const dateParam = url.searchParams.get("date") || "";

  if (!unitId) {
    return NextResponse.json({ error: "unit param required" }, { status: 400 });
  }

  const [{ bookings }, expenses, settings, allUnits] = await Promise.all([
    getBookings(),
    getExpenses(),
    getDbSettings(),
    getUnits(),
  ]);

  const unit = allUnits.find((u) => u.id === unitId);
  if (!unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  const range = getDateRange(period, dateParam);

  const unitBookings = bookings
    .filter((b) => {
      if (b.unitId !== unitId) return false;
      const m = b.checkIn.slice(0, 7);
      return m >= range.startMonth && m < range.endMonth;
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const unitExpenses = expenses.filter((e) => {
    if (e.unitId !== unitId) return false;
    const m = e.date.slice(0, 7);
    return m >= range.startMonth && m < range.endMonth;
  });

  const mgmtKey = `mgmt_fee:${unitId}`;
  const mgmtFeePercent = Number(settings?.[mgmtKey] ?? 10);
  const cleanKey = `cleaning_fee_pnl:${unitId}`;
  const cleaningFeePerBooking = Number(settings?.[cleanKey] ?? 0);

  const buildingLabel = unit.buildingId === "west" ? "SERIN WEST" : "SERIN EAST";
  const unitTitle = `UNIT ${unit.code} TOWER ${unit.tower} ${buildingLabel} TAGAYTAY`;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(unitTitle.length > 31 ? `${unit.tower}-${unit.code} ${buildingLabel.split(" ")[1]}` : unitTitle);

  const peso = '#,##0.00';

  // Title row
  ws.mergeCells("A1:E1");
  const titleCell = ws.getCell("A1");
  titleCell.value = unitTitle;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };

  // Period subtitle
  ws.mergeCells("A2:E2");
  const periodCell = ws.getCell("A2");
  periodCell.value = range.label;
  periodCell.font = { bold: true, size: 11, color: { argb: "FF666666" } };
  periodCell.alignment = { horizontal: "center" };

  // Header row
  const headerRow = ws.getRow(4);
  headerRow.values = ["DATE", "RATE", "PM FEE", "C & L", "TOTAL NET", "", "EXPENSES:"];
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.border = { bottom: { style: "thin" } };
  });

  // Column widths
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 4;
  ws.getColumn(7).width = 12;
  ws.getColumn(8).width = 25;

  // Booking rows
  let row = 5;
  let totalRate = 0;
  let totalPmFee = 0;
  let totalCL = 0;
  let totalNet = 0;

  for (const b of unitBookings) {
    let nights = 0;
    try { nights = nightsBetween(b.checkIn, b.checkOut); } catch { continue; }
    if (nights <= 0) continue;

    const rate = b.grossAmount;
    const pmFee = Math.round(rate * (mgmtFeePercent / 100));
    const cl = cleaningFeePerBooking;
    const net = rate - pmFee - cl;

    totalRate += rate;
    totalPmFee += pmFee;
    totalCL += cl;
    totalNet += net;

    const r = ws.getRow(row);
    r.values = [fmtDate(b.checkIn), rate, pmFee, cl, net];
    r.getCell(2).numFmt = peso;
    r.getCell(3).numFmt = peso;
    r.getCell(4).numFmt = peso;
    r.getCell(5).numFmt = peso;
    row++;
  }

  // Expenses on the right side (starting from row 5)
  let expRow = 5;
  let totalExpenseAmt = 0;
  for (const e of unitExpenses) {
    ws.getCell(expRow, 7).value = e.amount;
    ws.getCell(expRow, 7).numFmt = peso;
    ws.getCell(expRow, 8).value = (e.vendor ? `${e.vendor} - ` : "") + e.category.toUpperCase();
    totalExpenseAmt += e.amount;
    expRow++;
  }

  // Totals section (after bookings)
  row++;
  const totalsRow = ws.getRow(row);
  totalsRow.getCell(5).value = totalNet;
  totalsRow.getCell(5).numFmt = peso;
  totalsRow.getCell(5).font = { bold: true };
  totalsRow.getCell(5).border = { top: { style: "thin" } };
  row++;

  // Expenses total
  const expTotalRow = ws.getRow(row);
  expTotalRow.getCell(5).value = totalExpenseAmt;
  expTotalRow.getCell(5).numFmt = peso;
  expTotalRow.getCell(5).font = { bold: true, color: { argb: "FFCC0000" } };
  expTotalRow.getCell(6).value = "expenses";
  row++;

  // To remit
  const toRemit = totalNet - totalExpenseAmt;
  const remitRow = ws.getRow(row);
  remitRow.getCell(5).value = toRemit;
  remitRow.getCell(5).numFmt = peso;
  remitRow.getCell(5).font = { bold: true, color: { argb: "FF0066CC" }, size: 12 };
  remitRow.getCell(5).border = { top: { style: "thin" } };
  remitRow.getCell(6).value = "to remit";
  remitRow.getCell(6).font = { bold: true };

  // Expense total on right
  const expTotalRightRow = Math.max(expRow, row);
  ws.getCell(expTotalRightRow + 1, 7).value = totalExpenseAmt;
  ws.getCell(expTotalRightRow + 1, 7).numFmt = peso;
  ws.getCell(expTotalRightRow + 1, 7).font = { bold: true, color: { argb: "FFCC0000" } };
  ws.getCell(expTotalRightRow + 1, 7).border = { top: { style: "thin" } };

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `${unit.tower}-${unit.code}_${buildingLabel.replace(" ", "_")}_${range.label.replace(/ /g, "_")}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
