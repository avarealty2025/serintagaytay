"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PermGuard } from "../_perm-guard.tsx";

interface UnitPnl {
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
  perBookingExpenses: { label: string; amount: number }[];
  perBookingExpenseTotal: number;
}

interface PnlData {
  canEdit: boolean;
  units: UnitPnl[];
  summary: {
    totalRevenue: number;
    totalParkingRevenue: number;
    totalExpenses: number;
    netProfit: number;
    margin: number;
    totalUnits: number;
    totalBookings: number;
  };
  revenueBySource: Record<string, number>;
  months: string[];
  currentMonth: string;
  numMonths: number;
  period: string;
  periodDate: string;
  periodLabel: string;
  availableYears: number[];
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  "booking.com": "Booking.com",
  agoda: "Agoda",
  facebook: "Facebook",
  manual: "Manual",
  block: "Blocked",
  unknown: "Other",
};

const TYPE_LABEL: Record<string, string> = {
  studio: "Studio",
  exec_studio: "Exec Studio",
  "1br": "1 BR",
  "2br": "2 BR",
};

function getInitialDate(p: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (p === "quarterly") return `${y}-Q${Math.ceil(m / 3)}`;
  if (p === "yearly") return String(y);
  return `${y}-${String(m).padStart(2, "0")}`;
}

function getLocalLabel(p: string, pd: string): string {
  if (p === "monthly") {
    const parts = pd.split("-");
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  }
  if (p === "quarterly") {
    const parts = pd.split("-Q");
    return `Q${parts[1]} ${parts[0]}`;
  }
  return pd;
}

function PnlInlineEdit({ value, suffix, onSave, width = "4rem", disabled }: {
  value: number;
  suffix?: string;
  onSave: (val: number) => void;
  width?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value || ""));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    onSave(Number(val) || 0);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    if (disabled) {
      return <span style={{ fontSize: "inherit", color: "inherit" }}>{value > 0 ? `${value}${suffix || ""}` : "—"}</span>;
    }
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setVal(String(value || "")); setEditing(true); }}
        style={{ cursor: "pointer", borderBottom: "1px dashed var(--text-3)", fontSize: "inherit", color: "inherit" }}
        title="Click to edit"
      >
        {value > 0 ? `${value}${suffix || ""}` : "—"}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.2rem", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        autoFocus
        min={0}
        style={{ width, fontSize: "0.78rem", padding: "0.15rem 0.25rem", border: "1px solid var(--accent)", borderRadius: 3, textAlign: "right" }}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        onBlur={save}
      />
      {suffix && <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>{suffix}</span>}
    </span>
  );
}

function ModeToggle({ unitId, mode, onSave, disabled }: { unitId: string; mode: string; onSave: (mode: string) => void; disabled?: boolean }) {
  const [saving, setSaving] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    const next = mode === "managed" ? "rented" : "managed";
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `unit_mode:${unitId}`, value: next }),
      });
      if (res.ok) onSave(next);
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={saving || disabled}
      style={{
        fontSize: "0.68rem",
        fontWeight: 600,
        padding: "0.15rem 0.45rem",
        borderRadius: 9,
        border: "none",
        cursor: "pointer",
        background: mode === "managed" ? "#2980b9" : "var(--accent)",
        color: "#fff",
      }}
    >
      {saving ? "..." : mode === "managed" ? "Managed" : "Rented"}
    </button>
  );
}

const DEFAULT_EXPENSE_ITEMS = [
  "Condo Dues", "Electricity", "Water", "Internet/Wi-Fi",
  "Cable/Netflix", "Parking Rental", "Insurance", "Cleaning",
  "Laundry", "Maintenance",
];

