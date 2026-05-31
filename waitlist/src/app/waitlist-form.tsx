"use client";

import { useState } from "react";

// Sign up at https://formspree.io, create a form, and replace the ID below.
const FORMSPREE_ID = "YOUR_FORMSPREE_ID";

export function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="mt-8 rounded-xl px-6 py-4 text-sm font-medium" style={{ backgroundColor: "var(--color-success-subtle)", color: "var(--color-success)" }}>
        ✓ You&apos;re on the list! We&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 mx-auto flex w-full max-w-md flex-col items-center gap-2 sm:flex-row sm:items-start justify-center">
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        disabled={status === "submitting"}
        className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border-strong)",
          color: "var(--color-text)",
        }}
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary px-6 py-2.5 text-sm"
      >
        {status === "submitting" ? "Joining…" : "Join waitlist"}
      </button>
      {status === "error" && (
        <p className="w-full text-center text-xs" style={{ color: "var(--color-danger)" }}>
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
