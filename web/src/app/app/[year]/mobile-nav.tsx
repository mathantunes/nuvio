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
      title: "Core",
      items: [
        { href: `/app/${year}`, label: "Dashboard" },
        { href: `/app/${year}/accounts`, label: "Accounts" },
        { href: `/app/${year}/fx`, label: "FX Transfers" },
      ],
    },
    {
      title: "Planning",
      items: [
        { href: `/app/${year}/savings`, label: "Savings" },
        { href: `/app/${year}/planning`, label: "Planning" },
      ],
    },
    {
      title: "Follow Up",
      items: [
        { href: `/app/${year}/variance`, label: "Budget vs Actual" },
        { href: `/app/${year}/tracking`, label: "Tracking" },
      ],
    },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="sm:hidden flex items-center justify-between mb-4">
        <Link href="/app" className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← All budgets
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
        <div className="sm:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}>
          <div className="bg-white dark:bg-zinc-950 w-64 h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Budget
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Year {year}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
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
                  <p className="px-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                          currentPath === item.href
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                        }`}
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
