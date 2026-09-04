"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UNITS } from "../../../../../src/data/units.ts";

interface Media {
  id: string;
  type: "photo" | "video" | "youtube";
  driveId?: string;
  storagePath?: string;
  url: string;
  thumb: string;
  caption: string;
  isCover: boolean;
  videoUrl?: string;
  youtubeId?: string;
}

function extractYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ??
    url.match(/^([a-zA-Z0-9_-]{11})$/);
  return m?.[1] ?? null;
}

export default function PhotoAlbumPage() {
  const params = useParams();
  const unitId = params.id as string;
  const unit = UNITS.find((u) => u.id === unitId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [ytInput, setYtInput] = useState("");
  const [showYtForm, setShowYtForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    coverIndex: number;
    order: number[];
    reasoning: string;
  } | null>(null);

  useEffect(() => {
    if (!unitId) return;
    fetch(`/api/units/${unitId}/photos`)
      .then((r) => r.json())
      .then((data: Media[]) => {
        setMedia(
          data.map((p, i) => ({
            ...p,
            id: p.id || `media-${i}`,
            type: p.type || "photo",
          })),
        );
      })
      .catch(() => setStatus("Failed to load"))
      .finally(() => setLoading(false));
  }, [unitId]);

  async function persistMedia(updated: Media[]) {
    setSaving(true);
    setStatus(null);
    try {
      const payload = updated.map((p) => ({
        type: p.type,
        driveId: p.driveId,
        storagePath: p.storagePath,
        url: p.url,
        thumb: p.thumb,
        caption: p.caption,
        isCover: p.isCover,
        videoUrl: p.videoUrl,
        youtubeId: p.youtubeId,
      }));
      const res = await fetch(`/api/units/${unitId}/photos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("Saved");
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function compressImage(file: File, maxDim = 2000, quality = 0.85): Promise<File> {
    return new Promise((resolve) => {
      if (file.size <= 3 * 1024 * 1024) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size <= 4 * 1024 * 1024) {
          resolve(file);
          return;
        }
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const compressed = new File([blob], file.name, { type: "image/jpeg" });
            resolve(compressed);
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatus(null);
    const newItems: Media[] = [];
    const total = files.length;
    let uploaded = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;

      setStatus(`Uploading ${i + 1} of ${total}...`);

      const uploadFile = isImage ? await compressImage(file) : file;

      const form = new FormData();
      form.append("file", uploadFile);

      try {
        const res = await fetch(`/api/units/${unitId}/photos`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          failed++;
          setStatus(`Failed ${file.name}: ${err.error}`);
          continue;
        }
        const data = await res.json();
        uploaded++;
        newItems.push({
          id: `upload-${Date.now()}-${i}`,
          type: data.type || (isVideo ? "video" : "photo"),
          storagePath: data.storagePath,
          url: data.url,
          thumb: data.thumb || "",
          caption: "",
          isCover: media.length === 0 && newItems.length === 0 && !isVideo,
        });
      } catch {
        failed++;
      }
    }

    if (newItems.length > 0) {
      const updated = [...media, ...newItems];
      setMedia(updated);
      await persistMedia(updated);
    }
    setStatus(
      failed > 0
        ? `Uploaded ${uploaded}, failed ${failed} of ${total}`
        : `${uploaded} photo${uploaded !== 1 ? "s" : ""} uploaded`,
    );
    setTimeout(() => setStatus(null), 4000);
    setUploading(false);
  }

  function addYouTube() {
    const ytId = extractYouTubeId(ytInput.trim());
    if (!ytId) {
      setStatus("Invalid YouTube URL");
      return;
    }
    const item: Media = {
      id: `yt-${Date.now()}`,
      type: "youtube",
      url: `https://www.youtube.com/embed/${ytId}`,
      thumb: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
      caption: "",
      isCover: false,
      youtubeId: ytId,
    };
    const updated = [...media, item];
    setMedia(updated);
    setYtInput("");
    setShowYtForm(false);
    persistMedia(updated);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [media.length, unitId],
  );

  function setCover(id: string) {
    const updated = media.map((p) => ({ ...p, isCover: p.id === id }));
    setMedia(updated);
    persistMedia(updated);
  }

  function removeItem(id: string) {
    const updated = media.filter((p) => p.id !== id);
    setMedia(updated);
    persistMedia(updated);
  }

  function saveCaption(id: string) {
    const updated = media.map((p) =>
      p.id === id ? { ...p, caption: captionText } : p,
    );
    setMedia(updated);
    setEditCaption(null);
    setCaptionText("");
    persistMedia(updated);
  }

  async function requestAiSuggestion() {
    if (media.length < 2) return;
    setAiLoading(true);
    setAiSuggestion(null);
    setStatus(null);
    try {
      const photos = media.map((m, i) => ({
        idx: i,
        url: m.url,
        thumb: m.thumb || m.url,
        type: m.type,
      }));
      const res = await fetch(`/api/units/${unitId}/photos/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "AI suggestion failed");
        return;
      }
      setAiSuggestion(data);
    } catch {
      setStatus("AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;
    const reordered: Media[] = aiSuggestion.order.map((idx) => media[idx]!);
    const withCover = reordered.map((m, i) => ({
      ...m,
      isCover: i === 0,
    }));
    setMedia(withCover);
    setAiSuggestion(null);
    persistMedia(withCover);
  }

  function handleReorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const arr = [...media];
    const fromIdx = arr.findIndex((p) => p.id === fromId);
    const toIdx = arr.findIndex((p) => p.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item!);
    setMedia(arr);
    setDragOver(null);
    persistMedia(arr);
  }

  if (!unit) {
    return (
      <div className="panel">
        <div className="form-body">
          <p>Unit not found.</p>
          <Link href="/admin/units" className="btn-outline">
            Back to Units
          </Link>
        </div>
      </div>
    );
  }

  const photoCount = media.filter((m) => m.type !== "youtube" && m.type !== "video").length;
  const videoCount = media.filter((m) => m.type === "video" || m.type === "youtube").length;

  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/admin/units/${unit.id}`} className="back-link">
            &larr; {unit.tower}-{unit.code} {unit.name ?? ""}
          </Link>
          <h1 className="today">Photos & Videos</h1>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-3)" }}>
            {photoCount} photo{photoCount !== 1 ? "s" : ""}, {videoCount} video{videoCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {saving && <span style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>Saving...</span>}
          {status && (
            <span
              style={{
                color: status === "Saved" ? "var(--good)" : "var(--crit, #c00)",
                fontSize: "0.85rem",
              }}
            >
              {status}
            </span>
          )}
          <button
            className="btn-outline"
            onClick={requestAiSuggestion}
            type="button"
            disabled={aiLoading || media.filter((m) => m.type === "photo").length < 2}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            {aiLoading ? (
              <>
                <span className="spinner-sm" /> Analyzing...
              </>
            ) : (
              <>✨ AI Suggest</>
            )}
          </button>
          <button
            className="btn-outline"
            onClick={() => setShowYtForm(!showYtForm)}
            type="button"
          >
            + YouTube
          </button>
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
            type="button"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "+ Upload"}
          </button>
        </div>
      </div>

      {showYtForm && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            background: "var(--surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1rem",
            alignItems: "center",
          }}
        >
          <input
            type="url"
            placeholder="Paste YouTube URL (e.g. https://youtube.com/watch?v=...)"
            value={ytInput}
            onChange={(e) => setYtInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addYouTube()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-sm" onClick={addYouTube} type="button">
            Add Video
          </button>
          <button
            className="btn-outline btn-sm"
            onClick={() => {
              setShowYtForm(false);
              setYtInput("");
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      {aiSuggestion && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0f9f0, #e8f5e8)",
            border: "2px solid var(--accent, #2d5a27)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <strong style={{ fontSize: "0.95rem" }}>✨ AI Recommendation</strong>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--text-2)" }}>
                {aiSuggestion.reasoning}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <button className="btn btn-sm" onClick={applyAiSuggestion} type="button">
                Apply Changes
              </button>
              <button
                className="btn-outline btn-sm"
                onClick={() => setAiSuggestion(null)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "0.5rem" }}>
            {aiSuggestion.order.map((idx, pos) => {
              const item = media[idx];
              if (!item) return null;
              return (
                <div key={idx} style={{ position: "relative", flexShrink: 0, width: "100px", height: "75px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumb || item.url}
                    alt={`Suggested #${pos + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "4px",
                      border: pos === 0 ? "2px solid var(--accent, #2d5a27)" : "1px solid var(--line-soft)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: "2px",
                      left: "4px",
                      background: pos === 0 ? "var(--accent, #2d5a27)" : "rgba(0,0,0,0.6)",
                      color: "#fff",
                      fontSize: "9px",
                      padding: "1px 5px",
                      borderRadius: "2px",
                      fontWeight: 600,
                    }}
                  >
                    {pos === 0 ? "COVER" : `#${pos + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        className={`drop-zone ${dragging ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <p>Drag and drop images or videos here, or use the buttons above</p>
        <p className="drop-hint">
          Photos: JPG, PNG, WebP (max 10MB). Videos: MP4, MOV, WebM (max 100MB). Or add YouTube links.
        </p>
      </div>

      {loading ? (
        <div className="panel">
          <div className="form-body" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-3)", margin: 0 }}>Loading media...</p>
          </div>
        </div>
      ) : media.length === 0 ? (
        <div className="panel">
          <div className="form-body" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-3)", margin: 0 }}>
              No photos or videos yet. Upload files or add YouTube links to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="photo-grid">
          {media.map((item) => (
            <div
              key={item.id}
              className={`photo-card ${dragOver === item.id ? "drag-over" : ""}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(item.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const fromId = e.dataTransfer.getData("text/plain");
                handleReorder(fromId, item.id);
              }}
            >
              <div className="photo-img">
                {item.type === "youtube" ? (
                  <div style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumb}
                      alt={item.caption || "YouTube video"}
                    />
                    <span className="media-type-badge video-badge">YouTube</span>
                  </div>
                ) : item.type === "video" ? (
                  <div style={{ position: "relative" }}>
                    <video
                      src={item.url}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      muted
                      preload="metadata"
                    />
                    <span className="media-type-badge video-badge">Video</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumb || item.url} alt={item.caption || "Unit photo"} />
                  </>
                )}
                {item.isCover && <span className="photo-cover-badge">Cover</span>}
              </div>
              <div className="photo-actions">
                {editCaption === item.id ? (
                  <div className="photo-caption-edit">
                    <input
                      type="text"
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      placeholder="Enter caption..."
                      onKeyDown={(e) => e.key === "Enter" && saveCaption(item.id)}
                    />
                    <button
                      className="btn-sm btn-outline"
                      onClick={() => saveCaption(item.id)}
                      type="button"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="photo-caption">
                      {item.caption || "No caption"}
                    </span>
                    <div className="photo-btns">
                      <button
                        className="btn-xs"
                        onClick={() => {
                          setEditCaption(item.id);
                          setCaptionText(item.caption);
                        }}
                        type="button"
                      >
                        Caption
                      </button>
                      {!item.isCover && item.type === "photo" && (
                        <button className="btn-xs" onClick={() => setCover(item.id)} type="button">
                          Set Cover
                        </button>
                      )}
                      <button
                        className="btn-xs btn-danger"
                        onClick={() => removeItem(item.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="foot">
        Drag cards to reorder. The cover photo appears on the public listing.
        Videos and YouTube links display on the unit detail page. All changes save automatically.
      </p>
    </>
  );
}
