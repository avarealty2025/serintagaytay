"use client";


export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--sans)",
        background: "var(--ground, #faf8f4)",
        color: "var(--text, #1a1a1a)",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📶</div>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontSize: "1.75rem",
          fontWeight: 600,
          marginBottom: "0.5rem",
        }}
      >
        You&apos;re Offline
      </h1>
      <p style={{ color: "var(--text-2, #555)", maxWidth: "26rem", lineHeight: 1.6 }}>
        It looks like you&apos;ve lost your internet connection. The pages you
        visited before are still available — try navigating back, or reconnect
        to continue browsing.
      </p>
      <button
        onClick={() => (typeof window !== "undefined" ? window.location.reload() : undefined)}
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 2rem",
          background: "var(--accent, #2f5a1e)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-sm, 8px)",
          fontSize: "0.95rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Try Again
      </button>
    </main>
  );
}
