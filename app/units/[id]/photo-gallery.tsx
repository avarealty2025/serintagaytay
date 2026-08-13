"use client";

import { useState } from "react";

interface MediaItem {
  type?: "photo" | "video" | "youtube";
  url: string;
  thumb: string;
  youtubeId?: string;
}

interface Props {
  photos: MediaItem[];
  unitName: string;
}

export function PhotoGallery({ photos, unitName }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (photos.length === 0) return null;

  const current = photos[active]!;
  const isVideo = current.type === "video";
  const isYouTube = current.type === "youtube";
  const isMedia = isVideo || isYouTube;

  function prev() {
    setActive((i) => (i === 0 ? photos.length - 1 : i - 1));
  }
  function next() {
    setActive((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  function renderMain(item: MediaItem, inLightbox = false) {
    if (item.type === "youtube" && item.youtubeId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0`}
          title={`${unitName} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="gallery-video-frame"
          style={inLightbox ? { maxWidth: "90vw", maxHeight: "80vh", width: 960, height: 540 } : undefined}
        />
      );
    }
    if (item.type === "video") {
      return (
        <video
          src={item.url}
          controls
          playsInline
          className="gallery-img"
          style={{ objectFit: "contain", background: "#000" }}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt={`${unitName} photo ${active + 1}`}
        className="gallery-img"
      />
    );
  }

  return (
    <>
      <div className="gallery">
        <div
          className="gallery-main"
          onClick={() => !isMedia && setLightbox(true)}
          style={isMedia ? { cursor: "default" } : undefined}
        >
          {renderMain(current)}
          <button className="gallery-arrow gallery-prev" onClick={(e) => { e.stopPropagation(); prev(); }} type="button" aria-label="Previous">&lsaquo;</button>
          <button className="gallery-arrow gallery-next" onClick={(e) => { e.stopPropagation(); next(); }} type="button" aria-label="Next">&rsaquo;</button>
          <span className="gallery-counter">{active + 1} / {photos.length}</span>
        </div>
        <div className="gallery-thumbs">
          {photos.map((p, i) => {
            const isVid = p.type === "video" || p.type === "youtube";
            return (
              <button
                key={i}
                className={`gallery-thumb ${i === active ? "active" : ""}`}
                onClick={() => setActive(i)}
                type="button"
                aria-label={`View ${isVid ? "video" : "photo"} ${i + 1}`}
              >
                {p.type === "video" ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <video src={p.url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span className="thumb-play">&#9654;</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumb || p.url} alt="" />
                    {p.type === "youtube" && <span className="thumb-play">&#9654;</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {lightbox && !isMedia && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button className="lightbox-close" onClick={() => setLightbox(false)} type="button" aria-label="Close">&times;</button>
          <button className="lightbox-arrow lightbox-prev" onClick={(e) => { e.stopPropagation(); prev(); }} type="button" aria-label="Previous">&lsaquo;</button>
          {renderMain(current, true)}
          <button className="lightbox-arrow lightbox-next" onClick={(e) => { e.stopPropagation(); next(); }} type="button" aria-label="Next">&rsaquo;</button>
          <span className="lightbox-counter">{active + 1} / {photos.length}</span>
        </div>
      )}
    </>
  );
}
