"use client";

import { useState } from "react";

interface Props {
  photos: { url: string; thumb: string }[];
  unitName: string;
}

export function PhotoGallery({ photos, unitName }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (photos.length === 0) return null;

  function prev() {
    setActive((i) => (i === 0 ? photos.length - 1 : i - 1));
  }
  function next() {
    setActive((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  return (
    <>
      <div className="gallery">
        <div className="gallery-main" onClick={() => setLightbox(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[active]!.url}
            alt={`${unitName} photo ${active + 1}`}
            className="gallery-img"
          />
          <button className="gallery-arrow gallery-prev" onClick={(e) => { e.stopPropagation(); prev(); }} type="button" aria-label="Previous photo">&lsaquo;</button>
          <button className="gallery-arrow gallery-next" onClick={(e) => { e.stopPropagation(); next(); }} type="button" aria-label="Next photo">&rsaquo;</button>
          <span className="gallery-counter">{active + 1} / {photos.length}</span>
        </div>
        <div className="gallery-thumbs">
          {photos.map((p, i) => (
            <button
              key={i}
              className={`gallery-thumb ${i === active ? "active" : ""}`}
              onClick={() => setActive(i)}
              type="button"
              aria-label={`View photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt="" />
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button className="lightbox-close" onClick={() => setLightbox(false)} type="button" aria-label="Close">&times;</button>
          <button className="lightbox-arrow lightbox-prev" onClick={(e) => { e.stopPropagation(); prev(); }} type="button" aria-label="Previous">&lsaquo;</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[active]!.url}
            alt={`${unitName} photo ${active + 1}`}
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="lightbox-arrow lightbox-next" onClick={(e) => { e.stopPropagation(); next(); }} type="button" aria-label="Next">&rsaquo;</button>
          <span className="lightbox-counter">{active + 1} / {photos.length}</span>
        </div>
      )}
    </>
  );
}
