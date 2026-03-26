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
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('savings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'savings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Savings
          </button>
          <button
            onClick={() => setActiveTab('growth')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'growth'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Growth
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'savings' && savingsTab}
        {activeTab === 'growth' && growthTab}
      </div>
    </div>
  );
}
