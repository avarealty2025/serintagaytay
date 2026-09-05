"use client";

import { useState, useEffect, useRef } from "react";
import { UNITS } from "../../../src/data/units.ts";
import { PermGuard } from "../_perm-guard.tsx";

interface TemplatePhoto {
  url: string;
  caption: string;
}

interface CheckinTemplate {
  instructions: string;
  houseRules: string;
  photos: TemplatePhoto[];
}

interface EmailTemplate {
  bannerUrl: string;
  greeting: string;
  bodyText: string;
  footerText: string;
  photos: TemplatePhoto[];
}

const ACTIVE_UNITS = UNITS.filter((u) => u.active);

const DEFAULT_CHECKIN: CheckinTemplate = {
  instructions:
    "Check-in time is 2:00 PM. Check-out is at 12:00 PM (noon).\nProceed to the building lobby and present a valid government ID.\nYour unit key card will be provided at the front desk or via lockbox — details will be sent separately.\nWi-Fi password and unit access instructions will be provided upon check-in.",
  houseRules:
    "No smoking inside the unit\nNo pets allowed\nNo parties or events\nQuiet hours: 10 PM to 7 AM\nMaximum guests as per unit capacity",
  photos: [],
};

const DEFAULT_EMAIL: EmailTemplate = {
  bannerUrl: "",
  greeting: "Thank you for your booking at Serin Tagaytay Staycation!",
  bodyText:
    "We are pleased to confirm your reservation. Please find your invoice details below. If you have any questions, feel free to contact us.",
  footerText: "",
  photos: [],
};

function getUnitLabel(u: (typeof UNITS)[0]): string {
  return u.name || `${u.tower}-${u.code}`;
}

