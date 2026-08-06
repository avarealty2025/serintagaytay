"use client";

import { usePathname } from "next/navigation";

const FB_PAGE = "SerinTagaytayStaycation";

export function MessengerBtn() {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/login")) return null;

  return (
    <a
      href={`https://m.me/${FB_PAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on Messenger"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #0695FF 0%, #A334FA 50%, #FF6968 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 2.333C7.557 2.333 2.333 7.09 2.333 13.07c0 3.28 1.594 6.207 4.084 8.12V25.667l4.232-2.322c1.074.298 2.21.459 3.351.459 6.443 0 11.667-4.757 11.667-10.734S20.443 2.333 14 2.333Zm1.16 14.453-2.97-3.168-5.797 3.168 6.374-6.766 3.043 3.168 5.724-3.168-6.374 6.766Z"
          fill="#fff"
        />
      </svg>
    </a>
  );
}
