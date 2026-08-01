"use client";

import { useState } from "react";
import { UNITS } from "../../../src/data/units.ts";
import { formatPHP } from "../../../src/lib/pricing.ts";
import { getSettings, type SystemSettings } from "../../../src/lib/settings.ts";

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
  const initial = getSettings();
  const [tab, setTab] = useState<Tab>("business");
  const [s, setS] = useState<SystemSettings>(initial);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof SystemSettings>(
    section: K,
    patch: Partial<SystemSettings[K]>,
  ) {
    setS((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

  return (
    <>
      <div className="page-head">
        <h1 className="today">Settings</h1>
        <button className="btn" onClick={save} type="button">
          Save All Changes
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
          <strong>Saved.</strong> Changes will persist once the database is
          connected.
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
              <h2>Payment Settings</h2>
              <div className="form-body">
                <div className="field">
                  <label>Accepted Payment Methods (comma-separated)</label>
                  <input
                    type="text"
                    value={s.payment.methods.join(", ")}
                    onChange={(e) =>
                      update("payment", {
                        methods: e.target.value.split(",").map((m) => m.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="sep" />
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 700, margin: "0.5rem 0 0.25rem" }}>
                  GCash
                </p>
                <div className="field-row">
                  <div className="field">
                    <label>Account Name</label>
                    <input
                      type="text"
                      value={s.payment.gcashName}
                      onChange={(e) => update("payment", { gcashName: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Number</label>
                    <input
                      type="text"
                      value={s.payment.gcashNumber}
                      onChange={(e) => update("payment", { gcashNumber: e.target.value })}
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                </div>
                <div className="sep" />
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 700, margin: "0.5rem 0 0.25rem" }}>
                  Bank Transfer
                </p>
                <div className="field">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={s.payment.bankName}
                    onChange={(e) => update("payment", { bankName: e.target.value })}
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Account Name</label>
                    <input
                      type="text"
                      value={s.payment.bankAccountName}
                      onChange={(e) =>
                        update("payment", { bankAccountName: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={s.payment.bankAccountNumber}
                      onChange={(e) =>
                        update("payment", { bankAccountNumber: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="sep" />
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
                  Individual units can add their own rules from the Unit Settings
                  page.
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
                  These statuses are used throughout the system. The database
                  enforces them via an enum type. Adding or removing statuses
                  requires a migration.
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
                              const updated = [...s.notifications];
                              updated[i] = { ...n, name: e.target.value };
                              setS((prev) => ({ ...prev, notifications: updated }));
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>Enabled</label>
                          <select
                            value={n.enabled ? "yes" : "no"}
                            onChange={(e) => {
                              const updated = [...s.notifications];
                              updated[i] = { ...n, enabled: e.target.value === "yes" };
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
                            const updated = [...s.notifications];
                            updated[i] = { ...n, subject: e.target.value };
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
                            const updated = [...s.notifications];
                            updated[i] = { ...n, body: e.target.value };
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
                  <span className="status-pill warn">Not connected</span>
                </div>
                <div className="summary-row">
                  <span>Data Source</span>
                  <span className="mono">CSV files (local)</span>
                </div>
                <div className="summary-row">
                  <span>iCal Sync</span>
                  <span className="status-pill warn">Pending setup</span>
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
                <div className="sep" />
                <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: 0 }}>
                  To connect the database: create a Supabase project (Singapore
                  region), fill <code>.env.local</code>, run the migrations, then
                  redeploy. All settings will persist to the database
                  automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