function PhotoUploader({
  photos,
  onChange,
}: {
  photos: TemplatePhoto[];
  onChange: (p: TemplatePhoto[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("section", "templates");
      const res = await fetch("/api/site-content/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange([...photos, { url: data.url, caption: "" }]);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <label
        style={{
          fontSize: "0.7rem",
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "var(--text-3)",
          fontWeight: 600,
        }}
      >
        Photos
      </label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginTop: "0.5rem",
        }}
      >
        {photos.map((p, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              width: 120,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              background: "var(--surface-2)",
            }}
          >
            <img
              src={p.url}
              alt={p.caption || "Template photo"}
              style={{ width: "100%", height: 80, objectFit: "cover" }}
            />
            <input
              type="text"
              value={p.caption}
              onChange={(e) => {
                const updated = photos.map((ph, j) =>
                  j === i ? { ...ph, caption: e.target.value } : ph,
                );
                onChange(updated);
              }}
              placeholder="Caption"
              style={{
                width: "100%",
                border: "none",
                borderTop: "1px solid var(--line)",
                padding: "4px 6px",
                fontSize: "0.7rem",
                background: "transparent",
              }}
            />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 20,
                height: 20,
                fontSize: "0.65rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            width: 120,
            height: 80,
            border: "2px dashed var(--line)",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            cursor: "pointer",
            fontSize: "0.75rem",
            color: "var(--text-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {uploading ? "Uploading..." : "+ Add Photo"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: "none" }}
      />
    </div>
  );
}

export default function TemplatesPage() {
  type Tab = "checkin" | "email";
  const [tab, setTab] = useState<Tab>("checkin");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState("_default");
  const [checkinMap, setCheckinMap] = useState<
    Record<string, CheckinTemplate>
  >({ _default: DEFAULT_CHECKIN });
  const [emailTemplate, setEmailTemplate] =
    useState<EmailTemplate>(DEFAULT_EMAIL);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((db) => {
        const map: Record<string, CheckinTemplate> = {
          _default: DEFAULT_CHECKIN,
        };
        if (db.checkin_template) {
          map._default = { ...DEFAULT_CHECKIN, ...db.checkin_template };
        }
        for (const unit of ACTIVE_UNITS) {
          const key = `checkin_template:${unit.id}`;
          if (db[key]) {
            map[unit.id] = { ...DEFAULT_CHECKIN, ...db[key] };
          }
        }
        setCheckinMap(map);
        if (db.email_template) {
          setEmailTemplate({ ...DEFAULT_EMAIL, ...db.email_template });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function currentCheckin(): CheckinTemplate {
    return (
      checkinMap[selectedUnit] ||
      checkinMap._default ||
      DEFAULT_CHECKIN
    );
  }

  function updateCheckin(patch: Partial<CheckinTemplate>) {
    setCheckinMap((prev) => ({
      ...prev,
      [selectedUnit]: { ...currentCheckin(), ...patch },
    }));
  }

  function hasUnitOverride(unitId: string): boolean {
    return unitId in checkinMap && unitId !== "_default";
  }

  function createUnitOverride(unitId: string) {
    setCheckinMap((prev) => ({
      ...prev,
      [unitId]: { ...(prev._default || DEFAULT_CHECKIN) },
    }));
    setSelectedUnit(unitId);
  }

  function removeUnitOverride(unitId: string) {
    setCheckinMap((prev) => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
    setSelectedUnit("_default");
  }

  async function saveAll() {
    setSaving(true);
    try {
      const saves: Promise<Response>[] = [];

      saves.push(
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "checkin_template",
            value: checkinMap._default || DEFAULT_CHECKIN,
          }),
        }),
      );

      for (const unit of ACTIVE_UNITS) {
        if (hasUnitOverride(unit.id)) {
          saves.push(
            fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: `checkin_template:${unit.id}`,
                value: checkinMap[unit.id],
              }),
            }),
          );
        }
      }

      saves.push(
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "email_template",
            value: emailTemplate,
          }),
        }),
      );

      const results = await Promise.all(saves);
      if (results.every((r) => r.ok)) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Some settings failed to save");
      }
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        Loading templates...
      </div>
    );
  }

  const ci = currentCheckin();

  return (
    <PermGuard perm="settings.edit">
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Templates</h1>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "var(--text-2)",
            }}
          >
            Edit check-in instructions and guest email content. Changes are
            saved to the database.
          </p>
        </div>
        <button
          className="btn"
          onClick={saveAll}
          disabled={saving}
          type="button"
          style={
            saved
              ? { background: "var(--good)", color: "#fff" }
              : undefined
          }
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save All Changes"}
        </button>
      </div>

      {saved && (
        <div
          className="notice"
          style={{
            borderLeftColor: "var(--good)",
            background:
              "color-mix(in srgb, var(--good) 12%, transparent)",
          }}
        >
          <strong>Saved.</strong> All templates are now live.
        </div>
      )}

      <div className="settings-layout">
        <nav className="settings-tabs">
          <button
            className={`settings-tab ${tab === "checkin" ? "active" : ""}`}
            onClick={() => setTab("checkin")}
            type="button"
          >
            Check-in Instructions
          </button>
          <button
            className={`settings-tab ${tab === "email" ? "active" : ""}`}
            onClick={() => setTab("email")}
            type="button"
          >
            Guest Email
          </button>
        </nav>

        <div className="settings-content">
          {tab === "checkin" && (
            <>
              <div className="form-panel">
                <h2>
                  Select Unit
                  <span
                    className="hint"
                    style={{ fontWeight: 400, fontSize: "0.75rem" }}
                  >
                    Default applies to all units. Add per-unit overrides
                    below.
                  </span>
                </h2>
                <div className="form-body">
                  <div className="field">
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      style={{ maxWidth: 400 }}
                    >
                      <option value="_default">
                        Default (All Units)
                      </option>
                      {ACTIVE_UNITS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {getUnitLabel(u)}
                          {hasUnitOverride(u.id) ? " (custom)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedUnit !== "_default" &&
                    !hasUnitOverride(selectedUnit) && (
                      <div
                        style={{
                          padding: "1rem",
                          background: "var(--surface-2)",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8rem",
                            color: "var(--text-2)",
                            flex: 1,
                          }}
                        >
                          This unit uses the default template. Create a
                          custom override to set specific instructions.
                        </p>
                        <button
                          className="btn-outline btn-sm"
                          type="button"
                          onClick={() =>
                            createUnitOverride(selectedUnit)
                          }
                        >
                          Create Custom
                        </button>
                      </div>
                    )}

                  {selectedUnit !== "_default" &&
                    hasUnitOverride(selectedUnit) && (
                      <button
                        className="btn-outline btn-sm"
                        type="button"
                        style={{
                          color: "var(--crit)",
                          borderColor: "var(--crit)",
                        }}
                        onClick={() =>
                          removeUnitOverride(selectedUnit)
                        }
                      >
                        Remove Override (use default)
                      </button>
                    )}
                </div>
              </div>

              {(selectedUnit === "_default" ||
                hasUnitOverride(selectedUnit)) && (
                <>
                  <div className="form-panel">
                    <h2>Check-in Instructions</h2>
                    <div className="form-body">
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-3)",
                          margin: "0 0 0.5rem",
                        }}
                      >
                        One instruction per line. Shown to guests on the My
                        Booking page once their booking is confirmed.
                      </p>
                      <div className="field">
                        <textarea
                          rows={8}
                          value={ci.instructions}
                          onChange={(e) =>
                            updateCheckin({
                              instructions: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="panel" style={{ border: "1px solid var(--line-soft)" }}>
                        <h2>Preview</h2>
                        <div className="form-body">
                          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem" }}>
                            {ci.instructions.split("\n").filter(Boolean).map((line, i) => (
                              <li key={i} style={{ marginBottom: "0.25rem" }}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-panel">
                    <h2>House Rules</h2>
                    <div className="form-body">
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-3)",
                          margin: "0 0 0.5rem",
                        }}
                      >
                        One rule per line.
                      </p>
                      <div className="field">
                        <textarea
                          rows={6}
                          value={ci.houseRules}
                          onChange={(e) =>
                            updateCheckin({
                              houseRules: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-panel">
                    <h2>Photos &amp; Images</h2>
                    <div className="form-body">
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-3)",
                          margin: "0 0 0.5rem",
                        }}
                      >
                        Add photos to show with the check-in instructions
                        (e.g. building entrance, lockbox location, parking
                        area).
                      </p>
                      <PhotoUploader
                        photos={ci.photos}
                        onChange={(photos) => updateCheckin({ photos })}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {tab === "email" && (
            <>
              <div className="form-panel">
                <h2>Email Banner</h2>
                <div className="form-body">
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-3)",
                      margin: "0 0 0.5rem",
                    }}
                  >
                    Optional header banner image shown at the top of the
                    invoice/confirmation email.
                  </p>
                  {emailTemplate.bannerUrl ? (
                    <div style={{ position: "relative", maxWidth: 400 }}>
                      <img
                        src={emailTemplate.bannerUrl}
                        alt="Email banner"
                        style={{
                          width: "100%",
                          maxHeight: 150,
                          objectFit: "cover",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--line)",
                        }}
                      />
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        style={{
                          color: "var(--crit)",
                          borderColor: "var(--crit)",
                          marginTop: "0.5rem",
                        }}
                        onClick={() =>
                          setEmailTemplate((prev) => ({
                            ...prev,
                            bannerUrl: "",
                          }))
                        }
                      >
                        Remove Banner
                      </button>
                    </div>
                  ) : (
                    <BannerUploader
                      onUploaded={(url) =>
                        setEmailTemplate((prev) => ({
                          ...prev,
                          bannerUrl: url,
                        }))
                      }
                    />
                  )}
                </div>
              </div>

              <div className="form-panel">
                <h2>Email Content</h2>
                <div className="form-body">
                  <div className="field">
                    <label>Greeting</label>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-3)",
                        margin: "0 0 0.25rem",
                      }}
                    >
                      Shown above the invoice details. Use {"{guest_name}"}{" "}
                      to insert the guest&apos;s name.
                    </p>
                    <textarea
                      rows={2}
                      value={emailTemplate.greeting}
                      onChange={(e) =>
                        setEmailTemplate((prev) => ({
                          ...prev,
                          greeting: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Body Message</label>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-3)",
                        margin: "0 0 0.25rem",
                      }}
                    >
                      Additional message shown below the greeting, above
                      the invoice table.
                    </p>
                    <textarea
                      rows={4}
                      value={emailTemplate.bodyText}
                      onChange={(e) =>
                        setEmailTemplate((prev) => ({
                          ...prev,
                          bodyText: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Footer Message</label>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-3)",
                        margin: "0 0 0.25rem",
                      }}
                    >
                      Custom footer text below the invoice (e.g. contact
                      info, social links).
                    </p>
                    <textarea
                      rows={3}
                      value={emailTemplate.footerText}
                      onChange={(e) =>
                        setEmailTemplate((prev) => ({
                          ...prev,
                          footerText: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-panel">
                <h2>Email Photos</h2>
                <div className="form-body">
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-3)",
                      margin: "0 0 0.5rem",
                    }}
                  >
                    Add photos that will appear in the guest email (e.g.
                    property photos, amenity highlights, map).
                  </p>
                  <PhotoUploader
                    photos={emailTemplate.photos}
                    onChange={(photos) =>
                      setEmailTemplate((prev) => ({ ...prev, photos }))
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
    </PermGuard>
  );
}

function BannerUploader({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("section", "templates");
      const res = await fetch("/api/site-content/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onUploaded(data.url);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-outline btn-sm"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload Banner Image"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: "none" }}
      />
    </>
  );
}
