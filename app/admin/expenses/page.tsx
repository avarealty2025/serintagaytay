"use client";

import { useState } from "react";
import { UNITS } from "../../../src/data/units.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";
import { DataTable, type Column } from "../../../src/components/data-table.tsx";

interface Expense {
  id: string;
  date: string;
  category: string;
  unitId: string;
  description: string;
  amount: number;
  vendor: string;
  receiptUrl: string;
  status: "pending" | "approved" | "rejected";
  createdBy: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "cleaning", name: "Cleaning Supplies", description: "Detergent, towels, linens, etc." },
  { id: "maintenance", name: "Maintenance & Repairs", description: "Plumbing, electrical, appliance repair" },
  { id: "utilities", name: "Utilities", description: "Electricity, water, internet" },
  { id: "condo_dues", name: "Condo Association Dues", description: "Monthly building dues" },
  { id: "furnishing", name: "Furnishing & Decor", description: "Furniture, appliances, decor items" },
  { id: "marketing", name: "Marketing & Advertising", description: "Listing fees, promotions" },
  { id: "staff", name: "Staff Compensation", description: "Cleaner/caretaker wages" },
  { id: "commission", name: "OTA Commission", description: "Airbnb, Agoda platform fees" },
  { id: "taxes", name: "Taxes & Permits", description: "Business permits, BIR filings" },
  { id: "insurance", name: "Insurance", description: "Unit insurance premiums" },
  { id: "other", name: "Other", description: "Miscellaneous expenses" },
];

