"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { UNITS } from "../../../../src/data/units.ts";

interface ChecklistCategory {
  category: string;
  items: string[];
}

interface CheckedItem {
  item: string;
  checked: boolean;
}

interface CheckedCategory {
  category: string;
  items: CheckedItem[];
}

interface ProofFile {
  path: string;
  fileName: string;
  isVideo: boolean;
}

interface CleaningLog {
  id: string;
  unit_id: string;
  items: CheckedCategory[];
  cleaned_by: string;
  notes: string | null;
  proof_urls: ProofFile[];
  cleaning_type: string;
  signed_at: string;
}

type CleaningType = "guest" | "monthly" | "quarterly" | "annual";

const TYPE_LABELS: Record<CleaningType, string> = {
  guest: "Guest Turnover",
  monthly: "Monthly Deep Clean",
  quarterly: "Quarterly Inspection",
  annual: "Annual Maintenance",
};

const TYPE_COLORS: Record<CleaningType, string> = {
  guest: "#2f5a1e",
  monthly: "#2980b9",
  quarterly: "#8e44ad",
  annual: "#c0392b",
};

const MOVE_BTN: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--line)",
  borderRadius: 4,
  width: 24,
  height: 24,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.7rem",
  color: "var(--text-2)",
  padding: 0,
};

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  const temp = next[i]!;
  next[i] = next[j]!;
  next[j] = temp;
  return next;
}

