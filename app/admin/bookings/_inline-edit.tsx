"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InlineEditProps {
  bookingId: string;
  field: string;
  value: string;
  type?: "text" | "date" | "number";
  mono?: boolean;
  width?: string;
  placeholder?: string;
}

export function InlineEdit({ bookingId, field, value, type = "text", mono, width, placeholder }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    if (val === value) { setEditing(false); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      body[field] = type === "number" ? Number(val) || 0 : val;
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { setEditing(false); router.refresh(); }
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setVal(value); setEditing(false); }
        }}
        disabled={saving}
        placeholder={placeholder}
        style={{
          width: width || (type === "date" ? "8rem" : type === "number" ? "4rem" : "7rem"),
          fontSize: "inherit", fontFamily: mono ? "var(--mono, monospace)" : "inherit",
          padding: "0.15rem 0.3rem", border: "1px solid var(--accent)",
          borderRadius: 4, outline: "none",
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        cursor: "pointer",
        fontFamily: mono ? "var(--mono, monospace)" : undefined,
        borderBottom: "1px dashed var(--line-soft)",
      }}
    >
      {value || placeholder || "—"}
    </span>
  );
}

interface InlineSelectProps {
  bookingId: string;
  field: string;
  value: string;
  options: { value: string; label: string }[];
  colorMap?: Record<string, string>;
}

export function InlineSelect({ bookingId, field, value, options, colorMap }: InlineSelectProps) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function onChange(newVal: string) {
    if (newVal === value) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newVal }),
      });
      if (res.ok) router.refresh();
    } catch { /* ignore */ }
    setSaving(false);
  }

  const color = colorMap?.[value];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={saving}
      style={{
        border: "none", background: "transparent", fontSize: "0.72rem",
        cursor: "pointer", padding: "0.1rem 0", fontWeight: 600,
        color: color || "inherit", width: "100%",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
