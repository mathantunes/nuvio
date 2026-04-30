"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../planning/currency-format";
import type {
  MonthlyVarianceData,
  YtdVarianceData,
  CategoryVarianceRow,
  CategoryVarianceSummary,
} from "@/lib/variance-computations";

type Props = {
  allMonthlyVariance: MonthlyVarianceData[];
  ytdVariance: YtdVarianceData;
  currentMonthIdx: number;
  monthNames: string[];
  year: number;
};

type MainTab = "monthly" | "ytd";
type KindTab = "expenses" | "income";
type DisplayMode = "chart" | "table";

// Palette for pie chart slices — cycles if there are many categories
const PIE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

export function VarianceTabs({
  allMonthlyVariance,
  ytdVariance,
  currentMonthIdx,
  monthNames,
  year,
}: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("monthly");
  const [kindTab, setKindTab] = useState<KindTab>("expenses");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("chart");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx); // 0-based index

  const monthlyData = allMonthlyVariance[selectedMonth];
  const rows: CategoryVarianceRow[] | CategoryVarianceSummary[] =
    mainTab === "monthly"
      ? kindTab === "expenses"
        ? monthlyData.expenses
        : monthlyData.income
      : kindTab === "expenses"
      ? ytdVariance.expenses
      : ytdVariance.income;

  return (
    <div className="space-y-4">
      {/* Main tab: Monthly / YTD */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {(["monthly", "ytd"] as MainTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition ${
              mainTab === tab
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab === "monthly" ? "Monthly" : "YTD"}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month selector — only for Monthly tab */}
        {mainTab === "monthly" && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx} disabled={idx > currentMonthIdx}>
                {name} {idx > currentMonthIdx ? "(future)" : ""}
              </option>
            ))}
          </select>
        )}

        {/* Expenses / Income toggle */}
        <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
          {(["expenses", "income"] as KindTab[]).map((k) => (
            <button
              key={k}
              onClick={() => setKindTab(k)}
              className={`px-3 py-1.5 font-medium transition ${
                kindTab === k
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {/* Chart / Table toggle */}
        <div className="ml-auto flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
          {(["chart", "table"] as DisplayMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setDisplayMode(m)}
              className={`px-3 py-1.5 font-medium transition ${
                displayMode === m
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {m === "chart" ? "📊 Chart" : "📋 Table"}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState kindTab={kindTab} />
      ) : displayMode === "chart" ? (
        <ChartView rows={rows} kindTab={kindTab} />
      ) : (
        <TableView rows={rows} kindTab={kindTab} isYtd={mainTab === "ytd"} />
      )}
    </div>
  );
}

// ─── Chart View ──────────────────────────────────────────────────────────────

function ChartView({
  rows,
  kindTab,
}: {
  rows: (CategoryVarianceRow | CategoryVarianceSummary)[];
  kindTab: KindTab;
}) {
  // Group by currency for separate charts
  const currencies = [...new Set(rows.map((r) => r.currencyCode))].sort();

  return (
    <div className="space-y-8">
      {currencies.map((currency) => {
        const currencyRows = rows.filter((r) => r.currencyCode === currency);
        return (
          <CurrencyCharts
            key={currency}
            currency={currency}
            rows={currencyRows}
            kindTab={kindTab}
          />
        );
      })}
    </div>
  );
}

function CurrencyCharts({
  currency,
  rows,
  kindTab,
}: {
  currency: string;
  rows: (CategoryVarianceRow | CategoryVarianceSummary)[];
  kindTab: KindTab;
}) {
  const barData = rows.map((r) => ({
    name: r.categoryName.length > 14 ? r.categoryName.slice(0, 13) + "…" : r.categoryName,
    fullName: r.categoryName,
    Planned: r.planned,
    Actual: r.actual,
  }));

  const pieData = rows
    .filter((r) => r.actual > 0)
    .map((r) => ({ name: r.categoryName, value: r.actual }))
    .sort((a, b) => b.value - a.value);

  const isExpense = kindTab === "expenses";

  const formatYAxis = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-xs" style={{ color: p.fill }}>
            {p.dataKey}: {formatCurrency(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{currency}</h3>

      {/* Grouped bar: Planned vs Actual per category */}
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Planned vs Actual</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={48} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Planned" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
            <Bar
              dataKey="Actual"
              radius={[3, 3, 0, 0]}
              // Color each bar based on over/under individually
              label={false}
            >
              {rows.map((row, idx) => {
                const over = isExpense ? row.actual > row.planned : row.actual < row.planned;
                return (
                  <Cell
                    key={idx}
                    fill={over ? "#ef4444" : "#10b981"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie: actual spending share */}
      {pieData.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            Actual {isExpense ? "spending" : "income"} breakdown
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={false}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(Number(value ?? 0), currency)
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-col gap-1.5 text-xs">
              {pieData.map((entry, idx) => {
                const total = pieData.reduce((s, e) => s + e.value, 0);
                const share = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {entry.name}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500 ml-auto pl-4">
                      {share}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  rows,
  kindTab,
  isYtd,
}: {
  rows: (CategoryVarianceRow | CategoryVarianceSummary)[];
  kindTab: KindTab;
  isYtd: boolean;
}) {
  const currencies = [...new Set(rows.map((r) => r.currencyCode))].sort();
  const isExpense = kindTab === "expenses";

  return (
    <div className="space-y-6">
      {currencies.map((currency) => {
        const currencyRows = rows.filter((r) => r.currencyCode === currency);
        const totalPlanned = currencyRows.reduce((s, r) => s + r.planned, 0);
        const totalActual = currencyRows.reduce((s, r) => s + r.actual, 0);
        const totalVariance = totalPlanned - totalActual;
        const totalPct = totalPlanned !== 0 ? (totalActual / totalPlanned) * 100 : 0;

        return (
          <div
            key={currency}
            className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{currency}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-900">
                    <th className="py-2 px-4 text-left font-medium text-zinc-500 dark:text-zinc-400">Category</th>
                    <th className="py-2 px-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Planned</th>
                    <th className="py-2 px-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Actual</th>
                    <th className="py-2 px-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Variance</th>
                    <th className="py-2 px-3 text-right font-medium text-zinc-500 dark:text-zinc-400">% Used</th>
                    {isYtd && (
                      <th className="py-2 px-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Pace</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                  {currencyRows.map((row) => {
                    const over = isExpense
                      ? row.actual > row.planned
                      : row.actual < row.planned;
                    const paceLabel = row.pct > 100
                      ? "ahead"
                      : row.pct > 80
                      ? "on track"
                      : "behind";

                    return (
                      <tr
                        key={`${row.categoryId}-${row.currencyCode}`}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-50">
                          {row.categoryName}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                          {formatCurrency(row.planned, currency)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(row.actual, currency)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums font-medium ${
                            over
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {row.variance >= 0 ? "+" : ""}
                          {formatCurrency(row.variance, currency)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums font-medium ${
                            over
                              ? "text-red-600 dark:text-red-400"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {row.pct.toFixed(1)}%
                        </td>
                        {isYtd && (
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                paceLabel === "ahead"
                                  ? over
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : paceLabel === "on track"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                              }`}
                            >
                              {paceLabel}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                    <td className="py-2 px-4 font-semibold text-zinc-900 dark:text-zinc-50">
                      Total
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(totalPlanned, currency)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(totalActual, currency)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums font-semibold ${
                        isExpense
                          ? totalVariance >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                          : totalVariance < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {totalVariance >= 0 ? "+" : ""}
                      {formatCurrency(totalVariance, currency)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums font-semibold ${
                        isExpense
                          ? totalPct > 100
                            ? "text-red-600 dark:text-red-400"
                            : "text-zinc-500 dark:text-zinc-400"
                          : totalPct < 100
                          ? "text-red-600 dark:text-red-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {totalPct.toFixed(1)}%
                    </td>
                    {isYtd && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ kindTab }: { kindTab: KindTab }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No {kindTab} budget lines found for this period.
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
        Add budget lines in Planning to start tracking.
      </p>
    </div>
  );
}
