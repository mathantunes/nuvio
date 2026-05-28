"use client";

import React, { useState } from "react";

interface AnalyticsTabsProps {
  savingsTab: React.ReactNode;
  growthTab: React.ReactNode;
}

export function AnalyticsTabs({ savingsTab, growthTab }: AnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<"savings" | "growth">("savings");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="tab-bar">
        <button
          onClick={() => setActiveTab("savings")}
          className={`tab-btn ${activeTab === "savings" ? "active" : ""}`}
        >
          Savings
        </button>
        <button
          onClick={() => setActiveTab("growth")}
          className={`tab-btn ${activeTab === "growth" ? "active" : ""}`}
        >
          Growth
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "savings" && savingsTab}
        {activeTab === "growth" && growthTab}
      </div>
    </div>
  );
}
