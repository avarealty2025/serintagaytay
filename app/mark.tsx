/**
 * The Serin mark, rebuilt as vector from the owner's logo: pine, Taal cone,
 * ridge, gold sweep. Green paints from `currentColor` so it inverts for dark
 * grounds; the sweep keeps the brand gold.
 */
export function Mark({ className = "mark" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 120"
      role="img"
      aria-label="Serin Tagaytay Staycation"
    >
      <path className="m-green" d="M90 92 Q112 66 138 57 Q164 66 188 92 Z" />
      <path
        className="m-dark"
        d="M118 72 Q128 61 138 57 Q134 68 130 82 Q124 77 118 72 Z"
      />
      <path
        className="m-gold"
        d="M6 97 Q64 85 120 95 Q170 103 198 85 Q150 117 86 111 Q36 105 6 97 Z"
      />
      <path
        className="m-green"
        d="M8 89 Q60 75 110 85 Q160 93 196 75 Q150 105 90 101 Q40 97 8 89 Z"
      />
      <rect className="m-green" x="59" y="72" width="6" height="22" />
      <path className="m-green" d="M62 50 L84 81 L40 81 Z" />
      <path className="m-green" d="M62 34 L79 63 L45 63 Z" />
      <path className="m-green" d="M62 18 L74 45 L50 45 Z" />
    </svg>
  );
}

/**
 * The unit plate: the Taal caldera in layered silhouette.
 *
 * `taalView` decides whether the water and Volcano Island appear. That is not
 * decoration - it tells the guest which way the unit faces before they read a
 * word.
 */
export function RidgePlate({ taalView }: { taalView: boolean }) {
  return (
    <svg viewBox="0 0 320 118" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="var(--accent)"
        opacity="0.2"
        d="M0 50 L60 40 L140 48 L220 36 L290 46 L320 40 L320 118 L0 118 Z"
      />
      <path
        fill="var(--accent)"
        opacity="0.36"
        d="M0 66 L80 58 L170 66 L250 56 L320 64 L320 118 L0 118 Z"
      />
      {taalView ? (
        <>
          <path
            fill="var(--serin-gold)"
            opacity="0.55"
            d="M0 78 L320 74 L320 102 L0 106 Z"
          />
          <path
            fill="var(--accent)"
            opacity="0.78"
            d="M118 90 L152 70 L164 78 L176 68 L212 90 Z"
          />
        </>
      ) : (
        <path
          fill="var(--accent)"
          opacity="0.5"
          d="M0 84 L80 70 L170 84 L250 68 L320 82 L320 118 L0 118 Z"
        />
      )}
      <path
        fill="var(--accent)"
        opacity="0.95"
        d="M0 102 L70 96 L150 104 L240 94 L320 102 L320 118 L0 118 Z"
      />
    </svg>
  );
}
