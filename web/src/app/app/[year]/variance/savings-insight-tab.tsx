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
import { IconCheck, IconWarning } from "@/components/icons";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currencies.map((currency) => {
          const projection = savingsTimeline.yearEndProjection[currency];
          const plan = savingsTimeline.yearEndPlan[currency];
          const points = savingsTimeline.byCurrency[currency];
          const ytdActual = points
            .filter((p) => p.month <= currentMonthIdx)
            .reduce((s, p) => s + p.actualSavings, 0);
          const cumulativePlannedYTD = points
            .filter((p) => p.month <= currentMonthIdx)
            .reduce((s, p) => s + p.plannedSavings, 0);
          const diff = projection - plan;
          const onTrack = diff >= 0;

          const rateMonths = points.filter((p) => p.isPast && p.actualIncome > 0);
          const avgRate =
            rateMonths.length > 0
              ? rateMonths.reduce((s, p) => s + p.savingsRate, 0) / rateMonths.length
              : 0;

          return (
            <div key={currency} className="card space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {currency}
                </h3>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: onTrack
                      ? "var(--color-on-track-subtle)"
                      : "var(--color-off-track-subtle)",
                    color: onTrack ? "var(--color-on-track)" : "var(--color-off-track)",
                  }}
                >
                  {onTrack ? (
                    <><IconCheck size={12} /> On track</>
                  ) : (
                    <><IconWarning size={12} /> Off track</>
                  )}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-subtle)" }}>YTD saved</span>
                  <span className="font-semibold" style={{ color: "var(--color-text)" }}>
                    {formatCurrency(ytdActual, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-subtle)" }}>Year plan</span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {formatCurrency(plan, currency)}
                  </span>
                </div>
                <div
                  className="flex justify-between border-t pt-2"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span style={{ color: "var(--color-text-subtle)" }}>Dec 31 projection</span>
                  <span
                    className="font-bold"
                    style={{ color: onTrack ? "var(--color-on-track)" : "var(--color-off-track)" }}
                  >
                    {formatCurrency(projection, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--color-text-subtle)" }}>vs plan</span>
                  <span
                    className="font-medium"
                    style={{ color: onTrack ? "var(--color-on-track)" : "var(--color-off-track)" }}
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatCurrency(diff, currency)}
                  </span>
                </div>
                <div
                  className="flex justify-between border-t pt-2"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span style={{ color: "var(--color-text-subtle)" }}>Avg savings rate</span>
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        avgRate >= 15
                          ? "var(--color-on-track)"
                          : avgRate >= 5
                            ? "var(--color-warning)"
                            : "var(--color-off-track)",
                    }}
                  >
                    {avgRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {plan > 0 && (
                <div>
                  <div
                    className="mb-1 flex justify-between text-[10px]"
                    style={{ color: "var(--color-text-subtle)" }}
                  >
                    <span>Year progress</span>
                    <span>{Math.round((ytdActual / plan) * 100)}% of plan</span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full"
                    style={{ backgroundColor: "var(--color-surface-raised)" }}
                  >
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor:
                          ytdActual >= cumulativePlannedYTD
                            ? "var(--color-on-track-subtle)"
                            : "var(--color-off-track-subtle)",
                        width: `${Math.min((ytdActual / plan) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="relative h-0">
                    <div
                      className="absolute -top-3 h-3 w-0.5"
                      style={{
                        backgroundColor: "var(--color-text-subtle)",
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
            <div
              className="min-w-[180px] space-y-1 rounded-lg border p-3 text-xs shadow-sm"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <p className="mb-1 font-semibold" style={{ color: "var(--color-text)" }}>
                {label}
              </p>
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
          <div key={currency} className="card space-y-6">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {currency} — Monthly Savings
            </h3>

            <div>
              <p className="mb-2 text-xs" style={{ color: "var(--color-text-subtle)" }}>
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

            <div>
              <p className="mb-2 text-xs" style={{ color: "var(--color-text-subtle)" }}>
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

            {pastPoints.some((p) => p.actualIncome > 0) && (
              <div>
                <p className="mb-2 text-xs" style={{ color: "var(--color-text-subtle)" }}>
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
