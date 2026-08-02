"use client";
import { useState } from "react";
import { Mark } from "../mark.tsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = "/admin";
      } else {
        const data = await res.json();
        const debugInfo = data.debug ? ` [${JSON.stringify(data.debug)}]` : "";
        setError((data.error || "Invalid email or password") + debugInfo);
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMessage("If that email exists, a reset link has been sent. Check your inbox.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="lockup" style={{ justifyContent: "center", marginBottom: "1.5rem" }}>
          <Mark />
          <p className="brand">
            Serin
            <small>Tagaytay</small>
          </p>
        </div>

        <h1
          style={{
            fontFamily: "var(--display)",
            fontWeight: 400,
            fontSize: "1.3rem",
            margin: "0 0 1.5rem",
            textAlign: "center",
          }}
        >
          {mode === "login" ? "Admin login" : "Reset password"}
        </h1>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            {error && (
              <p style={{ color: "var(--crit)", fontSize: "0.82rem", margin: "0.5rem 0" }}>
                {error}
              </p>
            )}

            <button
              className="btn"
              type="submit"
              disabled={loading || !email || !password}
              style={{ width: "100%", marginTop: "0.75rem" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p style={{ fontSize: "0.8rem", textAlign: "center", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                Forgot password?
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleForgot}>
            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                type="email"
                id="reset-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoFocus
              />
            </div>

            {error && (
              <p style={{ color: "var(--crit)", fontSize: "0.82rem", margin: "0.5rem 0" }}>
                {error}
              </p>
            )}

            {message && (
              <p style={{ color: "var(--accent)", fontSize: "0.82rem", margin: "0.5rem 0" }}>
                {message}
              </p>
            )}

            <button
              className="btn"
              type="submit"
              disabled={loading || !email}
              style={{ width: "100%", marginTop: "0.75rem" }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p style={{ fontSize: "0.8rem", textAlign: "center", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                Back to login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
