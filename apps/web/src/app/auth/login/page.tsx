"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        let message = res.statusText;
        try {
          const data = await res.json();
          if (data.error) message = data.error;
        } catch {
          // Ignore JSON parse errors, use statusText
        }
        setError(message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
        <h2>Check your email</h2>
        <p>We sent a sign-in link to <strong>{email}</strong>.</p>
        <p>The link expires in 15 minutes.</p>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Sign in to KinSync</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email address</label>
        <br />
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", marginBottom: "1rem" }}
        />
        {error && (
          <div style={{ color: "red", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem" }}>
          {loading ? "Sending…" : "Send magic link"}
        </button>
      </form>
    </main>
  );
}