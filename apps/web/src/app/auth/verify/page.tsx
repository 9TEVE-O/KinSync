"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "verifying" | "success" | "error";

export default function VerifyPage() {
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read the token from the URL directly (no useSearchParams) so the page
    // does not need a Suspense boundary during static generation.
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      setError("This sign-in link is missing its token.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify?token=${encodeURIComponent(token)}`
        );
        if (!res.ok) {
          let message = res.statusText;
          try {
            const data = await res.json();
            if (data.error) message = data.error;
          } catch {
            // Ignore JSON parse errors, use statusText
          }
          if (!cancelled) {
            setStatus("error");
            setError(message);
          }
          return;
        }
        const data = (await res.json()) as { token?: string };
        if (data.token) {
          try {
            window.localStorage.setItem("kinsync.session", data.token);
          } catch {
            // localStorage may be unavailable; the session still verified.
          }
        }
        if (!cancelled) setStatus("success");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
      {status === "verifying" && (
        <>
          <h2>Signing you in…</h2>
          <p>Verifying your sign-in link.</p>
        </>
      )}
      {status === "success" && (
        <>
          <h2>You&apos;re signed in</h2>
          <p>
            <Link href="/">Continue to KinSync</Link>
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <h2>Sign-in link didn&apos;t work</h2>
          <p style={{ color: "red" }}>{error}</p>
          <p>
            <Link href="/auth/login">Request a new link</Link>
          </p>
        </>
      )}
    </main>
  );
}
