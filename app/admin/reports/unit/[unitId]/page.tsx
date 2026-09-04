"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guest: string;
  guests: number;
  source: string | null;
  grossAmount: number;
  amountPaid: number;
  parkingFee: number;
  parkingFeeType: string;
  parkingSlot: string | null;
  notes: string | null;
}

interface Expense {
  id: string;
  unitId: string | null;
  category: string;
  amount: number;
  date: string;
  vendor: string | null;
  notes: string | null;
}

interface UnitInfo {
  id: string;
  tower: number;
  code: string;
  buildingId: string;
  name?: string;
  type: string;
}

interface PnlUnit {
  unitId: string;
  revenue: number;
  expenses: number;
  bookingCount: number;
  nights: number;
  revenueBySource: Record<string, number>;
  expensesByCategory: Record<string, number>;
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
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function nightsBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct", airbnb: "Airbnb", "booking.com": "Booking.com",
  agoda: "Agoda", facebook: "Facebook", manual: "Manual", block: "Blocked", unknown: "Other",
};

const SOURCE_COLORS: Record<string, string> = {
  direct: "#2f5a1e", airbnb: "#c4614a", "booking.com": "#003580",
  agoda: "#4a6fa5", facebook: "#8a5aa0", manual: "#7f8c8d", block: "#8a8f7c", unknown: "#95a5a6",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending", confirmed: "Confirmed", checked_in: "Checked In",
  checked_out: "Checked Out", cancelled: "Cancelled", no_show: "No Show", blocked: "Blocked",
};

const EXPENSE_CATEGORIES = [
  "Condo Dues", "Electricity", "Water", "Internet/Wi-Fi", "Cable/Netflix",
  "Parking Rental", "Insurance", "Cleaning", "Laundry", "Maintenance",
  "Supplies", "Repairs", "Marketing", "Commissions", "Other",
];

function DonutChart({ segments, size = 180, label, sublabel }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  label: string;
  sublabel?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: "0.8rem" }}>No data</div>;

  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  let currentAngle = -90;

  const paths = segments.filter(s => s.value > 0).map((seg) => {
    const pct = seg.value / total;
    const angle = pct * 360;
    const startRad = (currentAngle * Math.PI) / 180;
    const endRad = ((currentAngle + angle) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = angle > 180 ? 1 : 0;
    currentAngle += angle;

    if (pct >= 0.999) {
      return <circle key={seg.label} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={28} />;
    }

    return (
      <path
        key={seg.label}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={seg.color}
        strokeWidth={28}
        strokeLinecap="butt"
      />
    );
  });

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {paths}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{label}</span>
        {sublabel && <span style={{ fontSize: "0.68rem", color: "var(--text-3)" }}>{sublabel}</span>}
      </div>
    </div>
  );
}

