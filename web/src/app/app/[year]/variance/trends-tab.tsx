"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "../planning/currency-format";
import type {
  CategoryTrends,
  CategoryTrendRow,
  MonthlyDisciplineScore,
} from "@/lib/variance-computations";

type Props = {
  categoryTrends: CategoryTrends;
  disciplineScores: MonthlyDisciplineScore[];
  currentMonthIdx: number;
};

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

type KindTab = "expenses" | "income";

export function TrendsTab({ categoryTrends, disciplineScores, currentMonthIdx }: Props) {
  const [kindTab, setKindTab] = useState<KindTab>("expenses");

  const rows = kindTab === "expenses" ? categoryTrends.expenses : categoryTrends.income;
  const currencies = [...new Set(rows.map((r) => r.currencyCode))].sort();
  const pastMonths = currentMonthIdx + 1;

  // Discipline score chart data (only past months)
  const disciplineData = disciplineScores
    .filter((d) => d.isPast)
    .map((d) => ({ name: d.monthName, score: d.score, count: `${d.onBudgetCount}/${d.totalCount}` }));

  const avgScore =
    disciplineData.length > 0
      ? disciplineData.reduce((s, d) => s + d.score, 0) / disciplineData.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Discipline Score */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Budget Discipline Score
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              % of expense categories within budget each month
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold ${
                avgScore >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : avgScore >= 60
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {avgScore.toFixed(0)}%
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">YTD avg</p>
          </div>
        </div>

        {disciplineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={disciplineData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                width={36}
              />
              <Tooltip
                formatter={(v, _name, props) => [
                  `${Number(v).toFixed(0)}% (${props.payload.count})`,
                  "On-budget categories",
                ]}
              />
              <ReferenceLine
                y={avgScore}
                stroke="#6366f1"
                strokeDasharray="4 2"
                label={{ value: "avg", fontSize: 10, fill: "#6366f1", position: "right" }}
              />
              {disciplineData.map((_entry, idx) => null) /* satisfy recharts */}
              <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                {disciplineData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      entry.score >= 80
                        ? "#10b981"
                        : entry.score >= 60
                        ? "#f59e0b"
                        : "#ef4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">
            No data yet for this year.
          </p>
        )}
      </div>

      {/* Category Heatmap */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Category Trends
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Month-by-month budget adherence per category
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Kind toggle */}
            <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs">
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

            {/* Legend */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500 opacity-80" /> Within
              <span className="inline-block h-3 w-3 rounded-sm bg-red-400 opacity-80 ml-1" /> Over
              <span className="inline-block h-3 w-3 rounded-sm bg-zinc-100 dark:bg-zinc-800 ml-1" /> No data
            </div>
          </div>
        </div>

        {currencies.map((currency) => {
          const currencyRows = rows
            .filter((r) => r.currencyCode === currency)
            .sort((a, b) => {
              // Sort by most problematic (lowest on-budget ratio) first
              const aRate = pastMonths > 0 ? a.onBudgetCount / pastMonths : 0;
              const bRate = pastMonths > 0 ? b.onBudgetCount / pastMonths : 0;
              return aRate - bRate;
            });

          if (currencyRows.length === 0) return null;

          return (
            <div key={currency} className="space-y-1">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                {currency}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-separate border-spacing-y-0.5">
                  <thead>
                    <tr>
                      <th className="py-1 pr-3 text-left font-medium text-zinc-400 dark:text-zinc-500 w-36">
                        Category
                      </th>
                      {MONTH_LABELS.map((m, idx) => (
                        <th
                          key={idx}
                          className={`py-1 px-0.5 text-center font-medium w-7 ${
                            idx <= currentMonthIdx
                              ? "text-zinc-500 dark:text-zinc-400"
                              : "text-zinc-300 dark:text-zinc-700"
                          }`}
                        >
                          {m}
                        </th>
                      ))}
                      <th className="py-1 pl-3 text-right font-medium text-zinc-400 dark:text-zinc-500">
                        YTD
                      </th>
                      <th className="py-1 pl-2 text-right font-medium text-zinc-400 dark:text-zinc-500">
                        vs plan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencyRows.map((row) => {
                      const ytdVariance = row.ytdPlanned - row.ytdActual;
                      const isExpense = row.categoryKind !== "income";
                      const varGood = isExpense ? ytdVariance >= 0 : ytdVariance <= 0;

                      return (
                        <HeatmapRow
                          key={`${row.categoryId}-${row.currencyCode}`}
                          row={row}
                          currency={currency}
                          currentMonthIdx={currentMonthIdx}
                          pastMonths={pastMonths}
                          ytdVariance={ytdVariance}
                          varGood={varGood}
                          isExpense={isExpense}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">
            No {kindTab} categories found. Add budget lines in Planning.
          </p>
        )}
      </div>

      {/* Top performers & offenders */}
      {pastMonths > 0 && (
        <TopPerformers
          categoryTrends={categoryTrends}
          currentMonthIdx={currentMonthIdx}
        />
      )}
    </div>
  );
}

// ─── Heatmap Row ──────────────────────────────────────────────────────────────

function HeatmapRow({
  row,
  currency,
  currentMonthIdx,
  pastMonths,
  ytdVariance,
  varGood,
  isExpense,
}: {
  row: CategoryTrendRow;
  currency: string;
  currentMonthIdx: number;
  pastMonths: number;
  ytdVariance: number;
  varGood: boolean;
  isExpense: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <tr className="group">
      <td className="pr-3 py-0.5 font-medium text-zinc-700 dark:text-zinc-300 max-w-[9rem] truncate">
        {row.categoryName}
      </td>
      {row.months.map((m, idx) => {
        const isFuture = idx > currentMonthIdx;
        const isHovered = hovered === idx;

        let bg = "bg-zinc-100 dark:bg-zinc-800"; // none / future
        if (!isFuture && m.status === "good") bg = "bg-emerald-500";
        if (!isFuture && m.status === "over") bg = "bg-red-400";

        return (
          <td key={idx} className="px-0.5 py-0.5 text-center relative">
            <div
              className={`mx-auto h-5 w-5 rounded-sm ${bg} opacity-${isFuture ? "20" : "80"} cursor-default transition-transform ${
                isHovered ? "scale-125 opacity-100 z-10" : ""
              }`}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              title={
                isFuture
                  ? "Future"
                  : m.planned > 0 || m.actual > 0
                  ? `Planned: ${formatCurrency(m.planned, currency)}\nActual: ${formatCurrency(m.actual, currency)}`
                  : "No data"
              }
            />
          </td>
        );
      })}
      <td className="pl-3 py-0.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatCurrency(row.ytdActual, currency)}
      </td>
      <td
        className={`pl-2 py-0.5 text-right tabular-nums font-medium ${
          varGood
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {ytdVariance >= 0 ? "+" : ""}
        {formatCurrency(ytdVariance, currency)}
      </td>
    </tr>
  );
}

// ─── Top Performers / Offenders ───────────────────────────────────────────────

function TopPerformers({
  categoryTrends,
  currentMonthIdx,
}: {
  categoryTrends: CategoryTrends;
  currentMonthIdx: number;
}) {
  // Top over-budget expense categories (sorted by absolute overspend)
  const overspenders = [...categoryTrends.expenses]
    .filter((r) => r.ytdPlanned > 0 && r.ytdActual > r.ytdPlanned)
    .sort((a, b) => b.ytdActual - b.ytdPlanned - (a.ytdActual - a.ytdPlanned))
    .slice(0, 3);

  // Top consistent categories (highest on-budget streak)
  const disciplined = [...categoryTrends.expenses]
    .filter((r) => r.ytdPlanned > 0)
    .sort((a, b) => b.onBudgetCount - a.onBudgetCount)
    .slice(0, 3);

  // Top income over-achievers
  const incomeChamps = [...categoryTrends.income]
    .filter((r) => r.ytdActual > r.ytdPlanned && r.ytdPlanned > 0)
    .sort((a, b) => b.ytdActual - b.ytdPlanned - (a.ytdActual - a.ytdPlanned))
    .slice(0, 3);

  if (overspenders.length === 0 && disciplined.length === 0 && incomeChamps.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {overspenders.length > 0 && (
        <InsightCard
          title="Over budget"
          emoji="⚠️"
          colorClass="border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
          items={overspenders.map((r) => ({
            name: r.categoryName,
            currency: r.currencyCode,
            detail: `+${formatCurrency(r.ytdActual - r.ytdPlanned, r.currencyCode)} over plan`,
            sub: `${r.onBudgetCount}/${currentMonthIdx + 1} months within budget`,
            bad: true,
          }))}
        />
      )}

      {disciplined.length > 0 && (
        <InsightCard
          title="Most disciplined"
          emoji="🏆"
          colorClass="border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          items={disciplined.map((r) => ({
            name: r.categoryName,
            currency: r.currencyCode,
            detail: `${r.onBudgetCount}/${currentMonthIdx + 1} months on budget`,
            sub: `Saved ${formatCurrency(Math.max(0, r.ytdPlanned - r.ytdActual), r.currencyCode)} vs plan`,
            bad: false,
          }))}
        />
      )}

      {incomeChamps.length > 0 && (
        <InsightCard
          title="Income champions"
          emoji="💰"
          colorClass="border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20"
          items={incomeChamps.map((r) => ({
            name: r.categoryName,
            currency: r.currencyCode,
            detail: `+${formatCurrency(r.ytdActual - r.ytdPlanned, r.currencyCode)} above plan`,
            sub: `Actual: ${formatCurrency(r.ytdActual, r.currencyCode)}`,
            bad: false,
          }))}
        />
      )}
    </div>
  );
}

function InsightCard({
  title,
  emoji,
  colorClass,
  items,
}: {
  title: string;
  emoji: string;
  colorClass: string;
  items: Array<{ name: string; currency: string; detail: string; sub: string; bad: boolean }>;
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass} space-y-3`}>
      <div className="flex items-center gap-2">
        <span>{emoji}</span>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      </div>
      <ol className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-xs">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {idx + 1}. {item.name}
            </span>
            <p
              className={`${
                item.bad
                  ? "text-red-700 dark:text-red-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {item.detail}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">{item.sub}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