const SAMPLE_EXPENSES: Expense[] = [];

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  category: "",
  unitId: "",
  description: "",
  amount: 0,
  vendor: "",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(SAMPLE_EXPENSES);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCat, setEditCat] = useState<ExpenseCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState("");

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [catForm, setCatForm] = useState({ name: "", description: "" });

  const active = UNITS.filter((u) => u.active);

  const filtered = unitFilter
    ? expenses.filter((e) => e.unitId === unitFilter)
    : expenses;

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);
  const pendingCount = filtered.filter((e) => e.status === "pending").length;
  const approvedTotal = filtered
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);

  const unitExpenses = new Map<string, number>();
  for (const e of expenses) {
    const key = e.unitId || "general";
    unitExpenses.set(key, (unitExpenses.get(key) ?? 0) + e.amount);
  }

  function openNewForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEditForm(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      date: expense.date,
      category: expense.category,
      unitId: expense.unitId,
      description: expense.description,
      amount: expense.amount,
      vendor: expense.vendor,
    });
    setShowForm(true);
  }

  function saveExpense() {
    if (editingId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, ...form }
            : e,
        ),
      );
    } else {
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        ...form,
        receiptUrl: "",
        status: "pending",
        createdBy: "Admin",
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function addCategory() {
    if (!catForm.name) return;
    if (editCat) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editCat.id
            ? { ...c, name: catForm.name, description: catForm.description }
            : c,
        ),
      );
    } else {
      setCategories((prev) => [
        ...prev,
        {
          id: catForm.name.toLowerCase().replace(/\s+/g, "_"),
          ...catForm,
        },
      ]);
    }
    setShowCatForm(false);
    setEditCat(null);
    setCatForm({ name: "", description: "" });
  }

  function deleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function approveExpense(id: string) {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "approved" as const } : e,
      ),
    );
  }

  const columns: Column<Expense>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      className: "mono",
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      filterOptions: categories.map((c) => ({ label: c.name, value: c.id })),
    },
    {
      key: "unitId",
      label: "Unit",
      sortable: true,
      render: (row) => {
        if (!row.unitId) return "General";
        const u = active.find((u) => u.id === row.unitId);
        return u ? `${u.tower}-${u.code}` : row.unitId;
      },
    },
    { key: "description", label: "Description" },
    { key: "vendor", label: "Vendor" },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right",
      className: "mono",
      render: (row) => formatPHP(row.amount),
    },
    {
      key: "status",
      label: "Status",
      filterOptions: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
      render: (row) => (
        <span
          className={`status-pill ${row.status === "approved" ? "ok" : row.status === "rejected" ? "" : "warn"}`}
          style={
            row.status === "rejected"
              ? {
                  background:
                    "color-mix(in srgb, var(--crit) 18%, transparent)",
                  color: "var(--crit)",
                }
              : undefined
          }
        >
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="page-head">
        <h1 className="today">Expenses</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn-outline"
            onClick={() => {
              setShowCatForm(true);
              setEditCat(null);
              setCatForm({ name: "", description: "" });
            }}
            type="button"
          >
            Manage Categories
          </button>
          <button className="btn" onClick={openNewForm} type="button">
            + New Expense
          </button>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <p className="k">Total Expenses</p>
          <p className="v" style={{ fontSize: "1.2rem" }}>
            {formatPHP(totalExpenses)}
          </p>
          <p className="s">{filtered.length} entries</p>
        </div>
        <div className="tile">
          <p className="k">Approved</p>
          <p className="v" style={{ fontSize: "1.2rem" }}>
            {formatPHP(approvedTotal)}
          </p>
          <p className="s">verified expenses</p>
        </div>
        <div className="tile">
          <p className="k">Pending Approval</p>
          <p className="v">{pendingCount}</p>
          <p className="s">awaiting review</p>
        </div>
        <div className="tile">
          <p className="k">Categories</p>
          <p className="v">{categories.length}</p>
          <p className="s">expense types</p>
        </div>
      </div>

      {/* Per-unit expense summary */}
      {expenses.length > 0 && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2>Expenses by Unit</h2>
          <div className="form-body">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th className="tar">Expenses</th>
                    <th className="tar">Total</th>
                    <th style={{ width: 1 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {[...unitExpenses.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([uid, total]) => {
                      const u = active.find((u) => u.id === uid);
                      const count = expenses.filter(
                        (e) =>
                          (e.unitId || "general") === uid,
                      ).length;
                      return (
                        <tr key={uid}>
                          <td style={{ fontWeight: 600 }}>
                            {uid === "general"
                              ? "General"
                              : u
                                ? `${u.tower}-${u.code} ${u.name ?? ""}`
                                : uid}
                          </td>
                          <td className="tar mono">{count}</td>
                          <td className="tar mono">{formatPHP(total)}</td>
                          <td>
                            <button
                              className="btn-xs"
                              onClick={() =>
                                setUnitFilter(uid === "general" ? "" : uid)
                              }
                              type="button"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Unit filter indicator */}
      {unitFilter && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
            padding: "0.5rem 0.75rem",
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            border: "1px solid var(--accent)",
            fontSize: "0.82rem",
          }}
        >
          <span>
            Showing expenses for:{" "}
            <strong>
              {(() => {
                const u = active.find((u) => u.id === unitFilter);
                return u
                  ? `${u.tower}-${u.code} ${u.name ?? ""}`
                  : unitFilter;
              })()}
            </strong>
          </span>
          <button
            className="btn-xs"
            onClick={() => setUnitFilter("")}
            type="button"
          >
            Clear filter
          </button>
        </div>
      )}

      {showForm && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2>{editingId ? "Edit Expense" : "New Expense"}</h2>
          <div className="form-body">
            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Unit</label>
                <select
                  value={form.unitId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitId: e.target.value }))
                  }
                >
                  <option value="">General (not unit-specific)</option>
                  {active.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.tower}-{u.code} {u.name ?? ""} (
                      {u.buildingId === "west" ? "West" : "East"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Amount (PHP)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                  }
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="What was this expense for?"
                />
              </div>
              <div className="field">
                <label>Vendor</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor: e.target.value }))
                  }
                  placeholder="Who was paid?"
                />
              </div>
            </div>
            <div className="field">
              <label>Receipt Upload</label>
              <input type="file" accept="image/*,.pdf" />
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                }}
              >
                Receipts will be stored in Supabase Storage once connected
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="btn" onClick={saveExpense} type="button">
                {editingId ? "Update Expense" : "Add Expense"}
              </button>
              <button
                className="btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCatForm && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2>{editCat ? "Edit Category" : "Expense Categories"}</h2>
          <div className="form-body">
            <div className="tbl-scroll" style={{ marginBottom: "1rem" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th style={{ width: 1 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-2)",
                        }}
                      >
                        {c.description}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="btn-xs"
                            onClick={() => {
                              setEditCat(c);
                              setCatForm({
                                name: c.name,
                                description: c.description,
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="btn-xs btn-danger"
                            onClick={() => deleteCategory(c.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="field-row">
              <div className="field">
                <label>{editCat ? "Edit Name" : "New Category Name"}</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Description</label>
                <input
                  type="text"
                  value={catForm.description}
                  onChange={(e) =>
                    setCatForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" onClick={addCategory} type="button">
                {editCat ? "Update" : "Add Category"}
              </button>
              <button
                className="btn-outline"
                onClick={() => {
                  setShowCatForm(false);
                  setEditCat(null);
                }}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        getRowKey={(e) => e.id}
        searchFields={[
          (e) => e.description,
          (e) => e.vendor,
          (e) => e.category,
        ]}
        searchPlaceholder="Search expenses..."
        exportFilename={
          unitFilter
            ? `expenses-${unitFilter}`
            : "expenses"
        }
        emptyMessage="No expenses recorded yet. Click '+ New Expense' to add one."
        title="Expense Records"
        titleHint={
          unitFilter
            ? `filtered by unit`
            : `${expenses.length} total`
        }
        actions={(row) => (
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className="btn-xs"
              onClick={() => openEditForm(row)}
              type="button"
            >
              Edit
            </button>
            {row.status === "pending" && (
              <button
                className="btn-xs"
                onClick={() => approveExpense(row.id)}
                type="button"
              >
                Approve
              </button>
            )}
            <button
              className="btn-xs btn-danger"
              onClick={() => deleteExpense(row.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        )}
      />

      <p className="foot">
        Expenses will persist once Supabase is connected. Receipt images are
        stored in a private bucket with signed URLs.
      </p>
    </>
  );
}
