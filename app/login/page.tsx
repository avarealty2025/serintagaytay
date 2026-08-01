"use client";
import { useState } from "react";
import { Mark } from "../mark.tsx";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = "/admin";
      } else {
        setError("Invalid password");
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
          Admin login
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--crit)",
                fontSize: "0.82rem",
                margin: "0.5rem 0",
              }}
            >
              {error}
            </p>
          )}

          <button
            className="btn"
            type="submit"
            disabled={loading || !password}
            style={{ width: "100%", marginTop: "0.75rem" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--text-3)",
            textAlign: "center",
            marginTop: "1rem",
          }}
        >
          Set <code>ADMIN_PASSWORD</code> in <code>.env.local</code>
        </p>
      </div>
    </div>
  );
}
