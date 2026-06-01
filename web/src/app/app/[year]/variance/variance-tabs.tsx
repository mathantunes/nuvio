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
import { Card, CardTitle, Table, Thead, Tbody, Tfoot, Th, Td, Tr } from "@/components/ui";
import { formatCurrency } from "../planning/currency-format";
import { SavingsInsightTab } from "./savings-insight-tab";
import { TrendsTab } from "./trends-tab";
import type {
  MonthlyVarianceData,
  YtdVarianceData,
  CategoryVarianceRow,
  CategoryVarianceSummary,
  SavingsTimeline,
  CategoryTrends,
  MonthlyDisciplineScore,
} from "@/lib/variance-computations";

type Props = {
  allMonthlyVariance: MonthlyVarianceData[];
  currentMonthIdx: number;
  monthNames: string[];
  savingsTimeline: SavingsTimeline;
  categoryTrends: CategoryTrends;
  disciplineScores: MonthlyDisciplineScore[];
};

type MainTab = "monthly" | "ytd" | "savings" | "trends";
type KindTab = "expenses" | "income";
type DisplayMode = "chart" | "table";

type VarianceTooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
  fill?: string;
};

function CurrencyChartsTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: VarianceTooltipEntry[];
  label?: string | number;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <p className="mb-1 text-xs font-semibold" style={{ color: "var(--color-text)" }}>
        {label}
      </p>
      {payload.map((entry) => {
        if (entry.value === null || entry.value === undefined) return null;

        return (
          <p key={String(entry.dataKey ?? entry.name)} className="text-xs" style={{ color: entry.fill }}>
            {String(entry.dataKey ?? entry.name)}: {formatCurrency(Number(entry.value), currency)}
          </p>
        );
      })}
    </div>
  );
}

const PIE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

function computeYtd(
  allMonthlyVariance: MonthlyVarianceData[],
  throughMonthIdx: number
): YtdVarianceData {
  const map = new Map<string, CategoryVarianceSummary>();
  for (let i = 0; i <= throughMonthIdx; i++) {
    const monthData = allMonthlyVariance[i];
    if (!monthData) continue;
    for (const row of [...monthData.expenses, ...monthData.income]) {
      const key = `${row.categoryId}__${row.currencyCode}`;
      if (!map.has(key)) {
        map.set(key, { ...row, planned: 0, actual: 0, variance: 0, pct: 0 });
      }
      const entry = map.get(key)!;
      entry.planned += row.planned;
      entry.actual += row.actual;
    }
  }
  const summaries = Array.from(map.values()).map((s) => ({
    ...s,
    variance: s.planned - s.actual,
    pct: s.planned !== 0 ? (s.actual / s.planned) * 100 : 0,
  }));
  return {
    expenses: summaries.filter((s) => s.categoryKind !== "income"),
    income: summaries.filter((s) => s.categoryKind === "income"),
  };
}

export function VarianceTabs({
  allMonthlyVariance,
  currentMonthIdx,
  monthNames,
  savingsTimeline,
  categoryTrends,
  disciplineScores,
}: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("monthly");
  const [kindTab, setKindTab] = useState<KindTab>("expenses");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("chart");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx);
  const lastClosedMonthIdx = Math.max(0, currentMonthIdx - 1);
  const [ytdMonthIdx, setYtdMonthIdx] = useState(lastClosedMonthIdx);

  const ytdVariance = computeYtd(allMonthlyVariance, ytdMonthIdx);

  const monthlyData = allMonthlyVariance[selectedMonth];
  const rows: CategoryVarianceRow[] | CategoryVarianceSummary[] =
    mainTab === "monthly"
      ? kindTab === "expenses"
        ? monthlyData.expenses
        : monthlyData.income
      : kindTab === "expenses"
        ? ytdVariance.expenses
        : ytdVariance.income;

  const tabLabels: Record<MainTab, string> = {
    monthly: "Monthly",
    ytd: "YTD",
    savings: "Savings",
    trends: "Trends",
  };

  return (
    <div className="space-y-4">
      <div className="tab-bar overflow-x-auto">
        {(["monthly", "ytd", "savings", "trends"] as MainTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`tab-btn whitespace-nowrap ${mainTab === tab ? "active" : ""}`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {mainTab === "savings" && (
        <SavingsInsightTab
          savingsTimeline={savingsTimeline}
          currentMonthIdx={currentMonthIdx}
        />
      )}

      {mainTab === "trends" && (
        <TrendsTab
          categoryTrends={categoryTrends}
          disciplineScores={disciplineScores}
          currentMonthIdx={currentMonthIdx}
        />
      )}

      {(mainTab === "monthly" || mainTab === "ytd") && (
        <>
          {/* KPI summary cards */}
          <VarianceKpiCards
            income={mainTab === "monthly" ? monthlyData.income : ytdVariance.income}
            expenses={mainTab === "monthly" ? monthlyData.expenses : ytdVariance.expenses}
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                Month:
              </label>
              {mainTab === "monthly" && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="input py-1.5"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx} disabled={idx > currentMonthIdx}>
                      {name} {idx > currentMonthIdx ? "(future)" : ""}
                    </option>
                  ))}
                </select>
              )}
              {mainTab === "ytd" && (
                <select
                  value={ytdMonthIdx}
                  onChange={(e) => setYtdMonthIdx(Number(e.target.value))}
                  className="input py-1.5"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx} disabled={idx > currentMonthIdx}>
                      {name}
                      {idx === lastClosedMonthIdx ? " (last closed)" : ""}
                      {idx === currentMonthIdx ? " (in progress)" : ""}
                      {idx > currentMonthIdx ? " (future)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="tab-bar">
                {(["expenses", "income"] as KindTab[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKindTab(k)}
                    className={`tab-btn ${kindTab === k ? "active" : ""}`}
                  >
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>

              <div className="tab-bar">
                {(["chart", "table"] as DisplayMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDisplayMode(m)}
                    className={`tab-btn ${displayMode === m ? "active" : ""}`}
                  >
                    {m === "chart" ? "Chart" : "Table"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState kindTab={kindTab} />
          ) : displayMode === "chart" ? (
            <ChartView rows={rows} kindTab={kindTab} />
          ) : (
            <TableView rows={rows} kindTab={kindTab} isYtd={mainTab === "ytd"} />
          )}
        </>
      )}
    </div>
  );
}

