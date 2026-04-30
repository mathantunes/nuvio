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
