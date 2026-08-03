"use client";

import { useState } from "react";

interface Props {
  items: { question: string; answer: string }[];
}

export function FAQ({ items }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="lux-faq">
      {items.map((item, i) => (
        <div
          key={i}
          className={`lux-faq-item ${open === i ? "lux-faq-open" : ""}`}
        >
          <button
            className="lux-faq-q"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span>{item.question}</span>
            <svg
              className="lux-faq-chevron"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M5 8l5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="lux-faq-a">
            <p>{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