type VarianceRow = CategoryVarianceRow | CategoryVarianceSummary;

function aggregateByCurrency(rows: VarianceRow[]): Record<string, { planned: number; actual: number }> {
  const result: Record<string, { planned: number; actual: number }> = {};
  for (const row of rows) {
    if (!result[row.currencyCode]) result[row.currencyCode] = { planned: 0, actual: 0 };
    result[row.currencyCode].planned += row.planned;
    result[row.currencyCode].actual += row.actual;
  }
  return result;
}

function VarianceKpiCards({
  income,
  expenses,
}: {
  income: VarianceRow[];
  expenses: VarianceRow[];
}) {
  const incomeByCurrency = aggregateByCurrency(income);
  const expensesByCurrency = aggregateByCurrency(expenses);
  const currencies = [...new Set([...Object.keys(incomeByCurrency), ...Object.keys(expensesByCurrency)])].sort();

  if (currencies.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Income KPI */}
      <Card>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
          Income
        </p>
        <div className="space-y-3">
          {currencies.map((currency, i) => {
            const { planned, actual } = incomeByCurrency[currency] ?? { planned: 0, actual: 0 };
            const pct = planned > 0 ? Math.round((actual / planned) * 100) : null;
            const isAhead = actual >= planned;
            const actualColor = actual > 0
              ? planned > 0
                ? isAhead ? "var(--color-on-track)" : "var(--color-text)"
                : "var(--color-text)"
              : "var(--color-text-subtle)";
            return (
              <div key={currency} className="first:pt-0 last:pb-0"
                style={i > 0 ? { borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" } : undefined}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                    {currency}
                  </span>
                  {pct !== null && (
                    <span className="text-xs font-semibold tabular-nums"
                      style={{ color: isAhead ? "var(--color-on-track)" : "var(--color-off-track)" }}>
                      {isAhead ? "↑" : "↓"} {pct}%
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xl font-bold tabular-nums leading-tight" style={{ color: actualColor }}>
                  {actual > 0 ? formatCurrency(actual, currency) : "—"}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                  of {planned > 0 ? formatCurrency(planned, currency) : "—"} planned
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Expenses KPI */}
      <Card>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
          Expenses
        </p>
        <div className="space-y-3">
          {currencies.map((currency, i) => {
            const { planned, actual } = expensesByCurrency[currency] ?? { planned: 0, actual: 0 };
            const pct = planned > 0 ? Math.round((actual / planned) * 100) : null;
            const isOver = actual > planned;
            const actualColor = actual > 0
              ? planned > 0
                ? isOver ? "var(--color-off-track)" : "var(--color-text)"
                : "var(--color-text)"
              : "var(--color-text-subtle)";
            return (
              <div key={currency} className="first:pt-0 last:pb-0"
                style={i > 0 ? { borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" } : undefined}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                    {currency}
                  </span>
                  {pct !== null && (
                    <span className="text-xs font-semibold tabular-nums"
                      style={{ color: isOver ? "var(--color-off-track)" : "var(--color-on-track)" }}>
                      {isOver ? "↑" : "↓"} {pct}%
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xl font-bold tabular-nums leading-tight" style={{ color: actualColor }}>
                  {actual > 0 ? formatCurrency(actual, currency) : "—"}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                  of {planned > 0 ? formatCurrency(planned, currency) : "—"} planned
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ChartView({
  rows,
  kindTab,
}: {
  rows: (CategoryVarianceRow | CategoryVarianceSummary)[];
  kindTab: KindTab;
}) {
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

  return (
    <Card className="space-y-6">
      <CardTitle>{currency}</CardTitle>

      <div>
        <p className="mb-2 text-xs" style={{ color: "var(--color-text-subtle)" }}>
          Planned vs Actual
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={48} />
            <Tooltip content={<CurrencyChartsTooltip currency={currency} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Planned" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Actual" radius={[3, 3, 0, 0]} label={false}>
              {rows.map((row, idx) => {
                const over = isExpense ? row.actual > row.planned : row.actual < row.planned;
                return <Cell key={idx} fill={over ? "#ef4444" : "#10b981"} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div>
          <p className="mb-2 text-xs" style={{ color: "var(--color-text-subtle)" }}>
            Actual {isExpense ? "spending" : "income"} breakdown
          </p>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
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

            <div className="flex flex-col gap-1.5 text-xs">
              {pieData.map((entry, idx) => {
                const total = pieData.reduce((s, e) => s + e.value, 0);
                const share = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span style={{ color: "var(--color-text-muted)" }}>{entry.name}</span>
                    <span
                      className="ml-auto pl-4"
                      style={{ color: "var(--color-text-subtle)" }}
                    >
                      {share}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

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
          <Table key={currency} caption={currency}>
            <Thead>
              <Tr>
                <Th>Category</Th>
                <Th numeric>Planned</Th>
                <Th numeric>Actual</Th>
                <Th numeric>Variance</Th>
                <Th numeric>% Used</Th>
                {isYtd && <Th className="text-right">Pace</Th>}
              </Tr>
            </Thead>
                <Tbody>
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
                      <Tr key={`${row.categoryId}-${row.currencyCode}`}>
                        <Td className="font-medium">{row.categoryName}</Td>
                        <Td numeric>{formatCurrency(row.planned, currency)}</Td>
                        <Td numeric muted>{formatCurrency(row.actual, currency)}</Td>
                        <Td
                          numeric
                          className="font-medium"
                          style={{ color: over ? "var(--color-off-track)" : "var(--color-on-track)" }}
                        >
                          {row.variance >= 0 ? "+" : ""}
                          {formatCurrency(row.variance, currency)}
                        </Td>
                        <Td
                          numeric
                          className="font-medium"
                          style={{
                            color: over ? "var(--color-off-track)" : "var(--color-text-subtle)",
                          }}
                        >
                          {row.pct.toFixed(1)}%
                        </Td>
                        {isYtd && (
                          <Td className="text-right">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor:
                                  paceLabel === "ahead"
                                    ? over
                                      ? "var(--color-off-track-subtle)"
                                      : "var(--color-on-track-subtle)"
                                    : paceLabel === "on track"
                                      ? "var(--color-brand-subtle)"
                                      : "var(--color-surface-raised)",
                                color:
                                  paceLabel === "ahead"
                                    ? over
                                      ? "var(--color-off-track)"
                                      : "var(--color-on-track)"
                                    : paceLabel === "on track"
                                      ? "var(--color-brand)"
                                      : "var(--color-text-muted)",
                              }}
                            >
                              {paceLabel}
                            </span>
                          </Td>
                        )}
                      </Tr>
                    );
                  })}
                </Tbody>
                <Tfoot>
                  <Tr
                    separator
                    className="[&>td]:border-b-0"
                    style={{ backgroundColor: "var(--color-surface-raised)" }}
                  >
                    <Td className="font-semibold">Total</Td>
                    <Td numeric className="font-semibold">
                      {formatCurrency(totalPlanned, currency)}
                    </Td>
                    <Td numeric className="font-semibold">
                      {formatCurrency(totalActual, currency)}
                    </Td>
                    <Td
                      numeric
                      className="font-semibold"
                      style={{
                        color: isExpense
                          ? totalVariance >= 0
                            ? "var(--color-on-track)"
                            : "var(--color-off-track)"
                          : totalVariance < 0
                            ? "var(--color-off-track)"
                            : "var(--color-on-track)",
                      }}
                    >
                      {totalVariance >= 0 ? "+" : ""}
                      {formatCurrency(totalVariance, currency)}
                    </Td>
                    <Td
                      numeric
                      className="font-semibold"
                      style={{
                        color:
                          isExpense
                            ? totalPct > 100
                              ? "var(--color-off-track)"
                              : "var(--color-text-subtle)"
                            : totalPct < 100
                              ? "var(--color-off-track)"
                              : "var(--color-text-subtle)",
                      }}
                    >
                      {totalPct.toFixed(1)}%
                    </Td>
                    {isYtd && <Td />}
                  </Tr>
                </Tfoot>
              </Table>
        );
      })}
    </div>
  );
}

function EmptyState({ kindTab }: { kindTab: KindTab }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        No {kindTab} budget lines found for this period.
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--color-text-subtle)" }}>
        Add budget lines in Planning to start tracking.
      </p>
    </Card>
  );
}
