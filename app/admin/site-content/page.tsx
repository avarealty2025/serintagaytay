"use client";

import { useState, useEffect, useRef } from "react";
import type { SiteContent } from "../../../src/data/site-content.ts";

function updateAt<T>(arr: T[], idx: number, patch: Partial<T>): T[] {
  return arr.map((item, j) => (j === idx ? { ...item, ...patch } : item));
}

function extractYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ??
    url.match(/^([a-zA-Z0-9_-]{11})$/);
  return m?.[1] ?? null;
}

function MediaUpload({
  photoUrl,
  videoUrl,
  youtubeId,
  mediaType,
  label,
  onUpdate,
}: {
  photoUrl?: string;
  videoUrl?: string;
  youtubeId?: string;
  mediaType?: "photo" | "video" | "youtube";
  label: string;
  onUpdate: (patch: {
    photoUrl?: string;
    videoUrl?: string;
    youtubeId?: string;
    mediaType?: "photo" | "video" | "youtube";
  }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ytInput, setYtInput] = useState("");
  const [showYt, setShowYt] = useState(false);

  const hasMedia = photoUrl || videoUrl || youtubeId;
  const currentType = mediaType || (videoUrl ? "video" : youtubeId ? "youtube" : "photo");

  async function handleFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("section", "experience");
      const res = await fetch("/api/site-content/upload", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
        return;
      }
      const data = await res.json();
      if (isVideo) {
        onUpdate({ videoUrl: data.url, photoUrl: undefined, youtubeId: undefined, mediaType: "video" });
      } else {
        onUpdate({ photoUrl: data.url, videoUrl: undefined, youtubeId: undefined, mediaType: "photo" });
      }
    } catch {
      alert("Upload error");
    } finally {
      setUploading(false);
    }
  }

  function addYouTube() {
    const id = extractYouTubeId(ytInput.trim());
    if (!id) {
      alert("Invalid YouTube URL");
      return;
    }
    onUpdate({
      youtubeId: id,
      photoUrl: undefined,
      videoUrl: undefined,
      mediaType: "youtube",
    });
    setYtInput("");
    setShowYt(false);
  }

  function clearMedia() {
    onUpdate({ photoUrl: undefined, videoUrl: undefined, youtubeId: undefined, mediaType: undefined });
  }

  return (
    <div className="field" style={{ marginTop: "0.5rem" }}>
      <label>{label}</label>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
        {hasMedia && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            {currentType === "youtube" && youtubeId ? (
              <div style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                  alt="YouTube"
                  style={{
                    width: 100,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--line-soft)",
                  }}
                />
                <span style={{
                  position: "absolute", bottom: 2, right: 2,
                  fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase",
                  background: "rgba(0,0,0,0.65)", color: "#fff",
                  padding: "1px 4px", borderRadius: 2,
                }}>YouTube</span>
              </div>
            ) : currentType === "video" && videoUrl ? (
              <div style={{ position: "relative" }}>
                <video
                  src={videoUrl}
                  muted
                  preload="metadata"
                  style={{
                    width: 100,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--line-soft)",
                  }}
                />
                <span style={{
                  position: "absolute", bottom: 2, right: 2,
                  fontSize: "0.5rem", fontWeight: 700, textTransform: "uppercase",
                  background: "rgba(0,0,0,0.65)", color: "#fff",
                  padding: "1px 4px", borderRadius: 2,
                }}>Video</span>
              </div>
            ) : photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Current"
                style={{
                  width: 100,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--line-soft)",
                }}
              />
            ) : null}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            className="btn-outline btn-sm"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : hasMedia ? "Change Photo/Video" : "Upload Photo/Video"}
          </button>
          <button
            className="btn-outline btn-sm"
            type="button"
            onClick={() => setShowYt(!showYt)}
          >
            {showYt ? "Cancel YouTube" : "Add YouTube Link"}
          </button>
          {hasMedia && (
            <button
              className="btn-outline btn-sm"
              type="button"
              style={{ color: "var(--crit)", borderColor: "var(--crit)" }}
              onClick={clearMedia}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {showYt && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
          <input
            type="url"
            placeholder="Paste YouTube URL..."
            value={ytInput}
            onChange={(e) => setYtInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addYouTube()}
            style={{ flex: 1, fontSize: "0.85rem" }}
          />
          <button className="btn btn-sm" onClick={addYouTube} type="button">
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<
    "hero" | "why" | "amenities" | "attractions" | "faq" | "trust" | "featured"
  >("hero");

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => r.json())
      .then((d) => setContent(d.content))
      .catch(() => {});
  }, []);

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    try {
      const res = await fetch("/api/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Failed to save");
      }
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!content) {
    return (
      <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
        Loading site content...
      </div>
    );
  }

  const tabs = [
    { key: "hero" as const, label: "Hero" },
    { key: "why" as const, label: "Why Section" },
    { key: "amenities" as const, label: "Amenities" },
    { key: "attractions" as const, label: "Attractions" },
    { key: "faq" as const, label: "FAQ" },
    { key: "trust" as const, label: "Trust Strip" },
    { key: "featured" as const, label: "Featured Units" },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="today">Site Content</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-2)" }}>
            Edit the public website text, sections, and content.
          </p>
        </div>
        <button
          className="btn"
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save All Changes"}
        </button>
      </div>

      {saved && (
        <div
          className="notice"
          style={{
            borderLeftColor: "var(--good)",
            background: "color-mix(in srgb, var(--good) 12%, transparent)",
            marginBottom: "1rem",
          }}
        >
          <strong>Saved.</strong> Changes are live on the public site.
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "btn btn-sm" : "btn-outline btn-sm"}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Hero ── */}
      {tab === "hero" && (
        <div className="form-panel">
          <h2>Hero Section</h2>
          <div className="form-body">
            <div className="field">
              <label>Eyebrow / Tagline</label>
              <input
                type="text"
                value={content.hero.tagline}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, tagline: e.target.value },
                  })
                }
              />
            </div>
            <div className="field">
              <label>Headline</label>
              <input
                type="text"
                value={content.hero.headline}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, headline: e.target.value },
                  })
                }
              />
            </div>
            <div className="field">
              <label>Subheadline</label>
              <textarea
                rows={3}
                value={content.hero.subheadline}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, subheadline: e.target.value },
                  })
                }
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Primary Button</label>
                <input
                  type="text"
                  value={content.hero.primaryCta}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, primaryCta: e.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Secondary Button</label>
                <input
                  type="text"
                  value={content.hero.secondaryCta}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, secondaryCta: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <MediaUpload
              photoUrl={content.hero.photoUrl}
              videoUrl={content.hero.videoUrl}
              youtubeId={content.hero.youtubeId}
              mediaType={content.hero.mediaType}
              label="Hero Background Media"
              onUpdate={(patch) =>
                setContent({
                  ...content,
                  hero: { ...content.hero, ...patch },
                })
              }
            />
          </div>
        </div>
      )}

      {/* ── Why Section ── */}
      {tab === "why" && (
        <div className="form-panel">
          <h2>Why Guests Love Serin</h2>
          <div className="form-body">
            <div className="field">
              <label>Section Heading</label>
              <input
                type="text"
                value={content.whySection.heading}
                onChange={(e) =>
                  setContent({
                    ...content,
                    whySection: { ...content.whySection, heading: e.target.value },
                  })
                }
              />
            </div>
            {content.whySection.cards.map((card, i) => (
              <div
                key={i}
                style={{
                  padding: "1rem",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  marginTop: "1rem",
                }}
              >
                <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.85rem" }}>
                  Card {i + 1}
                </p>
                <div className="field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        whySection: {
                          ...content.whySection,
                          cards: updateAt(content.whySection.cards, i, { title: e.target.value }),
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={card.description}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        whySection: {
                          ...content.whySection,
                          cards: updateAt(content.whySection.cards, i, { description: e.target.value }),
                        },
                      })
                    }
                  />
                </div>
                <MediaUpload
                  photoUrl={card.photoUrl}
                  videoUrl={card.videoUrl}
                  youtubeId={card.youtubeId}
                  mediaType={card.mediaType}
                  label="Card Media"
                  onUpdate={(patch) =>
                    setContent({
                      ...content,
                      whySection: {
                        ...content.whySection,
                        cards: updateAt(content.whySection.cards, i, patch),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Amenities ── */}
      {tab === "amenities" && (
        <div className="form-panel">
          <h2>Amenities</h2>
          <div className="form-body">
            <div className="field">
              <label>Section Heading</label>
              <input
                type="text"
                value={content.amenities.heading}
                onChange={(e) =>
                  setContent({
                    ...content,
                    amenities: { ...content.amenities, heading: e.target.value },
                  })
                }
              />
            </div>
            {content.amenities.items.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "1rem",
                  background: i % 2 === 0 ? "var(--surface-2)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  marginTop: "0.5rem",
                }}
              >
                <div className="field-row">
                  <div className="field">
                    <label>Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          amenities: {
                            ...content.amenities,
                            items: updateAt(content.amenities.items, i, { title: e.target.value }),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          amenities: {
                            ...content.amenities,
                            items: updateAt(content.amenities.items, i, { description: e.target.value }),
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <MediaUpload
                  photoUrl={item.photoUrl}
                  videoUrl={item.videoUrl}
                  youtubeId={item.youtubeId}
                  mediaType={item.mediaType}
                  label="Amenity Media"
                  onUpdate={(patch) =>
                    setContent({
                      ...content,
                      amenities: {
                        ...content.amenities,
                        items: updateAt(content.amenities.items, i, patch),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Attractions ── */}
      {tab === "attractions" && (
        <div className="form-panel">
          <h2>Nearby Attractions</h2>
          <div className="form-body">
            <div className="field">
              <label>Section Heading</label>
              <input
                type="text"
                value={content.attractions.heading}
                onChange={(e) =>
                  setContent({
                    ...content,
                    attractions: { ...content.attractions, heading: e.target.value },
                  })
                }
              />
            </div>
            {content.attractions.items.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "1rem",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  marginTop: "1rem",
                }}
              >
                <div className="field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        attractions: {
                          ...content.attractions,
                          items: updateAt(content.attractions.items, i, { name: e.target.value }),
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={item.description}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        attractions: {
                          ...content.attractions,
                          items: updateAt(content.attractions.items, i, { description: e.target.value }),
                        },
                      })
                    }
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Distance</label>
                    <input
                      type="text"
                      value={item.distance}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          attractions: {
                            ...content.attractions,
                            items: updateAt(content.attractions.items, i, { distance: e.target.value }),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Travel Time</label>
                    <input
                      type="text"
                      value={item.travelTime}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          attractions: {
                            ...content.attractions,
                            items: updateAt(content.attractions.items, i, { travelTime: e.target.value }),
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <MediaUpload
                  photoUrl={item.photoUrl}
                  videoUrl={item.videoUrl}
                  youtubeId={item.youtubeId}
                  mediaType={item.mediaType}
                  label="Attraction Media"
                  onUpdate={(patch) =>
                    setContent({
                      ...content,
                      attractions: {
                        ...content.attractions,
                        items: updateAt(content.attractions.items, i, patch),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      {tab === "faq" && (
        <div className="form-panel">
          <h2>FAQ</h2>
          <div className="form-body">
            <div className="field">
              <label>Section Heading</label>
              <input
                type="text"
                value={content.faq.heading}
                onChange={(e) =>
                  setContent({
                    ...content,
                    faq: { ...content.faq, heading: e.target.value },
                  })
                }
              />
            </div>
            {content.faq.items.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "1rem",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  marginTop: "1rem",
                }}
              >
                <div className="field">
                  <label>Question</label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        faq: {
                          ...content.faq,
                          items: updateAt(content.faq.items, i, { question: e.target.value }),
                        },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Answer</label>
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        faq: {
                          ...content.faq,
                          items: updateAt(content.faq.items, i, { answer: e.target.value }),
                        },
                      })
                    }
                  />
                </div>
                <button
                  className="btn-outline btn-sm"
                  type="button"
                  style={{ color: "var(--crit)", borderColor: "var(--crit)", marginTop: "0.5rem" }}
                  onClick={() =>
                    setContent({
                      ...content,
                      faq: {
                        ...content.faq,
                        items: content.faq.items.filter((_, j) => j !== i),
                      },
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="btn-outline btn-sm"
              type="button"
              style={{ marginTop: "1rem" }}
              onClick={() =>
                setContent({
                  ...content,
                  faq: {
                    ...content.faq,
                    items: [...content.faq.items, { question: "", answer: "" }],
                  },
                })
              }
            >
              + Add Question
            </button>
          </div>
        </div>
      )}

      {/* ── Trust Strip ── */}
      {tab === "trust" && (
        <div className="form-panel">
          <h2>Trust Strip</h2>
          <div className="form-body">
            {content.trustStrip.map((item, i) => (
              <div
                key={i}
                className="field-row"
                style={{ marginBottom: "0.75rem" }}
              >
                <div className="field">
                  <label>Value</label>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        trustStrip: updateAt(content.trustStrip, i, { value: e.target.value }),
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>Label</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        trustStrip: updateAt(content.trustStrip, i, { label: e.target.value }),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Featured Units ── */}
      {tab === "featured" && (
        <div className="form-panel">
          <h2>Featured Units</h2>
          <div className="form-body">
            <p style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: "0 0 1rem" }}>
              Enter unit IDs to feature on the homepage (e.g. west-1-210, west-1-906, west-2-201).
              These appear in the &quot;Handpicked for Your Stay&quot; section.
            </p>
            {content.featuredUnitIds.map((id, i) => (
              <div key={i} className="field" style={{ marginBottom: "0.5rem" }}>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => {
                    const ids = content.featuredUnitIds.map((v, j) =>
                      j === i ? e.target.value : v,
                    );
                    setContent({ ...content, featuredUnitIds: ids });
                  }}
                  placeholder="e.g. west-1-210"
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                className="btn-outline btn-sm"
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    featuredUnitIds: [...content.featuredUnitIds, ""],
                  })
                }
              >
                + Add Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
