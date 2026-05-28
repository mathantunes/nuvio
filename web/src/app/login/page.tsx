"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMessages } from "@/i18n";

export default function LoginPage() {
  const messages = getMessages("en");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      setStatus("error");
      return;
    }

    router.push("/app");
  };

  return (
    <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="w-full max-w-md space-y-6 rounded-2xl p-8" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <header className="space-y-1">
          <div className="mb-6">
            <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-brand)" }}>Nuvio</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            {messages.auth.loginTitle}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Sign in with your email and password.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium"
              style={{ color: "var(--color-text)" }}
            >
              {messages.auth.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder={messages.auth.emailPlaceholder}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
              style={{ color: "var(--color-text)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="btn-primary w-full"
          >
            {status === "submitting" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
          {messages.auth.legalNote}
        </p>
      </div>
    </main>
  );
}