export default function CleaningUnitPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = params.unitId as string;
  const unit = UNITS.find((u) => u.id === unitId);
  const initialTab = searchParams.get("tab") === "template" ? "template" : "clean";

  const [tab, setTab] = useState<"clean" | "template" | "history">(initialTab);
  const [templates, setTemplates] = useState<Record<CleaningType, ChecklistCategory[]>>({
    guest: [], monthly: [], quarterly: [], annual: [],
  });
  const [cleaningType, setCleaningType] = useState<CleaningType>("guest");
  const [checklist, setChecklist] = useState<CheckedCategory[]>([]);
  const [cleanedBy, setCleanedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Proof upload state
  const [proofFiles, setProofFiles] = useState<{ file: File; preview: string; uploading: boolean; uploaded?: ProofFile }[]>([]);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Proof viewing state
  const [viewingProof, setViewingProof] = useState<{ url: string; isVideo: boolean } | null>(null);

  // Template editing state
  const [editType, setEditType] = useState<CleaningType>("guest");
  const [editTemplate, setEditTemplate] = useState<ChecklistCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newItems, setNewItems] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/cleaning-logs?unitId=${unitId}`)
      .then((r) => r.json())
      .then((d) => {
        const tmpls = d.templates as Record<CleaningType, ChecklistCategory[]>;
        setTemplates(tmpls);
        setEditTemplate(JSON.parse(JSON.stringify(tmpls.guest)));
        setChecklist(
          (tmpls.guest ?? []).map((c) => ({
            category: c.category,
            items: c.items.map((item) => ({ item, checked: false })),
          }))
        );
        setLogs(d.logs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [unitId]);

  function selectCleaningType(type: CleaningType) {
    setCleaningType(type);
    const tmpl = templates[type] ?? [];
    setChecklist(
      tmpl.map((c) => ({
        category: c.category,
        items: c.items.map((item) => ({ item, checked: false })),
      }))
    );
  }

  function selectEditType(type: CleaningType) {
    setEditType(type);
    setEditTemplate(JSON.parse(JSON.stringify(templates[type] ?? [])));
    setNewItems({});
    setNewCategory("");
  }

  function toggleItem(catIdx: number, itemIdx: number) {
    setChecklist((prev) =>
      prev.map((c, ci) =>
        ci === catIdx
          ? { ...c, items: c.items.map((it, ii) => ii === itemIdx ? { ...it, checked: !it.checked } : it) }
          : c
      )
    );
  }

  function checkAllInCategory(catIdx: number) {
    setChecklist((prev) =>
      prev.map((c, ci) =>
        ci === catIdx ? { ...c, items: c.items.map((it) => ({ ...it, checked: true })) } : c
      )
    );
  }

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    setUploadError("");
    const maxSize = 50 * 1024 * 1024;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime", "video/webm"];
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i);
      if (!f) continue;
      if (!allowed.includes(f.type)) { setUploadError("Only photos and videos allowed"); continue; }
      if (f.size > maxSize) { setUploadError("File too large (max 50MB)"); continue; }
      const preview = f.type.startsWith("video") ? "" : URL.createObjectURL(f);
      setProofFiles((prev) => [...prev, { file: f, preview, uploading: false }]);
    }
  }

  function removeProofFile(idx: number) {
    setProofFiles((prev) => {
      const item = prev[idx];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function uploadAllProofs(): Promise<ProofFile[]> {
    const results: ProofFile[] = [];
    for (let i = 0; i < proofFiles.length; i++) {
      const pf = proofFiles[i]!;
      if (pf.uploaded) { results.push(pf.uploaded); continue; }
      setProofFiles((prev) => prev.map((f, fi) => fi === i ? { ...f, uploading: true } : f));
      try {
        const fd = new FormData();
        fd.append("file", pf.file);
        const res = await fetch("/api/cleaning-proof", { method: "POST", body: fd });
        if (res.ok) {
          const data: ProofFile = await res.json();
          results.push(data);
          setProofFiles((prev) => prev.map((f, fi) => fi === i ? { ...f, uploading: false, uploaded: data } : f));
        }
      } catch { /* ignore */ }
    }
    return results;
  }

  async function handleSubmit() {
    if (!cleanedBy.trim()) { alert("Please enter your name"); return; }
    setSubmitting(true);
    try {
      const proofUrls = await uploadAllProofs();
      const res = await fetch("/api/cleaning-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          items: checklist,
          cleanedBy: cleanedBy.trim(),
          notes: notes.trim() || null,
          proofUrls,
          cleaningType,
        }),
      });
      if (res.ok) setSubmitted(true);
      else alert("Failed to save cleaning log");
    } catch { alert("Connection error"); }
    finally { setSubmitting(false); }
  }

  async function viewProof(proof: ProofFile) {
    try {
      const res = await fetch(`/api/cleaning-proof?path=${encodeURIComponent(proof.path)}`);
      if (res.ok) {
        const { url } = await res.json();
        setViewingProof({ url, isVideo: proof.isVideo });
      }
    } catch { /* ignore */ }
  }

  // Template editing
  function moveCategoryUp(idx: number) {
    if (idx === 0) return;
    setEditTemplate((prev) => swap(prev, idx, idx - 1));
  }
  function moveCategoryDown(idx: number) {
    setEditTemplate((prev) => idx >= prev.length - 1 ? prev : swap(prev, idx, idx + 1));
  }
  function moveItemUp(catIdx: number, itemIdx: number) {
    if (itemIdx === 0) return;
    setEditTemplate((prev) =>
      prev.map((c, ci) => ci === catIdx ? { ...c, items: swap(c.items, itemIdx, itemIdx - 1) } : c)
    );
  }
  function moveItemDown(catIdx: number, itemIdx: number) {
    setEditTemplate((prev) =>
      prev.map((c, ci) => ci === catIdx && itemIdx < c.items.length - 1
        ? { ...c, items: swap(c.items, itemIdx, itemIdx + 1) } : c)
    );
  }
  function addCategory() {
    if (!newCategory.trim()) return;
    setEditTemplate((prev) => [...prev, { category: newCategory.trim(), items: [] }]);
    setNewCategory("");
  }
  function removeCategory(idx: number) {
    setEditTemplate((prev) => prev.filter((_, i) => i !== idx));
  }
  function addItemToCategory(catIdx: number) {
    const text = newItems[catIdx]?.trim();
    if (!text) return;
    setEditTemplate((prev) =>
      prev.map((c, i) => i === catIdx ? { ...c, items: [...c.items, text] } : c)
    );
    setNewItems((prev) => ({ ...prev, [catIdx]: "" }));
  }
  function removeItem(catIdx: number, itemIdx: number) {
    setEditTemplate((prev) =>
      prev.map((c, ci) => ci === catIdx ? { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) } : c)
    );
  }

  async function handleSaveTemplate() {
    setTemplateSaving(true);
    setTemplateSaved(false);
    try {
      const res = await fetch("/api/cleaning-logs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, template: editTemplate, cleaningType: editType }),
      });
      if (res.ok) {
        setTemplates((prev) => ({ ...prev, [editType]: JSON.parse(JSON.stringify(editTemplate)) }));
        if (editType === cleaningType) {
          setChecklist(
            editTemplate.map((c) => ({
              category: c.category,
              items: c.items.map((item) => ({ item, checked: false })),
            }))
          );
        }
        setTemplateSaved(true);
        setTimeout(() => setTemplateSaved(false), 3000);
      } else {
        alert("Failed to save template");
      }
    } catch { alert("Connection error"); }
    finally { setTemplateSaving(false); }
  }

  if (!unit) {
    return (
      <div className="panel">
        <div className="form-body">
          <p>Unit not found: {unitId}</p>
          <Link href="/admin/cleaning" className="btn-outline">Back</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  const totalItems = checklist.reduce((s, c) => s + c.items.length, 0);
  const checkedItems = checklist.reduce((s, c) => s + c.items.filter((i) => i.checked).length, 0);
  const allChecked = totalItems > 0 && checkedItems === totalItems;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin/cleaning" className="back-link">&larr; All Units</Link>
          <h1 className="today">
            {unit.name || `${unit.tower}-${unit.code}`} — Cleaning
          </h1>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["clean", "template", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "btn" : "btn-outline"}
            style={{ fontSize: "0.85rem" }}
            type="button"
          >
            {t === "clean" ? "Clean Now" : t === "template" ? "Edit Checklist" : "History"}
          </button>
        ))}
      </div>

      {/* ============ CLEAN NOW TAB ============ */}
      {tab === "clean" && (
        submitted ? (
          <div className="panel" style={{ textAlign: "center", padding: "3rem 2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>&#10003;</div>
            <h2 style={{ color: "var(--good, #27ae60)", margin: "0 0 0.5rem" }}>Cleaning Complete!</h2>
            <p style={{ color: "var(--text-2)", marginBottom: "1.5rem" }}>
              <span style={{ background: TYPE_COLORS[cleaningType], color: "#fff", padding: "0.15rem 0.5rem", borderRadius: 9, fontSize: "0.72rem", fontWeight: 600 }}>
                {TYPE_LABELS[cleaningType]}
              </span>
              {" "}signed off by <strong>{cleanedBy}</strong> &middot; {checkedItems}/{totalItems} items
              {proofFiles.length > 0 && <> &middot; {proofFiles.length} proof file{proofFiles.length !== 1 ? "s" : ""}</>}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <Link href="/admin/cleaning" className="btn-outline">Back to Units</Link>
              <button
                className="btn"
                onClick={() => {
                  setSubmitted(false);
                  selectCleaningType(cleaningType);
                  setCleanedBy("");
                  setNotes("");
                  setProofFiles([]);
                }}
                type="button"
              >
                Clean Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Cleaning type selector */}
            <div className="form-panel" style={{ marginBottom: "1rem" }}>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Cleaning Type</h2>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {(Object.keys(TYPE_LABELS) as CleaningType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => selectCleaningType(type)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      borderRadius: 8,
                      border: cleaningType === type ? "2px solid " + TYPE_COLORS[type] : "1px solid var(--line)",
                      background: cleaningType === type ? TYPE_COLORS[type] + "18" : "none",
                      color: cleaningType === type ? TYPE_COLORS[type] : "var(--text-2)",
                      cursor: "pointer",
                    }}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.35rem" }}>
                <span style={{ fontWeight: 600 }}>{checkedItems} / {totalItems} items checked</span>
                <span style={{ color: allChecked ? "var(--good)" : "var(--text-3)" }}>
                  {totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0}%
                </span>
              </div>
              <div style={{ height: "8px", background: "var(--surface-2)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%`,
                    background: allChecked ? "var(--good, #27ae60)" : TYPE_COLORS[cleaningType],
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Checklist categories */}
            {checklist.map((cat, catIdx) => {
              const catChecked = cat.items.filter((i) => i.checked).length;
              const catTotal = cat.items.length;
              const catDone = catTotal > 0 && catChecked === catTotal;
              return (
                <div
                  key={cat.category + catIdx}
                  className="form-panel"
                  style={{
                    marginBottom: "1rem",
                    borderLeft: catDone ? "3px solid var(--good)" : "3px solid var(--line-soft)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: "0.95rem" }}>
                      {cat.category}
                      <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "var(--text-3)", marginLeft: "0.5rem" }}>
                        {catChecked}/{catTotal}
                      </span>
                    </h2>
                    {!catDone && (
                      <button
                        type="button"
                        onClick={() => checkAllInCategory(catIdx)}
                        style={{
                          fontSize: "0.72rem", color: "var(--accent)", background: "none",
                          border: "1px solid var(--accent)", borderRadius: "6px",
                          padding: "0.2rem 0.5rem", cursor: "pointer",
                        }}
                      >
                        Check All
                      </button>
                    )}
                  </div>
                  <div className="form-body" style={{ paddingTop: "0.5rem" }}>
                    {cat.items.map((it, itemIdx) => (
                      <label
                        key={itemIdx}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.6rem",
                          padding: "0.45rem 0",
                          borderBottom: itemIdx < cat.items.length - 1 ? "1px solid var(--line-soft)" : "none",
                          cursor: "pointer", fontSize: "0.88rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={it.checked}
                          onChange={() => toggleItem(catIdx, itemIdx)}
                          style={{ width: "1.1rem", height: "1.1rem", accentColor: TYPE_COLORS[cleaningType] }}
                        />
                        <span style={{
                          textDecoration: it.checked ? "line-through" : "none",
                          color: it.checked ? "var(--text-3)" : "var(--text)",
                        }}>
                          {it.item}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Sign off section */}
            <div className="form-panel" style={{ borderLeft: `3px solid ${TYPE_COLORS[cleaningType]}` }}>
              <h2 style={{ margin: 0, fontSize: "0.95rem" }}>Sign Off</h2>
              <div className="form-body" style={{ paddingTop: "0.75rem" }}>
                <div className="field">
                  <label style={{ fontWeight: 600 }}>Your Name *</label>
                  <input
                    type="text"
                    value={cleanedBy}
                    onChange={(e) => setCleanedBy(e.target.value)}
                    placeholder="e.g. April, Ate Jona, Mark"
                    style={{ fontSize: "1rem" }}
                  />
                </div>
                <div className="field">
                  <label>Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any issues found, items needing replacement, maintenance needed..."
                  />
                </div>

                {/* Proof upload */}
                <div className="field">
                  <label style={{ fontWeight: 600 }}>Photo / Video Proof</label>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "var(--text-3)" }}>
                    Take photos or record a short video of the cleaned unit as proof.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      style={{
                        padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600,
                        background: TYPE_COLORS[cleaningType], color: "#fff", border: "none",
                        borderRadius: 6, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "0.35rem",
                      }}
                    >
                      &#128247; Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600,
                        background: "none", color: TYPE_COLORS[cleaningType],
                        border: `1px solid ${TYPE_COLORS[cleaningType]}`,
                        borderRadius: 6, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "0.35rem",
                      }}
                    >
                      &#128194; Upload File
                    </button>
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" onChange={(e) => handleFileSelect(e.target.files)} style={{ display: "none" }} />
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple onChange={(e) => handleFileSelect(e.target.files)} style={{ display: "none" }} />
                  {uploadError && <p style={{ color: "var(--crit)", fontSize: "0.78rem", margin: "0.35rem 0 0" }}>{uploadError}</p>}
                </div>

                {proofFiles.length > 0 && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    {proofFiles.map((pf, idx) => (
                      <div key={idx} style={{
                        position: "relative", width: 90, height: 90, borderRadius: 8, overflow: "hidden",
                        border: pf.uploaded ? "2px solid var(--good)" : "2px solid var(--line)",
                        background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {pf.file.type.startsWith("video") ? (
                          <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "1.8rem" }}>&#127909;</span>
                            <p style={{ margin: 0, fontSize: "0.6rem", color: "var(--text-3)" }}>Video</p>
                          </div>
                        ) : (
                          <img src={pf.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                        {pf.uploading && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>
                            Uploading...
                          </div>
                        )}
                        {pf.uploaded && (
                          <div style={{ position: "absolute", top: 4, left: 4, background: "var(--good)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>
                            &#10003;
                          </div>
                        )}
                        <button type="button" onClick={() => removeProofFile(idx)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: "0.75rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="btn"
                  onClick={handleSubmit}
                  disabled={submitting || !cleanedBy.trim()}
                  style={{
                    width: "100%", padding: "0.75rem", fontSize: "1rem", fontWeight: 700,
                    marginTop: "0.75rem", opacity: cleanedBy.trim() ? 1 : 0.5,
                    background: TYPE_COLORS[cleaningType],
                  }}
                  type="button"
                >
                  {submitting ? "Uploading & Saving..." : `Sign Off — ${checkedItems}/${totalItems} Items Checked`}
                </button>
              </div>
            </div>
          </>
        )
      )}

      {/* ============ TEMPLATE EDITOR TAB ============ */}
      {tab === "template" && (
        <div className="form-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ margin: 0 }}>Checklist Template</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {templateSaved && <span style={{ fontSize: "0.82rem", color: "var(--good)" }}>Saved!</span>}
              <button className="btn" onClick={handleSaveTemplate} disabled={templateSaving} type="button">
                {templateSaving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
          <div className="form-body" style={{ paddingTop: "0.75rem" }}>
            {/* Type selector */}
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {(Object.keys(TYPE_LABELS) as CleaningType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectEditType(type)}
                  style={{
                    padding: "0.35rem 0.7rem", fontSize: "0.78rem", fontWeight: 600, borderRadius: 6,
                    border: editType === type ? `2px solid ${TYPE_COLORS[type]}` : "1px solid var(--line)",
                    background: editType === type ? TYPE_COLORS[type] + "18" : "none",
                    color: editType === type ? TYPE_COLORS[type] : "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: "0 0 1rem" }}>
              Customize the checklist for <strong>{TYPE_LABELS[editType]}</strong>. Drag categories and items to reorder, or use the arrow buttons.
            </p>

            {/* Categories */}
            {editTemplate.map((cat, catIdx) => (
              <div
                key={catIdx}
                style={{
                  marginBottom: "1rem", padding: "0.75rem",
                  background: "var(--surface-2)", borderRadius: 8,
                  borderLeft: `3px solid ${TYPE_COLORS[editType]}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", gap: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button type="button" onClick={() => moveCategoryUp(catIdx)} disabled={catIdx === 0} style={{ ...MOVE_BTN, opacity: catIdx === 0 ? 0.3 : 1 }} title="Move up">&#9650;</button>
                      <button type="button" onClick={() => moveCategoryDown(catIdx)} disabled={catIdx === editTemplate.length - 1} style={{ ...MOVE_BTN, opacity: catIdx === editTemplate.length - 1 ? 0.3 : 1 }} title="Move down">&#9660;</button>
                    </div>
                    <strong style={{ fontSize: "0.9rem" }}>{cat.category}</strong>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>({cat.items.length} items)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCategory(catIdx)}
                    style={{
                      fontSize: "0.68rem", color: "var(--crit)", background: "none",
                      border: "1px solid var(--crit)", borderRadius: 5,
                      padding: "0.15rem 0.4rem", cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    Remove
                  </button>
                </div>

                {cat.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.35rem",
                      padding: "0.25rem 0", borderBottom: "1px solid var(--line-soft)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <div style={{ display: "flex", gap: 2 }}>
                      <button type="button" onClick={() => moveItemUp(catIdx, itemIdx)} disabled={itemIdx === 0} style={{ ...MOVE_BTN, width: 20, height: 20, opacity: itemIdx === 0 ? 0.3 : 1 }} title="Move up">&#9650;</button>
                      <button type="button" onClick={() => moveItemDown(catIdx, itemIdx)} disabled={itemIdx === cat.items.length - 1} style={{ ...MOVE_BTN, width: 20, height: 20, opacity: itemIdx === cat.items.length - 1 ? 0.3 : 1 }} title="Move down">&#9660;</button>
                    </div>
                    <span style={{ flex: 1 }}>{item}</span>
                    <button type="button" onClick={() => removeItem(catIdx, itemIdx)} style={{ fontSize: "0.82rem", color: "var(--crit)", background: "none", border: "none", cursor: "pointer", padding: "0 0.25rem" }}>
                      &times;
                    </button>
                  </div>
                ))}

                <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem" }}>
                  <input
                    type="text"
                    value={newItems[catIdx] ?? ""}
                    onChange={(e) => setNewItems((prev) => ({ ...prev, [catIdx]: e.target.value }))}
                    placeholder="Add item..."
                    style={{ flex: 1, fontSize: "0.8rem" }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItemToCategory(catIdx); } }}
                  />
                  <button type="button" className="btn-outline btn-sm" onClick={() => addItemToCategory(catIdx)}>Add</button>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem" }}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name..."
                style={{ flex: 1, fontSize: "0.85rem" }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
              />
              <button type="button" className="btn-outline" onClick={addCategory}>+ Category</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ HISTORY TAB ============ */}
      {tab === "history" && (
        <div className="form-panel">
          <h2>Cleaning History</h2>
          <div className="form-body">
            {logs.length === 0 ? (
              <p style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>No cleaning records yet.</p>
            ) : (
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Cleaned By</th>
                      <th>Items</th>
                      <th>Notes</th>
                      <th>Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const total = log.items?.reduce((s, c) => s + c.items.length, 0) ?? 0;
                      const checked = log.items?.reduce((s, c) => s + c.items.filter((i) => i.checked).length, 0) ?? 0;
                      const proofs = log.proof_urls ?? [];
                      const logType = (log.cleaning_type || "guest") as CleaningType;
                      return (
                        <tr key={log.id}>
                          <td className="mono" style={{ whiteSpace: "nowrap" }}>
                            {new Date(log.signed_at).toLocaleDateString()}{" "}
                            {new Date(log.signed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td>
                            <span style={{
                              fontSize: "0.68rem", fontWeight: 600, color: "#fff",
                              background: TYPE_COLORS[logType] ?? "#666",
                              padding: "0.15rem 0.45rem", borderRadius: 9, whiteSpace: "nowrap",
                            }}>
                              {TYPE_LABELS[logType] ?? logType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{log.cleaned_by}</td>
                          <td>
                            <span style={{
                              fontSize: "0.72rem", fontWeight: 600, color: "#fff",
                              background: checked === total ? "var(--good)" : "var(--warn, #f39c12)",
                              padding: "0.15rem 0.5rem", borderRadius: 9,
                            }}>
                              {checked}/{total}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{log.notes || "—"}</td>
                          <td>
                            {proofs.length > 0 ? (
                              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                                {proofs.map((p, pi) => (
                                  <button key={pi} type="button" onClick={() => viewProof(p)} style={{
                                    fontSize: "0.68rem", fontWeight: 600, padding: "0.15rem 0.4rem",
                                    borderRadius: 5, border: "1px solid var(--accent)", background: "none",
                                    color: "var(--accent)", cursor: "pointer", whiteSpace: "nowrap",
                                  }}>
                                    {p.isVideo ? "Video" : "Photo"} {pi + 1}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof viewer modal */}
      {viewingProof && (
        <div
          onClick={() => setViewingProof(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }}>
            <button type="button" onClick={() => setViewingProof(null)} style={{ position: "absolute", top: -12, right: -12, zIndex: 1, background: "#fff", color: "#000", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: "1.2rem", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              &times;
            </button>
            {viewingProof.isVideo ? (
              <video src={viewingProof.url} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8 }} />
            ) : (
              <img src={viewingProof.url} alt="Cleaning proof" style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8, objectFit: "contain" }} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
