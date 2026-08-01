"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UNITS } from "../../../../../src/data/units.ts";

interface Photo {
  id: string;
  url: string;
  caption: string;
  isCover: boolean;
  order: number;
}

export default function PhotoAlbumPage() {
  const params = useParams();
  const unitId = params.id as string;
  const unit = UNITS.find((u) => u.id === unitId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");

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

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newPhotos: Photo[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (!file.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(file);
      newPhotos.push({
        id: `local-${Date.now()}-${i}`,
        url,
        caption: "",
        isCover: photos.length === 0 && i === 0,
        order: photos.length + i,
      });
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [photos.length],
  );

  function setCover(id: string) {
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, isCover: p.id === id })),
    );
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function saveCaption(id: string) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption: captionText } : p)),
    );
    setEditCaption(null);
    setCaptionText("");
  }

  function handleReorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    setPhotos((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((p) => p.id === fromId);
      const toIdx = arr.findIndex((p) => p.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item!);
      return arr.map((p, i) => ({ ...p, order: i }));
    });
    setDragOver(null);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link href={`/admin/units/${unit.id}`} className="back-link">
            &larr; {unit.tower}-{unit.code} {unit.name ?? ""}
          </Link>
          <h1 className="today">Photo Album</h1>
        </div>
        <button
          className="btn"
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          + Upload Photos
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
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
        <p>Drag and drop images here, or click Upload Photos above</p>
        <p className="drop-hint">
          JPG, PNG, WebP accepted. Photos are stored in Supabase Storage.
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="panel">
          <div className="form-body" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-3)", margin: 0 }}>
              No photos yet. Upload images from your{" "}
              <strong>Serin Rooms</strong> Google Drive folder.
            </p>
          </div>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`photo-card ${dragOver === photo.id ? "drag-over" : ""}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", photo.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(photo.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const fromId = e.dataTransfer.getData("text/plain");
                handleReorder(fromId, photo.id);
              }}
            >
              <div className="photo-img">
                <img src={photo.url} alt={photo.caption || "Unit photo"} />
                {photo.isCover && (
                  <span className="photo-cover-badge">Cover</span>
                )}
              </div>
              <div className="photo-actions">
                {editCaption === photo.id ? (
                  <div className="photo-caption-edit">
                    <input
                      type="text"
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      placeholder="Enter caption..."
                      onKeyDown={(e) => e.key === "Enter" && saveCaption(photo.id)}
                    />
                    <button
                      className="btn-sm btn-outline"
                      onClick={() => saveCaption(photo.id)}
                      type="button"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="photo-caption">
                      {photo.caption || "No caption"}
                    </span>
                    <div className="photo-btns">
                      <button
                        className="btn-xs"
                        onClick={() => {
                          setEditCaption(photo.id);
                          setCaptionText(photo.caption);
                        }}
                        type="button"
                      >
                        Caption
                      </button>
                      {!photo.isCover && (
                        <button
                          className="btn-xs"
                          onClick={() => setCover(photo.id)}
                          type="button"
                        >
                          Set Cover
                        </button>
                      )}
                      <button
                        className="btn-xs btn-danger"
                        onClick={() => removePhoto(photo.id)}
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
        Drag cards to reorder. The cover photo appears on the public listing and
        in booking confirmations. Photos will persist once Supabase Storage is
        connected.
      </p>
    </>
  );
}
