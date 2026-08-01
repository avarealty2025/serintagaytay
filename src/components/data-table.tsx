"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
  getValue?: (row: T) => string | number;
  filterKey?: string;
  filterOptions?: { label: string; value: string }[];
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  searchFields?: ((row: T) => string)[];
  searchPlaceholder?: string;
  exportFilename?: string;
  emptyMessage?: string;
  getRowKey: (row: T) => string;
  actions?: (row: T) => ReactNode;
  title?: string;
  titleHint?: string;
  toolbar?: ReactNode;
}

type SortDir = "asc" | "desc";

function getVal<T>(row: T, col: Column<T>): string | number {
  if (col.getValue) return col.getValue(row);
  const v = (row as Record<string, unknown>)[col.key];
  if (v == null) return "";
  return typeof v === "number" ? v : String(v);
}

export function DataTable<T>({
  columns,
  data,
  searchFields,
  searchPlaceholder = "Search...",
  exportFilename = "export",
  emptyMessage = "No data found.",
  getRowKey,
  actions,
  title,
  titleHint,
  toolbar,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const filtered = useMemo(() => {
    let rows = data;

    if (search && searchFields) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        searchFields.some((fn) => fn(row).toLowerCase().includes(q)),
      );
    }

    for (const [fKey, fVal] of Object.entries(filters)) {
      if (!fVal) continue;
      rows = rows.filter((row) => {
        const col = columns.find((c) => c.key === fKey);
        if (!col) return true;
        return String(getVal(row, col)) === fVal;
      });
    }

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        rows = [...rows].sort((a, b) => {
          const va = getVal(a, col);
          const vb = getVal(b, col);
          const cmp =
            typeof va === "number" && typeof vb === "number"
              ? va - vb
              : String(va).localeCompare(String(vb));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }

    return rows;
  }, [data, search, searchFields, filters, sortKey, sortDir, columns]);

  const exportCsv = useCallback(() => {
    const header = columns.map((c) => c.label).join(",");
    const rows = filtered.map((row) =>
      columns
        .map((c) => {
          const v = getVal(row, c);
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, columns, exportFilename]);

  const filterCols = columns.filter((c) => c.filterOptions);
  const hasSearch = searchFields && searchFields.length > 0;
  const hasToolbar = hasSearch || filterCols.length > 0;

  return (
    <div className="panel">
      {title && (
        <h2>
          {title} <span className="hint">{titleHint ?? `${filtered.length} items`}</span>
        </h2>
      )}

      {hasToolbar && (
        <div className="dt-toolbar">
          {hasSearch && (
            <div className="field" style={{ minWidth: 200 }}>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          {filterCols.map((col) => (
            <div className="field" key={col.key}>
              <select
                value={filters[col.key] ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, [col.key]: e.target.value }))
                }
              >
                <option value="">All {col.label}</option>
                {col.filterOptions!.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="dt-actions">
            {toolbar}
            <button className="btn-sm btn-outline" onClick={exportCsv} type="button">
              Export CSV
            </button>
            <button
              className="btn-sm btn-outline"
              onClick={() => window.print()}
              type="button"
            >
              Print
            </button>
          </div>
        </div>
      )}

      <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    col.align === "right" ? "tar" : "",
                    col.sortable ? "sortable" : "",
                    col.className ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="sort-arrow">
                      {sortDir === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </th>
              ))}
              {actions && <th style={{ width: 1 }}></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem" }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        col.align === "right" ? "tar" : "",
                        col.className ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {col.render ? col.render(row) : String(getVal(row, col) ?? "")}
                    </td>
                  ))}
                  {actions && <td>{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="dt-footer">
        <span>
          {filtered.length} of {data.length} rows
        </span>
      </div>
    </div>
  );
}