function BarChart({ items, maxVal }: {
  items: { label: string; revenue: number; expenses: number }[];
  maxVal: number;
}) {
  if (items.length === 0) return null;
  const barMax = maxVal || 1;

  return (
    <div style={{ display: "flex", gap: "0.35rem", alignItems: "flex-end", height: 140, padding: "0 0.25rem" }}>
      {items.map((item) => (
        <div key={item.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 110, width: "100%" }}>
            <div style={{
              flex: 1,
              height: `${Math.max(2, (item.revenue / barMax) * 100)}%`,
              background: "var(--good, #27ae60)",
              borderRadius: "2px 2px 0 0",
              minHeight: 2,
            }} title={`Revenue: ${fmt(item.revenue)}`} />
            <div style={{
              flex: 1,
              height: `${Math.max(2, (item.expenses / barMax) * 100)}%`,
              background: "var(--crit, #c0392b)",
              borderRadius: "2px 2px 0 0",
              minHeight: 2,
            }} title={`Expenses: ${fmt(item.expenses)}`} />
          </div>
          <span style={{ fontSize: "0.58rem", color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function HorizBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
      <span style={{ width: "5.5rem", fontSize: "0.72rem", color: "var(--text-2)", textAlign: "right", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 16, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ width: "5rem", fontSize: "0.72rem", fontFamily: "var(--mono)", fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{fmt(value)}</span>
    </div>
  );
}

export default function UnitReportPage() {
  const params = useParams();
  const unitId = params.unitId as string;

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [pnl, setPnl] = useState<PnlUnit | null>(null);
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pnl" | "bookings" | "expenses">("pnl");

  // Period navigation
  const now = new Date();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [currentMonth, setCurrentMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function navMonth(dir: number) {
    const parts = currentMonth.split("-").map(Number);
    let nm = parts[1]! + dir;
    let ny = parts[0]!;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setCurrentMonth(`${ny}-${String(nm).padStart(2, "0")}`);
  }

  const periodLabel = period === "monthly"
    ? `${MONTH_NAMES[Number(currentMonth.split("-")[1]) - 1]} ${currentMonth.split("-")[0]}`
    : `${currentYear}`;

  const pnlDateParam = period === "monthly" ? currentMonth : String(currentYear);

  // Expense form
  const [showExpForm, setShowExpForm] = useState(false);
  const [expCategory, setExpCategory] = useState("Cleaning");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expVendor, setExpVendor] = useState("");
  const [expNotes, setExpNotes] = useState("");
  const [expSaving, setExpSaving] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, expensesRes, pnlRes, unitsRes] = await Promise.all([
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/expenses").then((r) => r.json()),
        fetch(`/api/reports/pnl?period=${period}&date=${pnlDateParam}`).then((r) => r.json()),
        fetch("/api/units").then((r) => r.json()).catch(() => null),
      ]);

      const unitBookings = (bookingsRes.bookings || [])
        .filter((b: Booking) => b.unitId === unitId)
        .sort((a: Booking, b: Booking) => b.checkIn.localeCompare(a.checkIn));
      setAllBookings(unitBookings);

      const unitExpenses = (expensesRes || []).filter((e: Expense) => e.unitId === unitId);
      setAllExpenses(unitExpenses);

      const unitPnl = (pnlRes.units || []).find((u: PnlUnit) => u.unitId === unitId);
      setPnl(unitPnl || null);

      if (unitsRes) {
        const u = (Array.isArray(unitsRes) ? unitsRes : unitsRes.units || []).find((u: UnitInfo) => u.id === unitId);
        setUnit(u || null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [unitId, period, pnlDateParam]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveExpense() {
    setExpSaving(true);
    try {
      if (editingExpId) {
        await fetch("/api/expenses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingExpId, category: expCategory, amount: Number(expAmount), date: expDate, vendor: expVendor, notes: expNotes, unitId }),
        });
      } else {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: expCategory, amount: Number(expAmount), date: expDate, vendor: expVendor, notes: expNotes, unitId }),
        });
      }
      setShowExpForm(false);
      setEditingExpId(null);
      setExpCategory("Cleaning");
      setExpAmount("");
      setExpVendor("");
      setExpNotes("");
      fetchData();
    } catch { /* ignore */ }
    setExpSaving(false);
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  function startEditExpense(e: Expense) {
    setEditingExpId(e.id);
    setExpCategory(e.category);
    setExpAmount(String(e.amount));
    setExpDate(e.date);
    setExpVendor(e.vendor || "");
    setExpNotes(e.notes || "");
    setShowExpForm(true);
  }

  if (loading) {
    return <div className="page-head"><h1 className="today">Loading...</h1></div>;
  }

  const unitCode = unit ? `${unit.tower}-${unit.code}` : unitId;
  const building = unit?.buildingId === "east" ? "East" : "West";
  const typeLbl = unit?.type === "exec_studio" ? "Exec Studio" : unit?.type === "1br" ? "1 BR" : unit?.type === "2br" ? "2 BR" : "Studio";

  // Filter bookings & expenses by selected period
  const bookings = period === "monthly"
    ? allBookings.filter((b) => b.checkIn.startsWith(currentMonth))
    : allBookings.filter((b) => b.checkIn.startsWith(String(currentYear)));
  const expenses = period === "monthly"
    ? allExpenses.filter((e) => e.date.startsWith(currentMonth))
    : allExpenses.filter((e) => e.date.startsWith(String(currentYear)));

  // Compute P&L numbers
  const totalRevenue = pnl?.revenue || 0;
  const totalParking = pnl?.parkingRevenue || 0;
  const totalExpenses = pnl?.expenses || 0;
  const netProfit = totalRevenue + totalParking - totalExpenses;
  const totalIncome = totalRevenue + totalParking;
  const margin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
  const totalNights = pnl?.nights || 0;
  const totalBookings = pnl?.bookingCount || 0;
  const avgNightly = totalNights > 0 ? totalRevenue / totalNights : 0;

  // Revenue by source for chart
  const sourceEntries = Object.entries(pnl?.revenueBySource || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxSourceRev = sourceEntries.length > 0 ? sourceEntries[0]![1] : 0;

  // Expense breakdown
  const expByCategory = pnl?.expensesByCategory || {};
  const fixedExpenses = pnl?.fixedMonthly || [];
  const cleaningExp = pnl?.cleaningExpense || 0;
  const utilitiesExp = pnl?.utilitiesExpense || 0;

  // Monthly data for bar chart
  const monthlyData: { label: string; revenue: number; expenses: number }[] = [];
  const allMonths = new Set<string>();
  for (const b of bookings) allMonths.add(b.checkIn.slice(0, 7));
  for (const e of expenses) allMonths.add(e.date.slice(0, 7));
  const sortedMonths = [...allMonths].sort().slice(-12);
  for (const m of sortedMonths) {
    const rev = bookings
      .filter((b) => b.checkIn.slice(0, 7) === m && b.grossAmount > 0)
      .reduce((s, b) => s + b.grossAmount, 0);
    const exp = expenses
      .filter((e) => e.date.slice(0, 7) === m)
      .reduce((s, e) => s + e.amount, 0);
    const parts = m.split("-");
    const shortLabel = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(parts[1]) - 1];
    monthlyData.push({ label: shortLabel || m, revenue: rev, expenses: exp });
  }
  const barMax = Math.max(...monthlyData.map((d) => Math.max(d.revenue, d.expenses)), 1);

  // Donut segments
  const donutSegments = [
    { value: totalRevenue, color: "var(--good, #27ae60)", label: "Revenue" },
    { value: totalParking, color: "#3498db", label: "Parking" },
    { value: totalExpenses, color: "var(--crit, #c0392b)", label: "Expenses" },
  ];

  // Group bookings by month
  const byMonth = new Map<string, Booking[]>();
  for (const b of bookings) {
    const m = b.checkIn.slice(0, 7);
    const list = byMonth.get(m) ?? [];
    list.push(b);
    byMonth.set(m, list);
  }
  const bookingMonths = [...byMonth.keys()].sort().reverse();

  const tabStyle = (t: string) => ({
    padding: "0.5rem 1.25rem",
    fontSize: "0.82rem",
    fontWeight: activeTab === t ? 700 : 400,
    color: activeTab === t ? "#fff" : "var(--text-2)",
    background: activeTab === t ? "var(--accent)" : "transparent",
    border: activeTab === t ? "none" : "1px solid var(--line)",
    borderRadius: 6,
    cursor: "pointer" as const,
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">
            <span style={{ fontFamily: "var(--mono)", marginRight: "0.5rem" }}>{unitCode}</span>
            {unit?.name && <span style={{ fontWeight: 400, color: "var(--text-2)" }}>{unit.name}</span>}
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--text-3)" }}>
            {building} &middot; {typeLbl} &middot;{" "}
            <Link href="/admin/reports" style={{ color: "var(--accent)" }}>Back to Reports</Link>
          </p>
        </div>
      </div>

      {/* Period navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            onClick={() => setPeriod("monthly")}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem", fontWeight: period === "monthly" ? 700 : 400, color: period === "monthly" ? "#fff" : "var(--text-2)", background: period === "monthly" ? "var(--accent)" : "var(--surface)", border: "1px solid var(--line)", borderRadius: "4px 0 0 4px", cursor: "pointer" }}
          >Monthly</button>
          <button
            onClick={() => setPeriod("yearly")}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem", fontWeight: period === "yearly" ? 700 : 400, color: period === "yearly" ? "#fff" : "var(--text-2)", background: period === "yearly" ? "var(--accent)" : "var(--surface)", border: "1px solid var(--line)", borderRadius: "0 4px 4px 0", cursor: "pointer" }}
          >Yearly</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <button
            onClick={() => period === "monthly" ? navMonth(-1) : setCurrentYear((y) => y - 1)}
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer", color: "var(--text)" }}
          >&lsaquo;</button>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", minWidth: "10rem", textAlign: "center" }}>{periodLabel}</span>
          <button
            onClick={() => period === "monthly" ? navMonth(1) : setCurrentYear((y) => y + 1)}
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer", color: "var(--text)" }}
          >&rsaquo;</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="tiles">
        <div className="tile">
          <p className="k">Revenue</p>
          <p className="v" style={{ fontSize: "1.1rem", color: "var(--good, #27ae60)" }}>{fmt(totalRevenue)}</p>
          <p className="s">{totalBookings} bookings</p>
        </div>
        {totalParking > 0 && (
          <div className="tile">
            <p className="k">Parking</p>
            <p className="v" style={{ fontSize: "1.1rem", color: "#3498db" }}>{fmt(totalParking)}</p>
          </div>
        )}
        <div className="tile">
          <p className="k">Expenses</p>
          <p className="v" style={{ fontSize: "1.1rem", color: "var(--crit, #c0392b)" }}>{fmt(totalExpenses)}</p>
        </div>
        <div className="tile">
          <p className="k">Net Profit</p>
          <p className="v" style={{ fontSize: "1.1rem", color: netProfit >= 0 ? "var(--good, #27ae60)" : "var(--crit, #c0392b)" }}>
            {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
          </p>
          <p className="s">{margin}% margin</p>
        </div>
        <div className="tile">
          <p className="k">Nights</p>
          <p className="v">{totalNights}</p>
          <p className="s">{avgNightly > 0 ? `${fmt(avgNightly)}/night` : ""}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={() => setActiveTab("pnl")} style={tabStyle("pnl")}>P&L Overview</button>
        <button onClick={() => setActiveTab("bookings")} style={tabStyle("bookings")}>Bookings ({bookings.length})</button>
        <button onClick={() => setActiveTab("expenses")} style={tabStyle("expenses")}>Expenses ({expenses.length})</button>
      </div>

      {/* P&L Tab */}
      {activeTab === "pnl" && (
        <>
          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            {/* Donut */}
            <div className="panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: "var(--text-2)" }}>Revenue vs Expenses</h3>
              <DonutChart segments={donutSegments} label={fmt(netProfit)} sublabel={netProfit >= 0 ? "Net Profit" : "Net Loss"} />
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", fontSize: "0.68rem" }}>
                {donutSegments.filter(s => s.value > 0).map((s) => (
                  <span key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Revenue by Source */}
            <div className="panel" style={{ padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-2)" }}>Revenue by Source</h3>
              {sourceEntries.length > 0 ? sourceEntries.map(([src, rev]) => (
                <HorizBar
                  key={src}
                  label={SOURCE_LABEL[src] || src}
                  value={rev}
                  max={maxSourceRev}
                  color={SOURCE_COLORS[src] || "#95a5a6"}
                />
              )) : (
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>No revenue data</p>
              )}
            </div>

            {/* Monthly Trend */}
            <div className="panel" style={{ padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: "var(--text-2)" }}>Monthly Trend</h3>
              {monthlyData.length > 0 ? (
                <>
                  <BarChart items={monthlyData} maxVal={barMax} />
                  <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem", fontSize: "0.65rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--good, #27ae60)" }} /> Revenue
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--crit, #c0392b)" }} /> Expenses
                    </span>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>No monthly data</p>
              )}
            </div>
          </div>

          {/* P&L Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1rem", marginBottom: "1rem", overflow: "hidden" }}>
            {/* Income side */}
            <div className="panel" style={{ padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--good, #27ae60)" }}>
                Income
              </h3>
              <div style={{ fontSize: "0.78rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <span>Booking Revenue</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmt(totalRevenue)}</span>
                </div>
                {totalParking > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <span>Parking Revenue</span>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmt(totalParking)}</span>
                  </div>
                )}
                {sourceEntries.map(([src, rev]) => (
                  <div key={src} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0 0.25rem 1rem", fontSize: "0.72rem", color: "var(--text-3)" }}>
                    <span>{SOURCE_LABEL[src] || src}</span>
                    <span style={{ fontFamily: "var(--mono)" }}>{fmt(rev)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0 0.25rem", borderTop: "2px solid var(--line)", fontWeight: 700, fontSize: "0.85rem" }}>
                  <span>Total Income</span>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--good, #27ae60)" }}>{fmt(totalIncome)}</span>
                </div>
              </div>
            </div>

            {/* Expense side */}
            <div className="panel" style={{ padding: "1rem", overflow: "hidden", minWidth: 0 }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--crit, #c0392b)" }}>
                Expenses
              </h3>
              <div style={{ fontSize: "0.78rem" }}>
                {utilitiesExp > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <span>Utilities ({pnl?.utilitiesPct || 0}%)</span>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600, flexShrink: 0 }}>{fmt(utilitiesExp)}</span>
                  </div>
                )}
                {cleaningExp > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <span>Cleaning (x{totalBookings})</span>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600, flexShrink: 0 }}>{fmt(cleaningExp)}</span>
                  </div>
                )}
                {fixedExpenses.map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label} (fixed/mo)</span>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600, flexShrink: 0 }}>{fmt(f.amount)}</span>
                  </div>
                ))}
                {Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <span style={{ textTransform: "capitalize" }}>{cat}</span>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmt(amt)}</span>
                  </div>
                ))}
                {totalExpenses === 0 && (
                  <p style={{ color: "var(--text-3)", margin: "0.5rem 0" }}>No expenses recorded</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0 0.25rem", borderTop: "2px solid var(--line)", fontWeight: 700, fontSize: "0.85rem" }}>
                  <span>Total Expenses</span>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--crit, #c0392b)" }}>{fmt(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Profit Summary */}
          <div className="panel" style={{ padding: "1rem", marginBottom: "1rem", background: netProfit >= 0 ? "color-mix(in srgb, var(--good, #27ae60) 8%, var(--surface))" : "color-mix(in srgb, var(--crit, #c0392b) 8%, var(--surface))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Net Profit</h3>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "var(--text-3)" }}>
                  Income ({fmt(totalIncome)}) - Expenses ({fmt(totalExpenses)})
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--mono)", color: netProfit >= 0 ? "var(--good, #27ae60)" : "var(--crit, #c0392b)" }}>
                  {netProfit >= 0 ? "+" : ""}{fmt(netProfit)}
                </p>
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: margin >= 50 ? "var(--good, #27ae60)" : margin >= 20 ? "var(--warn, #f39c12)" : "var(--crit, #c0392b)" }}>
                  {margin}% margin
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <>
          {bookingMonths.map((month) => {
            const monthRows = byMonth.get(month)!;
            const monthTotal = monthRows.reduce((s, r) => s + r.grossAmount, 0);
            const mParts = month.split("-");
            const monthLabel = ["January","February","March","April","May","June","July","August","September","October","November","December"][Number(mParts[1]) - 1] + " " + mParts[0];

            return (
              <div className="panel" key={month} style={{ marginBottom: "1rem" }}>
                <h2>
                  {monthLabel}{" "}
                  <span className="hint">{monthRows.length} booking{monthRows.length !== 1 ? "s" : ""} &middot; {fmt(monthTotal)}</span>
                </h2>
                <div className="tbl-scroll">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th className="tar">Nights</th>
                        <th className="tar">Pax</th>
                        <th>Source</th>
                        <th className="tar">Amount</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((b) => {
                        let nights = 0;
                        try { nights = nightsBetween(b.checkIn, b.checkOut); } catch { /* skip */ }
                        const bal = b.grossAmount - b.amountPaid;
                        return (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 600 }}>{b.source === "block" ? "Blocked" : b.guest || "(no name)"}</td>
                            <td className="mono" style={{ fontSize: "0.78rem" }}>{b.checkIn}</td>
                            <td className="mono" style={{ fontSize: "0.78rem" }}>{b.checkOut}</td>
                            <td className="tar mono">{nights}</td>
                            <td className="tar mono">{b.guests || "—"}</td>
                            <td>
                              <span style={{
                                fontSize: "0.68rem", fontWeight: 600, padding: "0.12rem 0.4rem",
                                borderRadius: 9, color: "#fff",
                                background: SOURCE_COLORS[b.source || "unknown"] || "#95a5a6",
                              }}>
                                {SOURCE_LABEL[b.source || "unknown"] || b.source}
                              </span>
                            </td>
                            <td className="tar mono" style={{ fontWeight: 600 }}>{b.grossAmount > 0 ? fmt(b.grossAmount) : "—"}</td>
                            <td>
                              {b.grossAmount <= 0 ? <span style={{ color: "var(--text-3)", fontSize: "0.72rem" }}>—</span> :
                                bal <= 0 ? <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#fff", background: "var(--good)", padding: "0.12rem 0.4rem", borderRadius: 9, display: "inline-block" }}>Paid</span> :
                                <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#fff", background: "var(--crit, #c0392b)", padding: "0.12rem 0.4rem", borderRadius: 9, display: "inline-block" }}>{fmt(bal)}</span>}
                            </td>
                            <td>
                              <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-2)" }}>
                                {STATUS_LABEL[b.status] || b.status}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.72rem", color: "var(--text-3)", maxWidth: "8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {b.notes || ""}
                            </td>
                            <td>
                              <Link href={`/admin/bookings/${b.id}/edit`} style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                                Edit
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}>
                        <td colSpan={6}>Subtotal</td>
                        <td className="tar mono">{fmt(monthTotal)}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
          {bookings.length === 0 && (
            <div className="panel" style={{ textAlign: "center", padding: "2rem", color: "var(--text-3)" }}>No bookings found.</div>
          )}
        </>
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ margin: 0 }}>Expenses <span className="hint">{expenses.length} items</span></h2>
            <button
              className="btn btn-sm"
              onClick={() => {
                setEditingExpId(null);
                setExpCategory("Cleaning");
                setExpAmount("");
                setExpDate(new Date().toISOString().slice(0, 10));
                setExpVendor("");
                setExpNotes("");
                setShowExpForm(true);
              }}
            >
              + Add Expense
            </button>
          </div>

          {/* Expense form */}
          {showExpForm && (
            <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "1rem", marginBottom: "1rem", border: "1px solid var(--line)" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>{editingExpId ? "Edit Expense" : "New Expense"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div className="field">
                  <label>Category</label>
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount (PHP)</label>
                  <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} min={0} step={100} placeholder="0" />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                <div className="field">
                  <label>Vendor (optional)</label>
                  <input type="text" value={expVendor} onChange={(e) => setExpVendor(e.target.value)} placeholder="e.g. MERALCO" />
                </div>
                <div className="field">
                  <label>Notes (optional)</label>
                  <input type="text" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} placeholder="e.g. Monthly bill" />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "flex-end" }}>
                <button className="btn btn-sm" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)" }} onClick={() => { setShowExpForm(false); setEditingExpId(null); }}>Cancel</button>
                <button className="btn btn-sm" disabled={expSaving || !expAmount || Number(expAmount) <= 0} onClick={saveExpense}>
                  {expSaving ? "Saving..." : editingExpId ? "Update" : "Add Expense"}
                </button>
              </div>
            </div>
          )}

          {/* Expenses table */}
          {expenses.length > 0 ? (
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th className="tar">Amount</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="mono" style={{ fontSize: "0.78rem" }}>{e.date}</td>
                      <td style={{ fontWeight: 600, textTransform: "capitalize" }}>{e.category}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{e.vendor || "—"}</td>
                      <td className="tar mono" style={{ fontWeight: 600, color: "var(--crit, #c0392b)" }}>{fmt(e.amount)}</td>
                      <td style={{ fontSize: "0.72rem", color: "var(--text-3)", maxWidth: "10rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.notes || ""}</td>
                      <td style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => startEditExpense(e)}
                          style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteExpense(e.id)}
                          style={{ fontSize: "0.7rem", color: "var(--crit, #c0392b)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}>
                    <td colSpan={3}>Total</td>
                    <td className="tar mono" style={{ color: "var(--crit, #c0392b)" }}>{fmt(expenses.reduce((s, e) => s + e.amount, 0))}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--text-3)", padding: "1rem 0", textAlign: "center" }}>No expenses recorded. Click <strong>+ Add Expense</strong> to add one.</p>
          )}
        </div>
      )}
    </>
  );
}
