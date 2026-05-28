"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("nuvio-theme") as Theme) ?? "system";
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
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function cycle() {
    const next: Theme =
      theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("nuvio-theme", next);
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
