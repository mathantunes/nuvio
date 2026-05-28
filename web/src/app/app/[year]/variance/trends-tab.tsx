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
import { Card, CardHeader, CardTitle, Table, Thead, Tbody, Tfoot, Th, Td, Tr } from "@/components/ui";

type Props = {
  categoryTrends: CategoryTrends;
  disciplineScores: MonthlyDisciplineScore[];
  currentMonthIdx: number;
};

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

type KindTab = "expenses" | "income";
type InsightTone = "danger" | "success" | "brand";

export function TrendsTab({ categoryTrends, disciplineScores, currentMonthIdx }: Props) {
  const [kindTab, setKindTab] = useState<KindTab>("expenses");

  const rows = kindTab === "expenses" ? categoryTrends.expenses : categoryTrends.income;
  const currencies = [...new Set(rows.map((r) => r.currencyCode))].sort();
  const pastMonths = currentMonthIdx + 1;

  const disciplineData = disciplineScores
    .filter((d) => d.isPast)
    .map((d) => ({ name: d.monthName, score: d.score, count: `${d.onBudgetCount}/${d.totalCount}` }));

  const avgScore =
    disciplineData.length > 0
      ? disciplineData.reduce((s, d) => s + d.score, 0) / disciplineData.length
      : 0;

  return (
    <div className="space-y-6">
    <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Budget Discipline Score
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-subtle)" }}>
              % of expense categories within budget each month
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-bold"
              style={{
                color:
                  avgScore >= 80
                    ? "var(--color-on-track)"
                    : avgScore >= 60
                      ? "var(--color-warning)"
                      : "var(--color-off-track)",
              }}
            >
              {avgScore.toFixed(0)}%
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
              YTD avg
            </p>
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
              {disciplineData.map((_entry, idx) => null)}
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
          <p className="py-6 text-center text-xs" style={{ color: "var(--color-text-subtle)" }}>
            No data yet for this year.
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Category Trends
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-subtle)" }}>
              Month-by-month budget adherence per category
            </p>
          </div>

          <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: "var(--color-on-track)" }}
              />
              Within
              <span
                className="ml-1 inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: "var(--color-off-track)" }}
              />
              Over
              <span
                className="ml-1 inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: "var(--color-surface-raised)" }}
              />
              No data
            </div>
          </div>
        </div>

        {currencies.map((currency) => {
          const currencyRows = rows
            .filter((r) => r.currencyCode === currency)
            .sort((a, b) => {
              const aRate = pastMonths > 0 ? a.onBudgetCount / pastMonths : 0;
              const bRate = pastMonths > 0 ? b.onBudgetCount / pastMonths : 0;
              return aRate - bRate;
            });

          if (currencyRows.length === 0) return null;

          return (
            <div key={currency} className="space-y-1">
              <p className="mb-2 text-xs font-medium" style={{ color: "var(--color-text-subtle)" }}>
                {currency}
              </p>

              <div className="overflow-x-auto">
                <Table className="border-separate border-spacing-y-0.5 text-xs">
                  <Thead>
                    <Tr>
                      <Th className="w-36 pr-3">Category</Th>
                      {MONTH_LABELS.map((m, idx) => (
                        <Th
                          key={idx}
                          className="w-7 px-0.5 text-center"
                          style={{
                            color:
                              idx <= currentMonthIdx
                                ? "var(--color-text-muted)"
                                : "var(--color-text-subtle)",
                          }}
                        >
                          {m}
                        </Th>
                      ))}
                      <Th numeric className="pl-3">YTD</Th>
                      <Th numeric className="pl-2">vs plan</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
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
                  </Tbody>
                </Table>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <p className="py-6 text-center text-xs" style={{ color: "var(--color-text-subtle)" }}>
            No {kindTab} categories found. Add budget lines in Planning.
          </p>
        )}
      </Card>

      {pastMonths > 0 && (
        <TopPerformers
          categoryTrends={categoryTrends}
          currentMonthIdx={currentMonthIdx}
        />
      )}
    </div>
  );
}

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
    <Tr className="group">
      <Td muted className="max-w-[9rem] truncate py-0.5 pr-3 font-medium">
        {row.categoryName}
      </Td>
      {row.months.map((m, idx) => {
        const isFuture = idx > currentMonthIdx;
        const isHovered = hovered === idx;

        let backgroundColor = "var(--color-surface-raised)";
        if (!isFuture && m.status === "good") backgroundColor = "var(--color-on-track)";
        if (!isFuture && m.status === "over") backgroundColor = "var(--color-off-track)";

        return (
          <Td key={idx} className="relative px-0.5 py-0.5 text-center">
            <div
              className="relative mx-auto h-5 w-5 rounded-sm cursor-default transition-transform"
              style={{
                backgroundColor,
                opacity: isHovered ? 1 : isFuture ? 0.2 : 0.8,
                transform: isHovered ? "scale(1.25)" : undefined,
                zIndex: isHovered ? 10 : undefined,
              }}
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
          </Td>
        );
      })}
      <Td numeric muted className="py-0.5 pl-3 tabular-nums">
        {formatCurrency(row.ytdActual, currency)}
      </Td>
      <Td
        numeric
        className="py-0.5 pl-2 font-medium tabular-nums"
        style={{ color: varGood ? "var(--color-on-track)" : "var(--color-off-track)" }}
      >
        {ytdVariance >= 0 ? "+" : ""}
        {formatCurrency(ytdVariance, currency)}
      </Td>
    </Tr>
  );
}

function TopPerformers({
  categoryTrends,
  currentMonthIdx,
}: {
  categoryTrends: CategoryTrends;
  currentMonthIdx: number;
}) {
  const overspenders = [...categoryTrends.expenses]
    .filter((r) => r.ytdPlanned > 0 && r.ytdActual > r.ytdPlanned)
    .sort((a, b) => b.ytdActual - b.ytdPlanned - (a.ytdActual - a.ytdPlanned))
    .slice(0, 3);

  const disciplined = [...categoryTrends.expenses]
    .filter((r) => r.ytdPlanned > 0)
    .sort((a, b) => b.onBudgetCount - a.onBudgetCount)
    .slice(0, 3);

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
          tone="danger"
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
          tone="success"
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
          tone="brand"
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
  tone,
  items,
}: {
  title: string;
  emoji: string;
  tone: InsightTone;
  items: Array<{ name: string; currency: string; detail: string; sub: string; bad: boolean }>;
}) {
  const style =
    tone === "danger"
      ? {
          backgroundColor: "var(--color-off-track-subtle)",
          borderColor: "var(--color-off-track)",
        }
      : tone === "success"
        ? {
            backgroundColor: "var(--color-on-track-subtle)",
            borderColor: "var(--color-on-track)",
          }
        : {
            backgroundColor: "var(--color-brand-subtle)",
            borderColor: "var(--color-brand)",
          };

  return (
    <Card className="space-y-3" style={style}>
      <div className="flex items-center gap-2">
        <span>{emoji}</span>
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {title}
        </h3>
      </div>
      <ol className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-xs">
            <span className="font-medium" style={{ color: "var(--color-text)" }}>
              {idx + 1}. {item.name}
            </span>
            <p style={{ color: item.bad ? "var(--color-off-track)" : "var(--color-on-track)" }}>
              {item.detail}
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>{item.sub}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