function FixedExpensesEditor({ unitId, items, numMonths, onSave, disabled }: {
  unitId: string;
  items: { label: string; amount: number }[];
  numMonths: number;
  onSave: (items: { label: string; amount: number }[]) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<{ label: string; amount: string }[]>(
    items.length > 0 ? items.map((i) => ({ label: i.label, amount: String(i.amount) })) : []
  );
  const [saving, setSaving] = useState(false);

  const total = items.reduce((s, i) => s + i.amount, 0);

  function addRow() { setRows([...rows, { label: "", amount: "" }]); }

  function updateRow(idx: number, field: "label" | "amount", val: string) {
    const next = [...rows];
    const row = next[idx];
    if (!row) return;
    next[idx] = { label: field === "label" ? val : row.label, amount: field === "amount" ? val : row.amount };
    setRows(next);
  }

  function removeRow(idx: number) { setRows(rows.filter((_, i) => i !== idx)); }

  async function save() {
    setSaving(true);
    const cleaned = rows.filter((r) => r.label.trim() && Number(r.amount) > 0).map((r) => ({ label: r.label.trim(), amount: Number(r.amount) }));
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `fixed_expenses:${unitId}`, value: cleaned }),
      });
      if (res.ok) { onSave(cleaned); setEditing(false); }
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (!editing) {
    return (
      <div>
        {items.length > 0 ? (
          <div style={{ fontSize: "0.75rem" }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem", color: "var(--text-2)" }}>
                <span>{item.label}</span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--crit, #c0392b)" }}>{fmt(item.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem", paddingTop: "0.3rem", borderTop: "1px solid var(--line-soft)", fontWeight: 700, fontSize: "0.78rem" }}>
              <span>Monthly Total</span>
              <span style={{ fontFamily: "var(--mono)", color: "var(--crit, #c0392b)" }}>{fmt(total)}/mo</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: "0.15rem" }}>
              = {fmt(total * numMonths)} over {numMonths} month{numMonths !== 1 ? "s" : ""}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0.25rem 0" }}>No fixed expenses</p>
        )}
        {!disabled && (
          <button
            onClick={() => {
              if (rows.length === 0 && items.length === 0) setRows(DEFAULT_EXPENSE_ITEMS.slice(0, 4).map((label) => ({ label, amount: "" })));
              else setRows(items.map((i) => ({ label: i.label, amount: String(i.amount) })));
              setEditing(true);
            }}
            style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", background: "none", border: "1px dashed var(--line)", borderRadius: 4, cursor: "pointer", color: "var(--accent)", marginTop: "0.3rem" }}
          >
            {items.length > 0 ? "Edit" : "+ Add"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--surface-2)", borderRadius: 6, padding: "0.6rem" }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem", alignItems: "center" }}>
          <input type="text" value={row.label} onChange={(e) => updateRow(i, "label", e.target.value)} placeholder="e.g. Condo Dues" list={`exp-${unitId}`}
            style={{ flex: 1, fontSize: "0.75rem", padding: "0.15rem 0.3rem", border: "1px solid var(--line)", borderRadius: 3 }} />
          <input type="number" value={row.amount} onChange={(e) => updateRow(i, "amount", e.target.value)} placeholder="0" min={0} step={100}
            style={{ width: "4.5rem", fontSize: "0.75rem", padding: "0.15rem 0.3rem", border: "1px solid var(--line)", borderRadius: 3, textAlign: "right" }} />
          <button onClick={() => removeRow(i)} style={{ background: "none", border: "none", color: "var(--crit)", cursor: "pointer", fontSize: "0.9rem", padding: "0 0.15rem" }}>&times;</button>
        </div>
      ))}
      <datalist id={`exp-${unitId}`}>{DEFAULT_EXPENSE_ITEMS.map((item) => <option key={item} value={item} />)}</datalist>
      <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem" }}>
        <button onClick={addRow} style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", background: "none", border: "1px dashed var(--line)", borderRadius: 3, cursor: "pointer", color: "var(--accent)" }}>+ Row</button>
        <button onClick={save} disabled={saving} style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>{saving ? "..." : "Save"}</button>
        <button onClick={() => setEditing(false)} style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", background: "none", border: "1px solid var(--line)", borderRadius: 3, cursor: "pointer", color: "var(--text-3)" }}>Cancel</button>
      </div>
    </div>
  );
}

const PER_BOOKING_SUGGESTIONS = ["Laundry", "Supplies", "Amenities Kit", "Towels", "Linens", "Toiletries"];

function PerBookingExpensesEditor({ unitId, items, bookingCount, onSave, disabled }: {
  unitId: string;
  items: { label: string; amount: number }[];
  bookingCount: number;
  onSave: (items: { label: string; amount: number }[]) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<{ label: string; amount: string }[]>([]);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const cleaned = rows.filter((r) => r.label.trim() && Number(r.amount) > 0).map((r) => ({ label: r.label.trim(), amount: Number(r.amount) }));
    onSave(cleaned);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div>
        {items.length > 0 ? items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.15rem" }}>
            <span style={{ color: "var(--text-2)" }}>{item.label}/Booking: {fmt(item.amount)}</span>
            <span style={{ fontFamily: "var(--mono)", color: "var(--crit, #c0392b)" }}>{bookingCount > 0 ? fmt(item.amount * bookingCount) : "—"}</span>
          </div>
        )) : null}
        {!disabled && (
          <button
            onClick={() => {
              setRows(items.length > 0 ? items.map((i) => ({ label: i.label, amount: String(i.amount) })) : [{ label: "", amount: "" }]);
              setEditing(true);
            }}
            style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", background: "none", border: "1px dashed var(--line)", borderRadius: 4, cursor: "pointer", color: "var(--accent)", marginTop: "0.3rem" }}
          >
            {items.length > 0 ? "Edit" : "+ Add per-booking expense"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--surface-2)", borderRadius: 6, padding: "0.6rem", marginTop: "0.25rem" }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem", alignItems: "center" }}>
          <input type="text" value={row.label} onChange={(e) => { const next = [...rows]; next[i] = { ...next[i]!, label: e.target.value }; setRows(next); }}
            placeholder="e.g. Laundry" list={`pb-${unitId}`}
            style={{ flex: 1, fontSize: "0.75rem", padding: "0.15rem 0.3rem", border: "1px solid var(--line)", borderRadius: 3 }} />
          <input type="number" value={row.amount} onChange={(e) => { const next = [...rows]; next[i] = { ...next[i]!, amount: e.target.value }; setRows(next); }}
            placeholder="0" min={0} step={50}
            style={{ width: "4.5rem", fontSize: "0.75rem", padding: "0.15rem 0.3rem", border: "1px solid var(--line)", borderRadius: 3, textAlign: "right" }} />
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))}
            style={{ background: "none", border: "none", color: "var(--crit)", cursor: "pointer", fontSize: "0.9rem", padding: "0 0.15rem" }}>&times;</button>
        </div>
      ))}
      <datalist id={`pb-${unitId}`}>{PER_BOOKING_SUGGESTIONS.map((item) => <option key={item} value={item} />)}</datalist>
      <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem" }}>
        <button onClick={() => setRows([...rows, { label: "", amount: "" }])} style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", background: "none", border: "1px dashed var(--line)", borderRadius: 3, cursor: "pointer", color: "var(--accent)" }}>+ Row</button>
        <button onClick={save} disabled={saving} style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>{saving ? "..." : "Save"}</button>
        <button onClick={() => setEditing(false)} style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", background: "none", border: "1px solid var(--line)", borderRadius: 3, cursor: "pointer", color: "var(--text-3)" }}>Cancel</button>
      </div>
    </div>
  );
}

