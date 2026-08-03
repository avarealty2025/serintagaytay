"use client";

import { useState, useEffect } from "react";
import { UNITS } from "../../../src/data/units.ts";
import { DEFAULT_SETTINGS, type SystemSettings } from "../../../src/lib/settings.ts";

type Tab =
  | "business"
  | "booking"
  | "taxes"
  | "fees"
  | "discounts"
  | "cancellation"
  | "payment"
  | "rules"
  | "statuses"
  | "notifications"
  | "system";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("business");
  const [s, setS] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((db) => {
        if (db.system_settings) {
          setS({ ...DEFAULT_SETTINGS, ...db.system_settings });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function update<K extends keyof SystemSettings>(
    section: K,
    patch: Partial<SystemSettings[K]>,
  ) {
    setS((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "system_settings", value: s }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Failed to save settings");
      }
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "business", label: "Business Info" },
    { key: "booking", label: "Booking" },
    { key: "taxes", label: "Taxes" },
    { key: "fees", label: "Fees" },
    { key: "discounts", label: "Discounts" },
    { key: "cancellation", label: "Cancellation" },
    { key: "payment", label: "Payment" },
    { key: "rules", label: "House Rules" },
    { key: "statuses", label: "Statuses" },
    { key: "notifications", label: "Notifications" },
    { key: "system", label: "System" },
  ];

  if (!loaded) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        Loading settings...
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1 className="today">Settings</h1>
        <button className="btn" onClick={save} disabled={saving} type="button">
          {saving ? "Saving..." : saved ? "Saved!" : "Save All Changes"}
        </button>
      </div>

      {saved && (
        <div
          className="notice"
          style={{
            borderLeftColor: "var(--good)",
            background: "color-mix(in srgb, var(--good) 12%, transparent)",
          }}
        >
          <strong>Saved.</strong> Settings are now live.
        </div>
      )}

      <div className="settings-layout">
        <nav className="settings-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`settings-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {tab === "business" && (
            <div className="form-panel">
              <h2>Business Information</h2>
              <div className="form-body">
                <div className="field">
                  <label>Business Name</label>
                  <input
                    type="text"
                    value={s.business.name}
                    onChange={(e) => update("business", { name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input
                    type="text"
                    value={s.business.address}
                    onChange={(e) => update("business", { address: e.target.value })}
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={s.business.phone}
                      onChange={(e) => update("business", { phone: e.target.value })}
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={s.business.email}
                      onChange={(e) => update("business", { email: e.target.value })}
                      placeholder="bookings@example.com"
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Website</label>
                    <input
                      type="url"
                      value={s.business.website}
                      onChange={(e) => update("business", { website: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>TIN</label>
                    <input
                      type="text"
                      value={s.business.tin}
                      onChange={(e) => update("business", { tin: e.target.value })}
                      placeholder="XXX-XXX-XXX-XXX"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "booking" && (
            <div className="form-panel">
              <h2>Booking Settings</h2>
              <div className="form-body">
                <div className="field-row">
                  <div className="field">
                    <label>Check-in Time</label>
                    <input
                      type="time"
                      value={s.booking.checkInTime}
                      onChange={(e) => update("booking", { checkInTime: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Check-out Time</label>
                    <input
                      type="time"
                      value={s.booking.checkOutTime}
                      onChange={(e) => update("booking", { checkOutTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Hold Duration (hours)</label>
                    <input
                      type="number"
                      value={s.booking.holdDurationHours}
                      onChange={(e) =>
                        update("booking", { holdDurationHours: Number(e.target.value) })
                      }
                      min={1}
                    />
                  </div>
                  <div className="field">
                    <label>Hold Reminder (hours before expiry)</label>
                    <input
                      type="number"
                      value={s.booking.holdReminderHours}
                      onChange={(e) =>
                        update("booking", { holdReminderHours: Number(e.target.value) })
                      }
                      min={1}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Default Min Stay (nights)</label>
                    <input
                      type="number"
                      value={s.booking.minStayDefault}
                      onChange={(e) =>
                        update("booking", { minStayDefault: Number(e.target.value) })
                      }
                      min={1}
                    />
                  </div>
                  <div className="field">
                    <label>Default Max Stay (nights)</label>
                    <input
                      type="number"
                      value={s.booking.maxStayDefault}
                      onChange={(e) =>
                        update("booking", { maxStayDefault: Number(e.target.value) })
                      }
                      min={1}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Reservation Fee (PHP)</label>
                    <input
                      type="number"
                      value={s.booking.reservationFee}
                      onChange={(e) =>
                        update("booking", { reservationFee: Number(e.target.value) })
                      }
                      min={0}
                      step={100}
                    />
                  </div>
                  <div className="field">
                    <label>Fee Type</label>
                    <select
                      value={s.booking.reservationFeeType}
                      onChange={(e) =>
                        update("booking", {
                          reservationFeeType: e.target.value as "fixed" | "percentage",
                        })
                      }
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage of Total</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "taxes" && (
            <div className="form-panel">
              <h2>Tax Settings</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: "0 0 0.5rem" }}>
                  Set to 0 to disable. All values are percentages applied to the
                  booking subtotal.
                </p>
                <div className="field-row">
                  <div className="field">
                    <label>VAT (%)</label>
                    <input
                      type="number"
                      value={s.taxes.vat}
                      onChange={(e) => update("taxes", { vat: Number(e.target.value) })}
                      min={0}
                      max={100}
                      step={0.5}
                    />
                  </div>
                  <div className="field">
                    <label>Local Tax (%)</label>
                    <input
                      type="number"
                      value={s.taxes.localTax}
                      onChange={(e) => update("taxes", { localTax: Number(e.target.value) })}
                      min={0}
                      max={100}
                      step={0.5}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Service Charge (%)</label>
                    <input
                      type="number"
                      value={s.taxes.serviceCharge}
                      onChange={(e) =>
                        update("taxes", { serviceCharge: Number(e.target.value) })
                      }
                      min={0}
                      max={100}
                      step={0.5}
                    />
                  </div>
                  <div className="field">
                    <label>Tourism Fee (%)</label>
                    <input
                      type="number"
                      value={s.taxes.tourismFee}
                      onChange={(e) =>
                        update("taxes", { tourismFee: Number(e.target.value) })
                      }
                      min={0}
                      max={100}
                      step={0.5}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "fees" && (
            <div className="form-panel">
              <h2>Default Fees</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: "0 0 0.5rem" }}>
                  These are system defaults. Individual units can override these
                  values from their own settings page.
                </p>
                <div className="field-row">
                  <div className="field">
                    <label>Cleaning Fee (PHP)</label>
                    <input
                      type="number"
                      value={s.fees.cleaningFee}
                      onChange={(e) => update("fees", { cleaningFee: Number(e.target.value) })}
                      min={0}
                      step={50}
                    />
                  </div>
                  <div className="field">
                    <label>Extra Guest Fee / Night (PHP)</label>
                    <input
                      type="number"
                      value={s.fees.extraGuestFee}
                      onChange={(e) =>
                        update("fees", { extraGuestFee: Number(e.target.value) })
                      }
                      min={0}
                      step={50}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Security Deposit (PHP)</label>
                    <input
                      type="number"
                      value={s.fees.securityDeposit}
                      onChange={(e) =>
                        update("fees", { securityDeposit: Number(e.target.value) })
                      }
                      min={0}
                      step={100}
                    />
                  </div>
                  <div className="field">
                    <label>&nbsp;</label>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-3)" }}>
                      Refundable upon checkout
                    </p>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Early Check-in Fee (PHP)</label>
                    <input
                      type="number"
                      value={s.fees.earlyCheckInFee}
                      onChange={(e) =>
                        update("fees", { earlyCheckInFee: Number(e.target.value) })
                      }
                      min={0}
                      step={50}
                    />
                  </div>
                  <div className="field">
                    <label>Late Check-out Fee (PHP)</label>
                    <input
                      type="number"
                      value={s.fees.lateCheckOutFee}
                      onChange={(e) =>
                        update("fees", { lateCheckOutFee: Number(e.target.value) })
                      }
                      min={0}
                      step={50}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "discounts" && (
            <div className="form-panel">
              <h2>Discount Settings</h2>
              <div className="form-body">
                <div className="field-row">
                  <div className="field">
                    <label>Weekly Discount (%)</label>
                    <input
                      type="number"
                      value={s.discounts.weeklyDiscountPct}
                      onChange={(e) =>
                        update("discounts", {
                          weeklyDiscountPct: Number(e.target.value),
                        })
                      }
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="field">
                    <label>Monthly Discount (%)</label>
                    <input
                      type="number"
                      value={s.discounts.monthlyDiscountPct}
                      onChange={(e) =>
                        update("discounts", {
                          monthlyDiscountPct: Number(e.target.value),
                        })
                      }
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Returning Guest Discount (%)</label>
                  <input
                    type="number"
                    value={s.discounts.returningGuestPct}
                    onChange={(e) =>
                      update("discounts", {
                        returningGuestPct: Number(e.target.value),
                      })
                    }
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "cancellation" && (
            <div className="form-panel">
              <h2>Cancellation Policy</h2>
              <div className="form-body">
                <div className="field">
                  <label>Policy Name</label>
                  <input
                    type="text"
                    value={s.cancellation.name}
                    onChange={(e) =>
                      update("cancellation", { name: e.target.value })
                    }
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Free Cancellation Window (hours)</label>
                    <input
                      type="number"
                      value={s.cancellation.freeCancellationHours}
                      onChange={(e) =>
                        update("cancellation", {
                          freeCancellationHours: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="field">
                    <label>Late Cancellation Fee (%)</label>
                    <input
                      type="number"
                      value={s.cancellation.cancellationFeePct}
                      onChange={(e) =>
                        update("cancellation", {
                          cancellationFeePct: Number(e.target.value),
                        })
                      }
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>No-Show Fee (%)</label>
                  <input
                    type="number"
                    value={s.cancellation.noShowFeePct}
                    onChange={(e) =>
                      update("cancellation", {
                        noShowFeePct: Number(e.target.value),
                      })
                    }
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "payment" && (
            <div className="form-panel">
              <h2>Payment Accounts</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: "0 0 1rem" }}>
                  These payment options are shown to guests during booking. To add a QR code, upload the image to Google Drive, make it public, and paste the file ID.
                </p>

                {(s.payment.accounts ?? []).map((acct, i) => (
                  <div
                    key={acct.id}
                    style={{
                      padding: "1rem",
                      background: "var(--surface-2)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div className="field-row">
                      <div className="field">
                        <label>Provider</label>
                        <input
                          type="text"
                          value={acct.provider}
                          onChange={(e) => {
                            const accounts = (s.payment.accounts ?? []).map((a, j) =>
                              j === i ? { ...a, provider: e.target.value } : a,
                            );
                            update("payment", { accounts });
                          }}
                          placeholder="e.g. GCash, BPI, Maya"
                        />
                      </div>
                      <div className="field">
                        <label>Account Number</label>
                        <input
                          type="text"
                          value={acct.accountNumber}
                          onChange={(e) => {
                            const accounts = (s.payment.accounts ?? []).map((a, j) =>
                              j === i ? { ...a, accountNumber: e.target.value } : a,
                            );
                            update("payment", { accounts });
                          }}
                        />
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label>Account Name</label>
                        <input
                          type="text"
                          value={acct.accountName}
                          onChange={(e) => {
                            const accounts = (s.payment.accounts ?? []).map((a, j) =>
                              j === i ? { ...a, accountName: e.target.value } : a,
                            );
                            update("payment", { accounts });
                          }}
                        />
                      </div>
                      <div className="field">
                        <label>QR Code (Google Drive File ID)</label>
                        <input
                          type="text"
                          value={acct.qrPhotoId}
                          onChange={(e) => {
                            const accounts = (s.payment.accounts ?? []).map((a, j) =>
                              j === i ? { ...a, qrPhotoId: e.target.value } : a,
                            );
                            update("payment", { accounts });
                          }}
                          placeholder="Paste Google Drive file ID"
                        />
                      </div>
                    </div>
                    {acct.qrPhotoId && (
                      <img
                        src={`https://lh3.googleusercontent.com/d/${acct.qrPhotoId}=s200`}
                        alt={`${acct.provider} QR preview`}
                        style={{ width: "100px", height: "100px", borderRadius: "6px", marginTop: "0.5rem", border: "1px solid var(--line)" }}
                      />
                    )}
                    <button
                      className="btn-outline btn-sm"
                      type="button"
                      style={{ color: "var(--crit)", borderColor: "var(--crit)", marginTop: "0.5rem" }}
                      onClick={() => {
                        const accounts = (s.payment.accounts ?? []).filter((_, j) => j !== i);
                        update("payment", { accounts });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  className="btn-outline btn-sm"
                  type="button"
                  onClick={() => {
                    const accounts = [
                      ...(s.payment.accounts ?? []),
                      { id: `pay-${Date.now()}`, provider: "", accountName: "", accountNumber: "", qrPhotoId: "" },
                    ];
                    update("payment", { accounts });
                  }}
                >
                  + Add Payment Account
                </button>

                <div className="sep" style={{ margin: "1.5rem 0 1rem" }} />
                <div className="field">
                  <label>Payment Instructions (shown to guests)</label>
                  <textarea
                    rows={3}
                    value={s.payment.instructions}
                    onChange={(e) =>
                      update("payment", { instructions: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "rules" && (
            <div className="form-panel">
              <h2>House Rules</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: "0 0 0.5rem" }}>
                  One rule per line. These apply to all units by default.
                </p>
                <div className="field">
                  <textarea
                    rows={10}
                    value={s.houseRules.join("\n")}
                    onChange={(e) =>
                      setS((prev) => ({
                        ...prev,
                        houseRules: e.target.value.split("\n").filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="panel" style={{ border: "1px solid var(--line-soft)" }}>
                  <h2>Preview</h2>
                  <div className="form-body">
                    <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem" }}>
                      {s.houseRules.map((r, i) => (
                        <li key={i} style={{ marginBottom: "0.25rem" }}>{r}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "statuses" && (
            <div className="form-panel">
              <h2>Booking Statuses</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: "0 0 0.5rem" }}>
                  These statuses are used throughout the system.
                </p>
                <div className="tbl-scroll">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Releases Dates</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.bookingStatuses.map((st) => {
                        const releases = ["cancelled", "payment_rejected", "expired"].includes(st);
                        return (
                          <tr key={st}>
                            <td>
                              <span className={`status-pill ${releases ? "warn" : "ok"}`}>
                                {st.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td>{releases ? "Yes" : "No"}</td>
                            <td style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>
                              {st === "pending_payment" && "Awaiting payment confirmation"}
                              {st === "confirmed" && "Payment received, dates locked"}
                              {st === "checked_in" && "Guest currently in the unit"}
                              {st === "checked_out" && "Guest departed, stay complete"}
                              {st === "cancelled" && "Booking cancelled, dates released"}
                              {st === "no_show" && "Guest did not arrive, dates NOT released"}
                              {st === "expired" && "Hold period expired, dates released"}
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

          {tab === "notifications" && (
            <div className="form-panel">
              <h2>Notification Templates</h2>
              <div className="form-body">
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: "0 0 0.5rem" }}>
                  Email templates use placeholders like {"{guest_name}"},{" "}
                  {"{unit_name}"}, {"{check_in}"}, {"{check_out}"},{" "}
                  {"{amount}"}, {"{booking_ref}"}. Templates are sent
                  automatically when their trigger event occurs.
                </p>
                {s.notifications.map((n, i) => (
                  <div
                    key={n.id}
                    className="panel"
                    style={{ border: "1px solid var(--line-soft)" }}
                  >
                    <h2>
                      {n.name}
                      <span className="hint">
                        Trigger: {n.trigger.replace(/_/g, " ")}
                      </span>
                    </h2>
                    <div className="form-body">
                      <div className="field-row">
                        <div className="field">
                          <label>Template Name</label>
                          <input
                            type="text"
                            value={n.name}
                            onChange={(e) => {
                              const updated = s.notifications.map((item, j) =>
                                j === i ? { ...item, name: e.target.value } : item,
                              );
                              setS((prev) => ({ ...prev, notifications: updated }));
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>Enabled</label>
                          <select
                            value={n.enabled ? "yes" : "no"}
                            onChange={(e) => {
                              const updated = s.notifications.map((item, j) =>
                                j === i ? { ...item, enabled: e.target.value === "yes" } : item,
                              );
                              setS((prev) => ({ ...prev, notifications: updated }));
                            }}
                          >
                            <option value="yes">Enabled</option>
                            <option value="no">Disabled</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label>Subject</label>
                        <input
                          type="text"
                          value={n.subject}
                          onChange={(e) => {
                            const updated = s.notifications.map((item, j) =>
                              j === i ? { ...item, subject: e.target.value } : item,
                            );
                            setS((prev) => ({ ...prev, notifications: updated }));
                          }}
                        />
                      </div>
                      <div className="field">
                        <label>Body</label>
                        <textarea
                          rows={3}
                          value={n.body}
                          onChange={(e) => {
                            const updated = s.notifications.map((item, j) =>
                              j === i ? { ...item, body: e.target.value } : item,
                            );
                            setS((prev) => ({ ...prev, notifications: updated }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "system" && (
            <div className="form-panel">
              <h2>System Status</h2>
              <div className="form-body">
                <div className="summary-row">
                  <span>Database</span>
                  <span className="status-pill ok">Connected (Supabase)</span>
                </div>
                <div className="summary-row">
                  <span>Vercel</span>
                  <span className="status-pill ok">Deployed</span>
                </div>
                <div className="summary-row">
                  <span>Active Units</span>
                  <span className="mono">
                    {UNITS.filter((u) => u.active).length} of {UNITS.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
