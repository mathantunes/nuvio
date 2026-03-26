"use client";

import React, { useState } from "react";

interface AnalyticsTabsProps {
  savingsTab: React.ReactNode;
  growthTab: React.ReactNode;
}

export function AnalyticsTabs({ savingsTab, growthTab }: AnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<'savings' | 'growth'>('savings');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('savings')}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'savings'
            ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
        >
          Savings
        </button>
        <button
          onClick={() => setActiveTab('growth')}
          className={`px-4 py-2 text-sm font-medium transition ${activeTab === 'growth'
            ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
        >
          Growth
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'savings' && savingsTab}
        {activeTab === 'growth' && growthTab}
      </div>
    </div>
  );
}
