import { db } from "@/db/client";
import {
  budgets,
  budgetLines,
  categories,
  transactions,
} from "@/db/schema";
import { and, eq, sum } from "drizzle-orm";

export type CategoryVarianceRow = {
  categoryId: string;
  categoryName: string;
  categoryKind: string;
  currencyCode: string;
  month: number;
  planned: number;
  actual: number;
  variance: number; // planned - actual (positive = under budget for expenses)
  pct: number;      // actual / planned * 100 (0 when planned = 0)
};

export type MonthlyVarianceData = {
  expenses: CategoryVarianceRow[];
  income: CategoryVarianceRow[];
};

export type YtdVarianceData = {
  expenses: CategoryVarianceSummary[];
  income: CategoryVarianceSummary[];
};

/** Aggregated across multiple months for the YTD view */
export type CategoryVarianceSummary = {
  categoryId: string;
  categoryName: string;
  categoryKind: string;
  currencyCode: string;
  planned: number;
  actual: number;
  variance: number;
  pct: number;
};

export type VarianceData = {
  /** Raw per-category per-month rows for the full year */
  rows: CategoryVarianceRow[];
  currentMonthIdx: number;
};

/**
 * Fetches all budget lines and their linked transaction actuals for a given
 * year, returning one row per (category, currency, month).
 *
 * Transactions without a budgetLineId are excluded — they cannot be mapped
 * to a planned category. Transactions are grouped to match budget line currency.
 */
export async function fetchVarianceData(
  year: number,
  userId: string
): Promise<VarianceData> {
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, userId)),
  });
  if (!budget) throw new Error("Budget not found");

  // All budget lines with category info
  const lines = await db
    .select({
      id: budgetLines.id,
      categoryId: budgetLines.categoryId,
      categoryName: categories.name,
      categoryKind: categories.kind,
      currencyCode: budgetLines.currencyCode,
      month: budgetLines.month,
      plannedAmount: budgetLines.plannedAmount,
    })
    .from(budgetLines)
    .innerJoin(
      categories,
      and(
        eq(budgetLines.categoryId, categories.id),
        eq(categories.userId, userId)
      )
    )
    .where(eq(budgetLines.budgetId, budget.id));

  // Actual totals grouped by budget_line_id, scoped to this budget year
  const actuals = await db
    .select({
      budgetLineId: transactions.budgetLineId,
      actualAmount: sum(transactions.amount),
    })
    .from(transactions)
    .innerJoin(
      budgetLines,
      and(
        eq(transactions.budgetLineId, budgetLines.id),
        eq(budgetLines.budgetId, budget.id)
      )
    )
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.budgetLineId);

  // actuals keyed by budgetLineId for O(1) lookup
  const actualsMap = new Map(
    actuals
      .filter((a) => a.budgetLineId !== null)
      .map((a) => [a.budgetLineId!, Number(a.actualAmount ?? 0)])
  );

  const now = new Date();
  const currentMonthIdx =
    now.getUTCFullYear() === year ? now.getUTCMonth() : 11;

  const rows: CategoryVarianceRow[] = lines.map((line) => {
    const planned = Number(line.plannedAmount ?? 0);
    const actual = actualsMap.get(line.id) ?? 0;
    const variance = planned - actual;
    const pct = planned !== 0 ? (actual / planned) * 100 : 0;

    return {
      categoryId: line.categoryId,
      categoryName: line.categoryName,
      categoryKind: line.categoryKind ?? "expense",
      currencyCode: line.currencyCode,
      month: line.month,
      planned,
      actual,
      variance,
      pct,
    };
  });

  return { rows, currentMonthIdx };
}

/** Filter rows to a specific month and split by kind */
export function getMonthlyVariance(
  rows: CategoryVarianceRow[],
  month: number
): MonthlyVarianceData {
  const monthRows = rows.filter((r) => r.month === month);
  return splitByKind(monthRows);
}

