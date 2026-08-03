"use client";

import { useState, useEffect } from "react";

interface Review {
  id: string;
  guest_name: string;
  rating: number;
  body: string;
  source: string;
  stay_date: string | null;
}

export function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch("/api/reviews/public")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => {});
  }, []);

  if (reviews.length === 0) return null;

  function stars(n: number) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  return (
    <section className="testimonials">
      <span className="section-label">Guest Reviews</span>
      <h2>What Our Guests Say</h2>
      <p>Real reviews from guests who stayed at Serin Tagaytay.</p>
      <div className="testimonial-grid">
        {reviews.map((r) => (
          <div key={r.id} className="testimonial-card">
            <div className="tc-stars">{stars(r.rating)}</div>
            <p className="tc-body">&ldquo;{r.body}&rdquo;</p>
            <div className="tc-footer">
              <span className="tc-name">{r.guest_name}</span>
              <span>{r.source !== "direct" ? r.source : ""}{r.stay_date ? ` · ${r.stay_date.slice(0, 7)}` : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
