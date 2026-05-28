"use client";

import { useState } from "react";
import Link from "next/link";

type MobileNavProps = {
  year: number;
  currentPath?: string;
};

export function MobileNav({ year, currentPath }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navGroups = [
    {
      title: "Overview",
      items: [
        { href: `/app/${year}`, label: "Dashboard" },
      ],
    },
    {
      title: "Settings",
      items: [
        { href: `/app/${year}/accounts`, label: "Accounts" },
        { href: `/app/${year}/categories`, label: "Categories" },
        { href: "/app/settings", label: "Preferences" },
      ],
    },
    {
      title: "Budget",
      items: [
        { href: `/app/${year}/planning`, label: "Planning" },
        { href: `/app/${year}/savings`, label: "Savings" },
        { href: `/app/${year}/variance`, label: "Budget vs Actual" },
      ],
    },
    {
      title: "Investments",
      items: [
        { href: `/app/${year}/portfolio`, label: "Portfolio" },
        { href: `/app/${year}/tracking`, label: "Tracking" },
      ],
    },
    {
      title: "Net Worth",
      items: [
        { href: `/app/${year}/assets`, label: "Assets" },
        { href: `/app/${year}/loans`, label: "Loans" },
        { href: `/app/${year}/wealth`, label: "Wealth" },
      ],
    },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="sm:hidden flex items-center justify-between mb-4">
        <Link href="/app" className="text-xs transition" style={{ color: "var(--color-text-muted)" }}>
          ← All budgets
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md transition"
          style={{ color: "var(--color-text-muted)" }}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile navigation overlay */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            className="w-64 h-full shadow-xl"
            style={{ backgroundColor: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold tracking-tight" style={{ color: "var(--color-brand)" }}>
                    Nuvio
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    Year {year}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md transition"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <nav className="p-4 space-y-4">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="px-3 text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--color-text-subtle)" }}>
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="nav-link"
                        style={
                          currentPath === item.href
                            ? { backgroundColor: "var(--color-brand-subtle)", color: "var(--color-brand)" }
                            : undefined
                        }
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