/** Aggregate rows across months 1..currentMonth+1 and split by kind */
export function getYtdVariance(
  rows: CategoryVarianceRow[],
  currentMonthIdx: number
): YtdVarianceData {
  const ytdRows = rows.filter((r) => r.month <= currentMonthIdx + 1);

  // Aggregate by (categoryId, currencyCode)
  const map = new Map<string, CategoryVarianceSummary>();
  for (const row of ytdRows) {
    const key = `${row.categoryId}__${row.currencyCode}`;
    if (!map.has(key)) {
      map.set(key, {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryKind: row.categoryKind,
        currencyCode: row.currencyCode,
        planned: 0,
        actual: 0,
        variance: 0,
        pct: 0,
      });
    }
    const entry = map.get(key)!;
    entry.planned += row.planned;
    entry.actual += row.actual;
  }

  // Recompute derived fields after aggregation
  const summaries = Array.from(map.values()).map((s) => ({
    ...s,
    variance: s.planned - s.actual,
    pct: s.planned !== 0 ? (s.actual / s.planned) * 100 : 0,
  }));

  return splitByKind(summaries);
}

function splitByKind<T extends { categoryKind: string }>(
  rows: T[]
): { expenses: T[]; income: T[] } {
  return {
    expenses: rows.filter((r) => r.categoryKind !== "income"),
    income: rows.filter((r) => r.categoryKind === "income"),
  };
}

// ─── Savings Timeline ─────────────────────────────────────────────────────────

export type MonthlySavingsPoint = {
  month: number;
  monthName: string;
  plannedIncome: number;
  actualIncome: number;
  plannedExpenses: number;
  actualExpenses: number;
  plannedSavings: number;
  actualSavings: number;
  /** Running cumulative planned savings Jan→this month */
  cumulativePlanned: number;
  /** Running cumulative actual savings Jan→this month */
  cumulativeActual: number;
  /** Actual savings as % of actual income (NaN-safe: 0 when income=0) */
  savingsRate: number;
  /** Whether this month's data is past/current (true) or future (false) */
  isPast: boolean;
};

export type SavingsTimeline = {
  byCurrency: Record<string, MonthlySavingsPoint[]>;
  /** Projected year-end savings by currency given current monthly pace */
  yearEndProjection: Record<string, number>;
  /** Planned full-year savings by currency */
  yearEndPlan: Record<string, number>;
};

/**
 * Builds a per-currency, per-month savings timeline from the raw variance rows.
 * Includes cumulative totals and a year-end projection based on average YTD pace.
 */
export function getSavingsTimeline(
  rows: CategoryVarianceRow[],
  currentMonthIdx: number
): SavingsTimeline {
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleString("en-US", { month: "short" })
  );

  // Collect all currencies present in this budget
  const currencies = [...new Set(rows.map((r) => r.currencyCode))].sort();

  const byCurrency: Record<string, MonthlySavingsPoint[]> = {};
  const yearEndProjection: Record<string, number> = {};
  const yearEndPlan: Record<string, number> = {};

  for (const currency of currencies) {
    const currencyRows = rows.filter((r) => r.currencyCode === currency);

    let cumulativePlanned = 0;
    let cumulativeActual = 0;
    const points: MonthlySavingsPoint[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthRows = currencyRows.filter((r) => r.month === m);
      const isPast = m <= currentMonthIdx + 1;

      const plannedIncome = monthRows
        .filter((r) => r.categoryKind === "income")
        .reduce((s, r) => s + r.planned, 0);
      const actualIncome = monthRows
        .filter((r) => r.categoryKind === "income")
        .reduce((s, r) => s + r.actual, 0);
      const plannedExpenses = monthRows
        .filter((r) => r.categoryKind !== "income")
        .reduce((s, r) => s + r.planned, 0);
      const actualExpenses = monthRows
        .filter((r) => r.categoryKind !== "income")
        .reduce((s, r) => s + r.actual, 0);

      const plannedSavings = plannedIncome - plannedExpenses;
      const actualSavings = isPast ? actualIncome - actualExpenses : 0;

      cumulativePlanned += plannedSavings;
      if (isPast) cumulativeActual += actualSavings;

      const savingsRate =
        actualIncome > 0 ? (actualSavings / actualIncome) * 100 : 0;

      points.push({
        month: m,
        monthName: monthNames[m - 1],
        plannedIncome,
        actualIncome,
        plannedExpenses,
        actualExpenses,
        plannedSavings,
        actualSavings,
        cumulativePlanned,
        cumulativeActual: isPast ? cumulativeActual : 0,
        savingsRate,
        isPast,
      });
    }

    byCurrency[currency] = points;

    // Year-end plan: sum of all 12 months' planned savings
    yearEndPlan[currency] = points.reduce((s, p) => s + p.plannedSavings, 0);

    // Year-end projection: extrapolate avg monthly actual savings over remaining months
    const pastMonths = currentMonthIdx + 1;
    const avgMonthlyActual =
      pastMonths > 0 ? cumulativeActual / pastMonths : 0;
    yearEndProjection[currency] = avgMonthlyActual * 12;
  }

  return { byCurrency, yearEndProjection, yearEndPlan };
}

