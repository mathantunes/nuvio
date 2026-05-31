"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "nuvio-theme";
const THEME_EVENT = "nuvio-theme-change";

function getSnapshot(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) ?? "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function cycle() {
    const next: Theme =
      theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  const label =
    theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "⚙️";

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}. Click to cycle.`}
      className="rounded-lg p-1.5 text-sm transition-colors"
      style={{
        cursor: "pointer",
        color: "var(--color-text-subtle)",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)",
      }}
    >
      {label}
    </button>
  );
}

/** Inline script to avoid flash of wrong theme before React hydrates */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var t=localStorage.getItem('nuvio-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');})();`,
      }}
    />
  );
}
