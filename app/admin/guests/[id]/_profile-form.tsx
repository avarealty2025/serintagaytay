"use client";

import { useState } from "react";

const PRESET_TAGS = ["VIP", "Repeat", "Corporate", "Blacklisted", "Long-stay", "Influencer", "Referral"];

export function ProfileForm({
  guestId,
  initial,
}: {
  guestId: string;
  initial: {
    name: string;
    email: string | null;
    phone: string | null;
    tags: string[];
    preferences: string | null;
    source: string | null;
  };
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [preferences, setPreferences] = useState(initial.preferences ?? "");
  const [source, setSource] = useState(initial.source ?? "");
  const [customTag, setCustomTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, tags, preferences, source }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addTag(tag: string) {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function addCustomTag() {
    if (customTag.trim()) {
      addTag(customTag.trim());
      setCustomTag("");
    }
  }

  return (
    <div className="crm-edit-form">
      <div className="crm-edit-grid">
        <div className="field">
          <label htmlFor="guest-name">Full Name</label>
          <input
            id="guest-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="guest-email">Email</label>
          <input
            id="guest-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guest@email.com"
          />
        </div>
        <div className="field">
          <label htmlFor="guest-phone">Phone</label>
          <input
            id="guest-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+63 9xx xxx xxxx"
          />
        </div>
        <div className="field">
          <label htmlFor="guest-source">Acquisition Channel</label>
          <select
            id="guest-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">— not set —</option>
            <option value="direct">Direct</option>
            <option value="airbnb">Airbnb</option>
            <option value="agoda">Agoda</option>
            <option value="booking.com">Booking.com</option>
            <option value="facebook">Facebook</option>
            <option value="referral">Referral</option>
            <option value="walk-in">Walk-in</option>
          </select>
        </div>
      </div>

      <div className="crm-tags-section">
        <label>Tags</label>
        <div className="crm-tags-list">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`crm-tag ${tag === "VIP" ? "vip" : tag === "Blacklisted" ? "blacklisted" : ""}`}
            >
              {tag}
              <button
                type="button"
                className="crm-tag-remove"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="crm-tags-add">
          {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <button
              key={tag}
              type="button"
              className="crm-tag-btn"
              onClick={() => addTag(tag)}
            >
              + {tag}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
            placeholder="Custom tag..."
            style={{ flex: 1, maxWidth: "200px" }}
          />
          <button type="button" className="btn btn-sm" onClick={addCustomTag}>
            Add
          </button>
        </div>
      </div>

      <div className="field" style={{ marginTop: "1rem" }}>
        <label htmlFor="guest-preferences">Preferences &amp; Special Requests</label>
        <textarea
          id="guest-preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          rows={3}
          placeholder="Room preferences, dietary needs, allergies, special occasions..."
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--line)",
            fontFamily: "var(--sans)",
            fontSize: "0.88rem",
            resize: "vertical",
            background: "var(--surface)",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
        {saved && (
          <span style={{ color: "var(--good)", fontSize: "0.82rem", fontWeight: 600 }}>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
