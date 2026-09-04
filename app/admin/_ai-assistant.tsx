"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "Marketing Ideas", prompt: "Give me 5 creative marketing ideas to boost bookings this month" },
  { label: "Pricing Review", prompt: "Review my current unit pricing and suggest optimizations for maximum revenue" },
  { label: "Listing Tips", prompt: "What are the top 5 things I should improve in my unit listings to get more bookings?" },
  { label: "Promo Ideas", prompt: "Suggest 3 promotional campaigns I can run this month with specific discount structures" },
];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          context: `User is on admin page: ${pathname}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to get response");
        setLoading(false);
        return;
      }
      setMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }, [messages, loading, pathname]);

  function formatMessage(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- /gm, "• ")
      .replace(/^(\d+)\. /gm, "$1. ")
      .replace(/`(.*?)`/g, '<code style="background:var(--surface);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>')
      .replace(/\n/g, "<br>");
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        type="button"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: "var(--accent, #2d5a27)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          zIndex: 1000,
          transition: "transform 0.2s",
          transform: open ? "rotate(45deg)" : "none",
        }}
        title="AI Marketing Assistant"
      >
        {open ? "+" : "✨"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "5rem",
            right: "1.5rem",
            width: "380px",
            maxWidth: "calc(100vw - 2rem)",
            height: "520px",
            maxHeight: "calc(100vh - 8rem)",
            background: "var(--surface, #fff)",
            border: "1px solid var(--line-soft, #ddd)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            zIndex: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--accent, #2d5a27)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong style={{ fontSize: "0.9rem" }}>✨ AI Marketing Assistant</strong>
              <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.8 }}>
                Powered by Claude — Ask anything about your business
              </p>
            </div>
            <button
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              type="button"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.7rem",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
              title="Clear chat"
            >
              Clear
            </button>
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {messages.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <p style={{ color: "var(--text-3)", fontSize: "0.8rem", margin: "0 0 1rem" }}>
                  Hi! I&apos;m your AI marketing assistant. I can help with pricing strategy, listing optimization,
                  marketing ideas, and more. Try a quick prompt:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => sendMessage(qp.prompt)}
                      type="button"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--line-soft)",
                        borderRadius: "16px",
                        padding: "4px 12px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        color: "var(--text-1)",
                        transition: "background 0.15s",
                      }}
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: msg.role === "user" ? "var(--accent, #2d5a27)" : "var(--bg, #f5f5f5)",
                  color: msg.role === "user" ? "#fff" : "var(--text-1)",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                }}
                dangerouslySetInnerHTML={
                  msg.role === "assistant"
                    ? { __html: formatMessage(msg.content) }
                    : undefined
                }
              >
                {msg.role === "user" ? msg.content : undefined}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "12px 12px 12px 2px",
                  background: "var(--bg, #f5f5f5)",
                  fontSize: "0.8rem",
                  color: "var(--text-3)",
                }}
              >
                Thinking...
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: "0.5rem",
                  background: "#fff0f0",
                  border: "1px solid #fcc",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  color: "#c00",
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "0.5rem 0.75rem",
              borderTop: "1px solid var(--line-soft)",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about marketing, pricing, operations..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                border: "1px solid var(--line-soft)",
                borderRadius: "8px",
                padding: "0.5rem",
                fontSize: "0.8rem",
                fontFamily: "inherit",
                maxHeight: "80px",
                outline: "none",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              type="button"
              style={{
                background: "var(--accent, #2d5a27)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 0.75rem",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                opacity: input.trim() && !loading ? 1 : 0.5,
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
