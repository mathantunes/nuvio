import React from "react";

export function GrowthTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <span className="text-2xl">📈</span>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Growth Analytics</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            Total assets including FX transfers per currency analysis will be available here.
            This feature is coming in the next iteration.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            <span className="text-blue-600 dark:text-blue-400">🚧</span>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Coming Soon</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Asset Overview</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Track total assets across all currencies with FX transfer integration
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Currency Breakdown</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Detailed analysis of holdings per currency including transfer effects
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Growth Trends</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Historical growth patterns and projections based on current data
          </p>
        </div>
      </div>
    </div>
  );
}
