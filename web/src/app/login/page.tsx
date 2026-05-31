"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMessages } from "@/i18n";
import Image from "next/image";

export default function LoginPage() {
  const messages = getMessages("en");
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? (mode === "login" ? "Login failed" : "Sign up failed"));
      setStatus("error");
      return;
    }

    router.push("/app");
  };

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError(null);
    setStatus("idle");
  };

  return (
    <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="w-full max-w-md space-y-6 rounded-2xl p-8" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <header className="space-y-4">
          <Image
            src="/logo.png"
            alt="Nuvio"
            width={352}
            height={116}
            className="logo"
            style={{ width: "auto", height: "32px", objectFit: "contain", objectPosition: "left" }}
          />
          <div className="tab-bar">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`tab-btn ${mode === "login" ? "active" : ""}`}
            >
              Sign in
            </button>
            <button
              type="button"
              data-testid="tab-signup"
              onClick={() => switchMode("signup")}
              className={`tab-btn ${mode === "signup" ? "active" : ""}`}
            >
              Create account
            </button>
          </div>
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
              data-testid="email-input"
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
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              data-testid="password-input"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="btn-primary w-full"
            data-testid="auth-submit"
          >
            {status === "submitting"
              ? mode === "login" ? "Signing in…" : "Creating account…"
              : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
          {messages.auth.legalNote}
        </p>
      </div>
    </main>
  );
}

