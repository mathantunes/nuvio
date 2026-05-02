"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "../planning/currency-format";
import type { SavingsTimeline, MonthlyDisciplineScore } from "@/lib/variance-computations";

type Props = {
  savingsTimeline: SavingsTimeline;
  disciplineScores: MonthlyDisciplineScore[];
  currentMonthIdx: number;
};

export function SavingsInsightTab({ savingsTimeline, disciplineScores, currentMonthIdx }: Props) {
  const currencies = Object.keys(savingsTimeline.byCurrency).sort();

  return (
    <div className="space-y-6">
      {/* Year-end Projection Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currencies.map((currency) => {
          const projection = savingsTimeline.yearEndProjection[currency];
          const plan = savingsTimeline.yearEndPlan[currency];
          const points = savingsTimeline.byCurrency[currency];
          // Only completed months (not the current in-progress month)
          const ytdActual = points
            .filter((p) => p.month <= currentMonthIdx)
            .reduce((s, p) => s + p.actualSavings, 0);
          // Cumulative planned for completed months — used for progress bar
          const cumulativePlannedYTD = points
            .filter((p) => p.month <= currentMonthIdx)
            .reduce((s, p) => s + p.plannedSavings, 0);
          const diff = projection - plan;
          const onTrack = diff >= 0;

          // Latest YTD savings rate (average of past months with income)
          const rateMonths = points.filter((p) => p.isPast && p.actualIncome > 0);
          const avgRate =
            rateMonths.length > 0
              ? rateMonths.reduce((s, p) => s + p.savingsRate, 0) / rateMonths.length
              : 0;

          return (
            <div
              key={currency}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {currency}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    onTrack
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {onTrack ? "✓ On track" : "⚠ Off track"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">YTD saved</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(ytdActual, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Year plan</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(plan, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Dec 31 projection</span>
                  <span
                    className={`font-bold ${
                      onTrack
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(projection, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">vs plan</span>
                  <span
                    className={`font-medium ${
                      onTrack
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatCurrency(diff, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Avg savings rate</span>
                  <span
                    className={`font-semibold ${
                      avgRate >= 15
                        ? "text-emerald-600 dark:text-emerald-400"
                        : avgRate >= 5
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {avgRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Mini progress bar: YTD actual vs plan */}
              {plan > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">
                    <span>Year progress</span>
                    <span>{Math.round((ytdActual / plan) * 100)}% of plan</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        ytdActual >= cumulativePlannedYTD
                          ? "bg-emerald-500"
                          : "bg-red-400"
                      }`}
                      style={{
                        width: `${Math.min((ytdActual / plan) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {/* Expected progress marker — based on cumulative planned, not linear */}
                  <div className="relative h-0">
                    <div
                      className="absolute -top-3 w-0.5 h-3 bg-zinc-400 dark:bg-zinc-500"
                      style={{
                        left: `${Math.min((cumulativePlannedYTD / plan) * 100, 100)}%`,
                      }}
                      title={`Expected ${Math.round((cumulativePlannedYTD / plan) * 100)}% by now`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly Savings Timeline Charts */}
      {currencies.map((currency) => {
        const points = savingsTimeline.byCurrency[currency];
        const pastPoints = points.filter((p) => p.isPast);

        const chartData = points.map((p) => ({
          name: p.monthName,
          "Planned savings": p.plannedSavings,
          "Actual savings": p.isPast ? p.actualSavings : null,
          "Cum. planned": p.cumulativePlanned,
          "Cum. actual": p.isPast ? p.cumulativeActual : null,
          savingsRate: p.isPast ? p.savingsRate : null,
        }));

        const formatYAxis = (v: number) =>
          Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

        const CustomTooltip = ({ active, payload, label }: any) => {
          if (!active || !payload?.length) return null;
          return (
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm text-xs dark:border-zinc-700 dark:bg-zinc-900 space-y-1 min-w-[180px]">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">{label}</p>
              {payload.map((p: any) => {
                if (p.value === null || p.value === undefined) return null;
                const isRate = p.dataKey === "savingsRate";
                return (
                  <p key={p.dataKey} style={{ color: p.color ?? p.stroke }}>
                    {p.name}:{" "}
                    {isRate
                      ? `${Number(p.value).toFixed(1)}%`
                      : formatCurrency(p.value, currency)}
                  </p>
                );
              })}
            </div>
          );
        };

        const avgSavingsRate =
          pastPoints.filter((p) => p.actualIncome > 0).length > 0
            ? pastPoints
                .filter((p) => p.actualIncome > 0)
                .reduce((s, p) => s + p.savingsRate, 0) /
              pastPoints.filter((p) => p.actualIncome > 0).length
            : 0;

        return (
          <div
            key={currency}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-6"
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {currency} — Monthly Savings
            </h3>

            {/* Bar: planned vs actual savings per month */}
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Planned vs actual savings per month
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#a1a1aa" strokeDasharray="3 3" />
                  <Bar dataKey="Planned savings" fill="#a1a1aa" radius={[3, 3, 0, 0]} opacity={0.6} />
                  <Bar dataKey="Actual savings" fill="#6366f1" radius={[3, 3, 0, 0]} opacity={0.9} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Line: cumulative savings trajectory */}
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Cumulative savings trajectory
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#a1a1aa" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="Cum. planned"
                    stroke="#a1a1aa"
                    strokeDasharray="5 3"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="Cum. actual"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Savings rate bar */}
            {pastPoints.some((p) => p.actualIncome > 0) && (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  Monthly savings rate (% of income saved) · avg {avgSavingsRate.toFixed(1)}%
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <ComposedChart
                    data={chartData.filter((d) => d.savingsRate !== null)}
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip
                      formatter={(v) => [`${Number(v).toFixed(1)}%`, "Savings rate"]}
                    />
                    <ReferenceLine
                      y={avgSavingsRate}
                      stroke="#6366f1"
                      strokeDasharray="4 2"
                      label={{ value: "avg", fontSize: 10, fill: "#6366f1", position: "right" }}
                    />
                    <Bar
                      dataKey="savingsRate"
                      name="Savings rate"
                      radius={[3, 3, 0, 0]}
                      fill="#10b981"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