type SortCol = "code" | "bookings" | "nights" | "revenue" | "parking" | "expenses" | "profit" | "margin";

export default function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "rented" | "managed">("all");
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [periodDate, setPeriodDate] = useState(() => getInitialDate("monthly"));
  const [sortCol, setSortCol] = useState<SortCol>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function changePeriod(p: "monthly" | "quarterly" | "yearly") {
    let year = 0;
    let month = 1;
    if (period === "monthly") {
      const parts = periodDate.split("-");
      year = Number(parts[0]); month = Number(parts[1]);
    } else if (period === "quarterly") {
      year = Number(periodDate.split("-Q")[0]);
      month = (Number(periodDate.split("-Q")[1]) - 1) * 3 + 1;
    } else {
      year = Number(periodDate);
      month = new Date().getMonth() + 1;
    }
    setPeriod(p);
    if (p === "monthly") setPeriodDate(`${year}-${String(month).padStart(2, "0")}`);
    else if (p === "quarterly") setPeriodDate(`${year}-Q${Math.ceil(month / 3)}`);
    else setPeriodDate(String(year));
  }

  function navigatePeriod(dir: -1 | 1) {
    if (period === "monthly") {
      const parts = periodDate.split("-");
      let y = Number(parts[0]), m = Number(parts[1]) + dir;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      setPeriodDate(`${y}-${String(m).padStart(2, "0")}`);
    } else if (period === "quarterly") {
      const parts = periodDate.split("-Q");
      let y = Number(parts[0]), q = Number(parts[1]) + dir;
      if (q < 1) { q = 4; y--; }
      if (q > 4) { q = 1; y++; }
      setPeriodDate(`${y}-Q${q}`);
    } else {
      setPeriodDate(String(Number(periodDate) + dir));
    }
  }

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  function sortIndicator(col: SortCol) {
    if (sortCol !== col) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period, date: periodDate });
    fetch(`/api/reports/pnl?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, periodDate]);

  async function saveSetting(key: string, value: unknown) {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  function updateUnit(unitId: string, patch: Partial<UnitPnl>) {
    if (!data) return;
    setData({
      ...data,
      units: data.units.map((u) => u.unitId === unitId ? { ...u, ...patch } : u),
    });
  }

  function handleModeSave(unitId: string, mode: string) {
    updateUnit(unitId, { unitMode: mode });
  }

  function handleMgmtFeeSave(unitId: string, pct: number) {
    saveSetting(`mgmt_fee:${unitId}`, pct);
    const u = data?.units.find((x) => x.unitId === unitId);
    if (!u) return;
    const pmFeeIncome = Math.round(u.revenue * (pct / 100));
    updateUnit(unitId, { mgmtFeePercent: pct, pmFeeIncome, totalPmIncome: pmFeeIncome });
  }

  function handleCleaningFeeSave(unitId: string, fee: number) {
    saveSetting(`cleaning_fee_pnl:${unitId}`, fee);
    const u = data?.units.find((x) => x.unitId === unitId);
    if (!u) return;
    const newCleaningExpense = fee * u.bookingCount;
    const oldCleaningExpense = u.cleaningExpense;
    updateUnit(unitId, {
      cleaningFeePerBooking: fee,
      cleaningExpense: newCleaningExpense,
      totalPmIncome: u.pmFeeIncome,
      expenses: u.expenses - oldCleaningExpense + newCleaningExpense,
    });
  }

  function handlePerBookingSave(unitId: string, items: { label: string; amount: number }[]) {
    saveSetting(`per_booking_expenses:${unitId}`, items);
    const u = data?.units.find((x) => x.unitId === unitId);
    if (!u) return;
    const oldTotal = u.perBookingExpenseTotal || 0;
    const newTotal = items.reduce((s, e) => s + e.amount, 0) * u.bookingCount;
    updateUnit(unitId, {
      perBookingExpenses: items,
      perBookingExpenseTotal: newTotal,
      expenses: u.expenses - oldTotal + newTotal,
    });
  }

  function handleUtilitiesSave(unitId: string, pct: number) {
    saveSetting(`utilities_pct:${unitId}`, pct);
    const u = data?.units.find((x) => x.unitId === unitId);
    if (!u) return;
    const oldUtil = u.utilitiesExpense;
    const newUtil = Math.round(u.revenue * (pct / 100));
    updateUnit(unitId, { utilitiesPct: pct, utilitiesExpense: newUtil, expenses: u.expenses - oldUtil + newUtil });
  }

  function handleFixedSave(unitId: string, items: { label: string; amount: number }[]) {
    if (!data) return;
    const newTotal = items.reduce((s, i) => s + i.amount, 0);
    setData({
      ...data,
      units: data.units.map((u) => {
        if (u.unitId !== unitId) return u;
        const oldFixed = u.fixedMonthlyTotal * data.numMonths;
        const newFixed = newTotal * data.numMonths;
        return { ...u, fixedMonthly: items, fixedMonthlyTotal: newTotal, expenses: u.expenses - oldFixed + newFixed };
      }),
    });
  }

  function sortUnits(list: UnitPnl[]): UnitPnl[] {
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "code": cmp = a.code.localeCompare(b.code); break;
        case "bookings": cmp = a.bookingCount - b.bookingCount; break;
        case "nights": cmp = a.nights - b.nights; break;
        case "revenue": cmp = a.revenue - b.revenue; break;
        case "parking": cmp = a.parkingRevenue - b.parkingRevenue; break;
        case "expenses": cmp = a.expenses - b.expenses; break;
        case "profit": cmp = (a.revenue + a.parkingRevenue - a.expenses) - (b.revenue + b.parkingRevenue - b.expenses); break;
        case "margin": {
          const aTotal = a.revenue + a.parkingRevenue;
          const bTotal = b.revenue + b.parkingRevenue;
          const aM = aTotal > 0 ? (aTotal - a.expenses) / aTotal : 0;
          const bM = bTotal > 0 ? (bTotal - b.expenses) / bTotal : 0;
          cmp = aM - bM;
          break;
        }
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }

  if (loading) return <div className="page-head"><h1 className="today">Loading Reports...</h1></div>;
  if (!data) return <div className="page-head"><h1 className="today">Reports</h1><p style={{ color: "var(--text-3)" }}>Failed to load data.</p></div>;

  const { units, numMonths, canEdit, revenueBySource } = data;
  const rented = units.filter((u) => u.unitMode !== "managed");
  const managed = units.filter((u) => u.unitMode === "managed");

  const displayUnits = tab === "rented" ? rented : tab === "managed" ? managed : units;
  const sortedUnits = sortUnits(displayUnits);

  const rentedRevenue = rented.reduce((s, u) => s + u.revenue, 0);
  const rentedParking = rented.reduce((s, u) => s + u.parkingRevenue, 0);
  const rentedExpenses = rented.reduce((s, u) => s + u.expenses, 0);
  const rentedProfit = rentedRevenue + rentedParking - rentedExpenses;
  const managedPmTotal = managed.reduce((s, u) => s + u.totalPmIncome, 0);

  const totalRevenue = units.reduce((s, u) => s + u.revenue, 0);
  const totalParking = units.reduce((s, u) => s + u.parkingRevenue, 0);
  const totalNights = units.reduce((s, u) => s + u.nights, 0);
  const totalBookings = units.reduce((s, u) => s + u.bookingCount, 0);
  const totalExpenses = units.reduce((s, u) => s + u.expenses, 0);
  const totalProfit = totalRevenue + totalParking - totalExpenses;

  const displayLabel = data.periodLabel || getLocalLabel(period, periodDate);

  const sortedSources = Object.entries(revenueBySource).sort((a, b) => b[1] - a[1]);

  const tabStyle = (t: string) => ({
    padding: "0.5rem 1.25rem",
    fontSize: "0.85rem",
    fontWeight: tab === t ? 700 : 400,
    color: tab === t ? "#fff" : "var(--text-2)",
    background: tab === t ? "var(--accent)" : "transparent",
    border: tab === t ? "none" : "1px solid var(--line)",
    borderRadius: 6,
    cursor: "pointer" as const,
  });

  const periodBtnStyle = (p: string) => ({
    padding: "0.3rem 0.7rem",
    fontSize: "0.78rem",
    fontWeight: period === p ? 700 : 400,
    color: period === p ? "#fff" : "var(--text-2)",
    background: period === p ? "#2980b9" : "transparent",
    border: period === p ? "none" : "1px solid var(--line)",
    borderRadius: 5,
    cursor: "pointer" as const,
  });

  const navBtnStyle = {
    background: "none",
    border: "1px solid var(--line)",
    borderRadius: 4,
    cursor: "pointer" as const,
    padding: "0.2rem 0.55rem",
    fontSize: "0.95rem",
    color: "var(--text-2)",
    lineHeight: 1,
  };

  const thSort = (col: SortCol, label: string, align?: "tar") => (
    <th className={align || ""}>
      <span
        onClick={() => toggleSort(col)}
        style={{ cursor: "pointer", userSelect: "none", color: "inherit", textDecoration: "none" }}
      >
        {label}{sortIndicator(col)}
      </span>
    </th>
  );

  return (
    <PermGuard perm="reports.view">
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Reports</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-2)" }}>
            Per-unit performance &amp; P&amp;L. Click a row to view unit details.
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button onClick={() => changePeriod("monthly")} style={periodBtnStyle("monthly")}>Monthly</button>
          <button onClick={() => changePeriod("quarterly")} style={periodBtnStyle("quarterly")}>Quarterly</button>
          <button onClick={() => changePeriod("yearly")} style={periodBtnStyle("yearly")}>Yearly</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <button onClick={() => navigatePeriod(-1)} style={navBtnStyle}>&lsaquo;</button>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", minWidth: "9rem", textAlign: "center", color: "var(--text-1)" }}>
            {displayLabel}
          </span>
          <button onClick={() => navigatePeriod(1)} style={navBtnStyle}>&rsaquo;</button>
        </div>
      </div>

      {/* Unit type tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={() => setTab("all")} style={tabStyle("all")}>All Units ({units.length})</button>
        <button onClick={() => setTab("rented")} style={tabStyle("rented")}>Units I Rent ({rented.length})</button>
        <button onClick={() => setTab("managed")} style={tabStyle("managed")}>Units I Manage ({managed.length})</button>
      </div>

      {/* Summary tiles */}
      <div className="tiles">
        {tab !== "managed" && (
          <>
            <div className="tile">
              <p className="k">Revenue</p>
              <p className="v" style={{ fontSize: "1.1rem", color: "var(--good, #27ae60)" }}>{fmt(tab === "rented" ? rentedRevenue : totalRevenue)}</p>
              <p className="s">{tab === "rented" ? rented.reduce((s, u) => s + u.bookingCount, 0) : totalBookings} bookings</p>
            </div>
            {(tab === "rented" ? rentedParking : totalParking) > 0 && (
              <div className="tile">
                <p className="k">Parking</p>
                <p className="v" style={{ fontSize: "1.1rem", color: "var(--good, #27ae60)" }}>{fmt(tab === "rented" ? rentedParking : totalParking)}</p>
              </div>
            )}
            <div className="tile">
              <p className="k">Expenses</p>
              <p className="v" style={{ fontSize: "1.1rem", color: "var(--crit, #c0392b)" }}>{fmt(tab === "rented" ? rentedExpenses : totalExpenses)}</p>
              <p className="s">incl. fixed &amp; utilities</p>
            </div>
            <div className="tile">
              <p className="k">Net Profit</p>
              <p className="v" style={{ fontSize: "1.1rem", color: (tab === "rented" ? rentedProfit : totalProfit) >= 0 ? "var(--good, #27ae60)" : "var(--crit, #c0392b)" }}>
                {(tab === "rented" ? rentedProfit : totalProfit) >= 0 ? "+" : ""}{fmt(tab === "rented" ? rentedProfit : totalProfit)}
              </p>
              <p className="s">{data.summary.margin}% margin</p>
            </div>
            <div className="tile">
              <p className="k">Nights</p>
              <p className="v">{tab === "rented" ? rented.reduce((s, u) => s + u.nights, 0) : totalNights}</p>
            </div>
          </>
        )}
        {tab !== "rented" && managed.length > 0 && (
          <>
            <div className="tile">
              <p className="k">PM Fee Income</p>
              <p className="v" style={{ fontSize: "1.1rem", color: "var(--good, #27ae60)" }}>{fmt(managedPmTotal)}</p>
              <p className="s">{managed.length} managed unit{managed.length !== 1 ? "s" : ""}</p>
            </div>
            {managed.reduce((s, u) => s + u.cleaningExpense, 0) > 0 && (
              <div className="tile">
                <p className="k">Cleaning Expense</p>
                <p className="v" style={{ fontSize: "1.1rem", color: "var(--crit, #c0392b)" }}>{fmt(managed.reduce((s, u) => s + u.cleaningExpense, 0))}</p>
                <p className="s">paid to cleaners</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main table — Rented / All view */}
      {tab !== "managed" && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h2>
            {tab === "rented" ? "Units I Rent" : "Per-Unit Performance"}{" "}
            <span className="hint">{(tab === "rented" ? rented : units).length} units — {displayLabel}</span>
          </h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  {thSort("code", "Unit")}
                  <th>Mode</th>
                  <th>Type</th>
                  {thSort("bookings", "Bookings", "tar")}
                  {thSort("nights", "Nights", "tar")}
                  {thSort("revenue", "Revenue", "tar")}
                  {thSort("parking", "Parking", "tar")}
                  {thSort("expenses", "Expenses", "tar")}
                  <th className="tar">Util %</th>
                  <th className="tar">Fixed/mo</th>
                  {thSort("profit", "Net Profit", "tar")}
                  {thSort("margin", "Margin", "tar")}
                  <th></th>
                </tr>
              </thead>
                {sortUnits(tab === "rented" ? rented : units).map((u) => {
                  const net = u.revenue + u.parkingRevenue - u.expenses;
                  const totalUnitRev = u.revenue + u.parkingRevenue;
                  const margin = totalUnitRev > 0 ? Math.round((net / totalUnitRev) * 100) : 0;
                  const expanded = expandedUnit === u.unitId;
                  const isManaged = u.unitMode === "managed";
                  return (
                    <tbody key={u.unitId}>
                      <tr
                        onClick={() => router.push(`/admin/reports/unit/${u.unitId}`)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        <td>
                          <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{u.code}</span>
                          <span style={{ display: "block", fontSize: "0.68rem", color: "var(--text-3)" }}>{u.building}{u.name ? ` · ${u.name}` : ""}</span>
                        </td>
                        <td><ModeToggle unitId={u.unitId} mode={u.unitMode} onSave={(m) => handleModeSave(u.unitId, m)} disabled={!canEdit} /></td>
                        <td style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>{TYPE_LABEL[u.type] ?? u.type}</td>
                        <td className="tar mono">{u.bookingCount}</td>
                        <td className="tar mono">{u.nights}</td>
                        <td className="tar mono" style={{ fontWeight: 600, color: "var(--good, #27ae60)" }}>{fmt(u.revenue)}</td>
                        <td className="tar mono" style={{ color: u.parkingRevenue > 0 ? "var(--good, #27ae60)" : "var(--text-3)" }}>
                          {u.parkingRevenue > 0 ? fmt(u.parkingRevenue) : "—"}
                        </td>
                        <td className="tar mono" style={{ color: u.expenses > 0 ? "var(--crit, #c0392b)" : "var(--text-3)" }}>
                          {u.expenses > 0 ? fmt(u.expenses) : "—"}
                          {isManaged && u.cleaningExpense > 0 && (
                            <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-3)", fontWeight: 400 }}>cleaning</span>
                          )}
                        </td>
                        <td className="tar" style={{ color: "var(--accent)", fontWeight: 600 }}>
                          {isManaged ? (
                            <span style={{ color: "var(--text-3)" }}>—</span>
                          ) : (
                            <PnlInlineEdit value={u.utilitiesPct} suffix="%" onSave={(v) => handleUtilitiesSave(u.unitId, v)} width="3rem" disabled={!canEdit} />
                          )}
                        </td>
                        <td className="tar mono" style={{ fontSize: "0.78rem", color: u.fixedMonthlyTotal > 0 ? "var(--crit, #c0392b)" : "var(--text-3)" }}>
                          {isManaged ? "—" : u.fixedMonthlyTotal > 0 ? fmt(u.fixedMonthlyTotal) : "—"}
                        </td>
                        {isManaged ? (
                          <td className="tar mono" style={{ fontWeight: 700, color: u.totalPmIncome - u.cleaningExpense >= 0 ? "var(--good, #27ae60)" : "var(--crit, #c0392b)" }}>
                            {fmt(u.totalPmIncome - u.cleaningExpense)}
                            <span style={{ display: "block", fontSize: "0.62rem", color: "var(--text-3)", fontWeight: 400 }}>PM net</span>
                          </td>
                        ) : (
                          <td className="tar mono" style={{ fontWeight: 700, color: net >= 0 ? "var(--good, #27ae60)" : "var(--crit, #c0392b)" }}>
                            {net >= 0 ? "+" : ""}{fmt(net)}
                          </td>
                        )}
                        <td className="tar">
                          {isManaged ? (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{u.mgmtFeePercent}% fee</span>
                          ) : (
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: margin >= 50 ? "var(--good, #27ae60)" : margin >= 20 ? "var(--warn, #f39c12)" : "var(--crit, #c0392b)" }}>
                              {margin}%
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedUnit(expanded ? null : u.unitId); }}
                            style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem", background: "none", border: "1px solid var(--line)", borderRadius: 3, cursor: "pointer", color: "var(--accent)" }}
                          >
                            {expanded ? "Close" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={13} style={{ padding: "0.75rem 1rem", background: "var(--surface-2)" }}>
                            {isManaged ? (
                              <div style={{ maxWidth: "500px" }}>
                                <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>PM Settings</p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.78rem" }}>
                                  <div>
                                    <span style={{ color: "var(--text-3)" }}>PM Fee %</span>
                                    <div style={{ marginTop: "0.2rem" }}>
                                      <PnlInlineEdit value={u.mgmtFeePercent} suffix="%" onSave={(v) => handleMgmtFeeSave(u.unitId, v)} width="3.5rem" disabled={!canEdit} />
                                      <span style={{ marginLeft: "0.5rem", color: "var(--good, #27ae60)", fontWeight: 600 }}>= {fmt(u.pmFeeIncome)}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--text-3)" }}>Cleaning Fee/Booking (expense)</span>
                                    <div style={{ marginTop: "0.2rem" }}>
                                      <PnlInlineEdit value={u.cleaningFeePerBooking} onSave={(v) => handleCleaningFeeSave(u.unitId, v)} width="4rem" disabled={!canEdit} />
                                      <span style={{ marginLeft: "0.5rem", color: "var(--crit, #c0392b)", fontWeight: 600 }}>= {fmt(u.cleaningExpense)} expense</span>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", fontWeight: 700 }}>
                                  PM Fee Income: <span style={{ color: "var(--good, #27ae60)" }}>{fmt(u.totalPmIncome)}</span>
                                  {u.cleaningExpense > 0 && (
                                    <span style={{ marginLeft: "0.75rem", color: "var(--crit, #c0392b)" }}>Cleaning Expense: {fmt(u.cleaningExpense)}</span>
                                  )}
                                  <span style={{ marginLeft: "0.75rem" }}>
                                    Net: <span style={{ color: u.totalPmIncome - u.cleaningExpense >= 0 ? "var(--good, #27ae60)" : "var(--crit, #c0392b)" }}>
                                      {fmt(u.totalPmIncome - u.cleaningExpense)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: "700px" }}>
                                <div>
                                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.8rem", fontWeight: 700 }}>Monthly Fixed Expenses</p>
                                  <FixedExpensesEditor unitId={u.unitId} items={u.fixedMonthly} numMonths={numMonths} onSave={(items) => handleFixedSave(u.unitId, items)} disabled={!canEdit} />
                                </div>
                                <div>
                                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.8rem", fontWeight: 700 }}>Expense Breakdown</p>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.15rem" }}>
                                    <span style={{ color: "var(--text-2)" }}>
                                      Cleaning Fee/Booking:{" "}
                                      <PnlInlineEdit value={u.cleaningFeePerBooking} onSave={(v) => handleCleaningFeeSave(u.unitId, v)} width="4rem" disabled={!canEdit} />
                                    </span>
                                    <span style={{ fontFamily: "var(--mono)", color: "var(--crit, #c0392b)" }}>
                                      {u.cleaningExpense > 0 ? fmt(u.cleaningExpense) : "—"}
                                    </span>
                                  </div>
                                  <PerBookingExpensesEditor
                                    unitId={u.unitId}
                                    items={u.perBookingExpenses || []}
                                    bookingCount={u.bookingCount}
                                    onSave={(items) => handlePerBookingSave(u.unitId, items)}
                                    disabled={!canEdit}
                                  />
                                  {Object.entries(u.expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                    <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.15rem" }}>
                                      <span style={{ color: "var(--text-2)", textTransform: "capitalize" }}>{cat}</span>
                                      <span style={{ fontFamily: "var(--mono)", color: "var(--crit, #c0392b)" }}>{fmt(amt)}</span>
                                    </div>
                                  ))}
                                  {Object.keys(u.expensesByCategory).length === 0 && u.cleaningExpense === 0 && (u.perBookingExpenses || []).length === 0 && <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>No expenses recorded</p>}
                                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem" }}>
                                    <Link href="/admin/expenses" style={{ color: "var(--accent)" }}>Add expenses</Link>
                                  </p>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}>
                  <td colSpan={3}>Total</td>
                  <td className="tar mono">{(tab === "rented" ? rented : units).reduce((s, u) => s + u.bookingCount, 0)}</td>
                  <td className="tar mono">{(tab === "rented" ? rented : units).reduce((s, u) => s + u.nights, 0)}</td>
                  <td className="tar mono" style={{ color: "var(--good, #27ae60)" }}>{fmt((tab === "rented" ? rented : units).reduce((s, u) => s + u.revenue, 0))}</td>
                  <td className="tar mono" style={{ color: "var(--good, #27ae60)" }}>{fmt((tab === "rented" ? rented : units).reduce((s, u) => s + u.parkingRevenue, 0))}</td>
                  <td className="tar mono" style={{ color: "var(--crit, #c0392b)" }}>{fmt((tab === "rented" ? rented : units).reduce((s, u) => s + u.expenses, 0))}</td>
                  <td></td>
                  <td className="tar mono" style={{ color: "var(--crit, #c0392b)" }}>{fmt((tab === "rented" ? rented : units).reduce((s, u) => s + u.fixedMonthlyTotal, 0))}</td>
                  <td className="tar mono" style={{ color: (tab === "rented" ? rentedProfit : totalProfit) >= 0 ? "var(--good, #27ae60)" : "var(--crit, #c0392b)" }}>
                    {(tab === "rented" ? rentedProfit : totalProfit) >= 0 ? "+" : ""}{fmt(tab === "rented" ? rentedProfit : totalProfit)}
                  </td>
                  <td className="tar">{data.summary.margin}%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Managed-only view */}
      {tab === "managed" && managed.length > 0 && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h2>Units I Manage <span className="hint">{managed.length} units — {displayLabel}</span></h2>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Mode</th>
                  <th className="tar">Bookings</th>
                  <th className="tar">Booking Revenue</th>
                  <th className="tar">PM Fee %</th>
                  <th className="tar">PM Fee Income</th>
                  <th className="tar">Cleaning/Booking</th>
                  <th className="tar">Cleaning Expense</th>
                  <th className="tar" style={{ fontWeight: 700 }}>PM Fee Income</th>
                </tr>
              </thead>
              <tbody>
                {managed.map((u) => (
                  <tr
                    key={u.unitId}
                    onClick={() => router.push(`/admin/reports/unit/${u.unitId}`)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td>
                      <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{u.code}</span>
                      <span style={{ display: "block", fontSize: "0.68rem", color: "var(--text-3)" }}>{u.building}</span>
                    </td>
                    <td><ModeToggle unitId={u.unitId} mode={u.unitMode} onSave={(m) => handleModeSave(u.unitId, m)} disabled={!canEdit} /></td>
                    <td className="tar mono">{u.bookingCount}</td>
                    <td className="tar mono" style={{ color: "var(--text-2)" }}>{fmt(u.revenue)}</td>
                    <td className="tar" style={{ color: "var(--accent)", fontWeight: 600 }}>
                      <PnlInlineEdit value={u.mgmtFeePercent} suffix="%" onSave={(v) => handleMgmtFeeSave(u.unitId, v)} width="3rem" disabled={!canEdit} />
                    </td>
                    <td className="tar mono" style={{ color: "var(--good, #27ae60)", fontWeight: 600 }}>{fmt(u.pmFeeIncome)}</td>
                    <td className="tar" style={{ color: "var(--accent)", fontWeight: 600 }}>
                      <PnlInlineEdit value={u.cleaningFeePerBooking} onSave={(v) => handleCleaningFeeSave(u.unitId, v)} width="4rem" disabled={!canEdit} />
                    </td>
                    <td className="tar mono" style={{ color: "var(--crit, #c0392b)" }}>{fmt(u.cleaningExpense)}</td>
                    <td className="tar mono" style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--good, #27ae60)" }}>{fmt(u.totalPmIncome)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}>
                  <td colSpan={2}>Total</td>
                  <td className="tar mono">{managed.reduce((s, u) => s + u.bookingCount, 0)}</td>
                  <td className="tar mono">{fmt(managed.reduce((s, u) => s + u.revenue, 0))}</td>
                  <td></td>
                  <td className="tar mono" style={{ color: "var(--good, #27ae60)" }}>{fmt(managed.reduce((s, u) => s + u.pmFeeIncome, 0))}</td>
                  <td></td>
                  <td className="tar mono" style={{ color: "var(--crit, #c0392b)" }}>{fmt(managed.reduce((s, u) => s + u.cleaningExpense, 0))}</td>
                  <td className="tar mono" style={{ color: "var(--good, #27ae60)", fontSize: "0.9rem" }}>{fmt(managedPmTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Empty states */}
      {tab === "rented" && rented.length === 0 && (
        <div className="panel" style={{ textAlign: "center", padding: "2rem", color: "var(--text-3)" }}>
          No rented units. Click the <strong>Managed</strong> badge on a unit to switch it to <strong>Rented</strong>.
        </div>
      )}
      {tab === "managed" && managed.length === 0 && (
        <div className="panel" style={{ textAlign: "center", padding: "2rem", color: "var(--text-3)" }}>
          No managed units. Click the <strong>Rented</strong> badge on a unit to switch it to <strong>Managed</strong>.
        </div>
      )}

      {/* Revenue by Source */}
      {sortedSources.length > 0 && tab !== "managed" && (
        <div className="cols">
          <div className="panel">
            <h2>Revenue by Source <span className="hint">{displayLabel}</span></h2>
            {sortedSources.map(([src, rev]) => {
              const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
              return (
                <div className="row" key={src}>
                  <span className="stripe" style={{ background: `var(--ch-${src === "unknown" ? "block" : src === "facebook" ? "fb" : src})` }} />
                  <span style={{ flex: 1 }}>
                    <p className="who">{SOURCE_LABEL[src] ?? src}</p>
                    <div className="bar-bg">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: `var(--ch-${src === "unknown" ? "block" : src === "facebook" ? "fb" : src})` }} />
                    </div>
                  </span>
                  <span className="mono" style={{ fontWeight: 700 }}>{fmt(rev)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="foot" style={{ marginTop: "1rem" }}>
        <strong>Rented</strong> = units you own, shows full income/expenses/profit.{" "}
        <strong>Managed</strong> = units you manage for owners, shows your PM fee income. Cleaning fees are expenses paid to cleaners.{" "}
        Click any unit&apos;s mode badge to switch. Click a row to view bookings.
        {" "}<Link href="/admin/expenses" style={{ color: "var(--accent)", fontSize: "0.8rem" }}>Manage Expenses</Link>
      </p>
    </>
    </PermGuard>
  );
}