// ─── Category Trends ──────────────────────────────────────────────────────────

export type CategoryTrendRow = {
  categoryId: string;
  categoryName: string;
  categoryKind: string;
  currencyCode: string;
  /** Index 0 = January … 11 = December */
  months: Array<{
    planned: number;
    actual: number;
    /** For expenses: positive = under budget (good). For income: positive = over plan (good). */
    variance: number;
    /** "good" | "over" | "none" (no budget line for this month) */
    status: "good" | "over" | "none";
  }>;
  /** How many YTD months were within budget */
  onBudgetCount: number;
  /** Total actual YTD */
  ytdActual: number;
  /** Total planned YTD */
  ytdPlanned: number;
};

export type CategoryTrends = {
  expenses: CategoryTrendRow[];
  income: CategoryTrendRow[];
};

/**
 * Reshapes flat variance rows into a categories × months matrix, used for the
 * Trends heatmap. Only includes months up to currentMonthIdx for actual data.
 */
export function getCategoryTrends(
  rows: CategoryVarianceRow[],
  currentMonthIdx: number
): CategoryTrends {
  // Build a map keyed by (categoryId, currencyCode)
  const map = new Map<string, CategoryTrendRow>();

  for (const row of rows) {
    const key = `${row.categoryId}__${row.currencyCode}`;
    if (!map.has(key)) {
      map.set(key, {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryKind: row.categoryKind,
        currencyCode: row.currencyCode,
        months: Array.from({ length: 12 }, () => ({
          planned: 0,
          actual: 0,
          variance: 0,
          status: "none" as const,
        })),
        onBudgetCount: 0,
        ytdActual: 0,
        ytdPlanned: 0,
      });
    }

    const entry = map.get(key)!;
    const mIdx = row.month - 1; // 0-based
    const isPast = row.month <= currentMonthIdx + 1;
    const isExpense = row.categoryKind !== "income";

    const actual = isPast ? row.actual : 0;
    const variance = isExpense
      ? row.planned - actual // positive = under budget
      : actual - row.planned; // positive = over plan

    let status: "good" | "over" | "none" = "none";
    if (isPast && row.planned > 0) {
      status = isExpense
        ? actual <= row.planned
          ? "good"
          : "over"
        : actual >= row.planned
        ? "good"
        : "over";
    } else if (isPast && row.planned === 0 && actual > 0) {
      // Spent without a plan — always "over"
      status = isExpense ? "over" : "good";
    }

    entry.months[mIdx] = { planned: row.planned, actual, variance, status };

    if (isPast) {
      entry.ytdActual += actual;
      entry.ytdPlanned += row.planned;
      if (status === "good") entry.onBudgetCount++;
    }
  }

  const all = Array.from(map.values());
  return {
    expenses: all.filter((r) => r.categoryKind !== "income"),
    income: all.filter((r) => r.categoryKind === "income"),
  };
}

// ─── Discipline Score ─────────────────────────────────────────────────────────

export type MonthlyDisciplineScore = {
  month: number;
  monthName: string;
  /** 0–100 */
  score: number;
  onBudgetCount: number;
  totalCount: number;
  isPast: boolean;
};

/**
 * Per-month budget discipline score: % of expense categories that stayed
 * within their planned budget. Income categories are excluded (they affect
 * savings but not "discipline" in the spending sense).
 */
export function getDisciplineScores(
  rows: CategoryVarianceRow[],
  currentMonthIdx: number
): MonthlyDisciplineScore[] {
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleString("en-US", { month: "short" })
  );

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const isPast = m <= currentMonthIdx + 1;
    const monthRows = rows.filter(
      (r) => r.month === m && r.categoryKind !== "income"
    );

    const onBudgetCount = monthRows.filter(
      (r) => r.planned > 0 && r.actual <= r.planned
    ).length;
    const totalCount = monthRows.filter((r) => r.planned > 0).length;
    const score = totalCount > 0 ? (onBudgetCount / totalCount) * 100 : 0;

    return {
      month: m,
      monthName: monthNames[i],
      score,
      onBudgetCount,
      totalCount,
      isPast,
    };
  });
}
