import { db } from "@/db/client";
import {
  accounts,
  budgets,
  budgetLines,
  categories,
  transactions,
  transfers,
  savingsSnapshots,
  savingsSnapshotLines,
} from "@/db/schema";
import { and, eq, gte, lte, sum, desc } from "drizzle-orm";

// Amounts grouped by ISO currency code — never forced into a single currency.
export type CurrencyTotals = Record<string, number>;

export function addTo(totals: CurrencyTotals, currency: string, amount: number) {
  totals[currency] = (totals[currency] ?? 0) + amount;
}

export type MonthData = {
  month: number;
  name: string;
  plannedIncome: CurrencyTotals;
  actualIncome: CurrencyTotals;
  plannedExpenses: CurrencyTotals;
  actualExpenses: CurrencyTotals;
};

export type DashboardData = {
  budget: any;
  monthlyData: MonthData[];
  currentMonthIdx: number;
  yearIncomePlanned: CurrencyTotals;
  yearIncomeActual: CurrencyTotals;
  yearExpensesPlanned: CurrencyTotals;
  yearExpensesActual: CurrencyTotals;
  ytdIncomePlanned: CurrencyTotals;
  ytdIncomeActual: CurrencyTotals;
  ytdExpensesPlanned: CurrencyTotals;
  ytdExpensesActual: CurrencyTotals;
  yearNetActual: CurrencyTotals;
  allSavingsLines: Array<{ amount: string | null; currencyCode: string | null }>;
  yearTransfers: Array<{
    id: string;
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    sourceAmount: string;
    targetAmount: string;
    feeAmount: string | null;
    taxAmount: string | null;
    effectiveFxRate: string | null;
    occurredAt: Date;
  }>;
  transferImpacts: CurrencyTotals;
  totalFees: CurrencyTotals;
};

/**
 * Fetches all data needed for dashboard computations
 */
export async function fetchDashboardData(year: number, userId: string): Promise<DashboardData> {
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i).toLocaleString("en-US", { month: "short" })
  );

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, userId)),
  });
  if (!budget) throw new Error("Budget not found");

  // Budget lines with category kind
  const allBudgetLines = await db
    .select({
      categoryId: budgetLines.categoryId,
      month: budgetLines.month,
      plannedAmount: budgetLines.plannedAmount,
      currencyCode: budgetLines.currencyCode,
      kind: categories.kind,
    })
    .from(budgetLines)
    .innerJoin(
      categories,
      and(eq(budgetLines.categoryId, categories.id), eq(categories.userId, userId))
    )
    .where(eq(budgetLines.budgetId, budget.id));

  const allTransactions = await db
    .select({
      amount: transactions.amount,
      currencyCode: transactions.currencyCode,
      transactionType: transactions.transactionType,
      month: budgetLines.month,
      budgetId: budgetLines.budgetId,
      accountId: accounts.id
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(budgetLines, eq(transactions.budgetLineId, budgetLines.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(budgetLines.budgetId, budget.id)
      ));

  // Savings snapshot for Jan 1 of this year
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const allSavingsLines = await db
    .select({
      amount: sum(savingsSnapshotLines.amount),
      currencyCode: accounts.currencyCode,
    }).from(savingsSnapshotLines)
    .innerJoin(savingsSnapshots, eq(savingsSnapshotLines.snapshotId, savingsSnapshots.id))
    .leftJoin(accounts, eq(savingsSnapshotLines.accountId, accounts.id))
    .where(and(
      eq(savingsSnapshots.userId, userId),
      eq(savingsSnapshots.asOf, yearStart)
    ))
    .orderBy(desc(sum(savingsSnapshotLines.amount)))
    .groupBy(accounts.currencyCode);

  // FX transfers for this year (detailed data for dashboard)
  const yearTransfers = await db
    .select({
      id: transfers.id,
      sourceCurrencyCode: transfers.sourceCurrencyCode,
      targetCurrencyCode: transfers.targetCurrencyCode,
      sourceAmount: transfers.sourceAmount,
      targetAmount: transfers.targetAmount,
      feeAmount: transfers.feeAmount,
      taxAmount: transfers.taxAmount,
      effectiveFxRate: transfers.effectiveFxRate,
      occurredAt: transfers.occurredAt,
    })
    .from(transfers)
    .where(
      and(
        eq(transfers.userId, userId),
        gte(transfers.occurredAt, yearStart),
        lte(transfers.occurredAt, yearEnd)
      )
    );

  // --- Aggregate monthly data (no currency conversion) ---
  const monthlyData: MonthData[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;

    const plannedIncome: CurrencyTotals = {};
    const plannedExpenses: CurrencyTotals = {};
    const actualIncome: CurrencyTotals = {};
    const actualExpenses: CurrencyTotals = {};

    for (const l of allBudgetLines) {
      if (l.month !== month) continue;
      if (l.kind === "income") addTo(plannedIncome, l.currencyCode, Number(l.plannedAmount));
      else addTo(plannedExpenses, l.currencyCode, Number(l.plannedAmount));
    }

    for (const tx of allTransactions) {
      if (tx.month !== month) continue;
      if (tx.transactionType === "income") addTo(actualIncome, tx.currencyCode, Number(tx.amount));
      else addTo(actualExpenses, tx.currencyCode, Number(tx.amount));
    }

    return { month, name: monthNames[i], plannedIncome, actualIncome, plannedExpenses, actualExpenses };
  });

  // Current UTC month index (0-based) for "future" dimming and YTD cutoff
  const now = new Date();
  const currentMonthIdx = now.getUTCFullYear() === year ? now.getUTCMonth() : 11;

  // --- Year-level totals by currency (full year, for monthly tfoot) ---
  const yearIncomePlanned: CurrencyTotals = {};
  const yearIncomeActual: CurrencyTotals = {};
  const yearExpensesPlanned: CurrencyTotals = {};
  const yearExpensesActual: CurrencyTotals = {};

  for (const m of monthlyData) {
    for (const [c, amt] of Object.entries(m.plannedIncome)) addTo(yearIncomePlanned, c, amt);
    for (const [c, amt] of Object.entries(m.actualIncome)) addTo(yearIncomeActual, c, amt);
    for (const [c, amt] of Object.entries(m.plannedExpenses)) addTo(yearExpensesPlanned, c, amt);
    for (const [c, amt] of Object.entries(m.actualExpenses)) addTo(yearExpensesActual, c, amt);
  }

  // --- YTD totals: months 1 through currentMonth (for KPI cards) ---
  const ytdMonths = monthlyData.filter((m) => m.month <= currentMonthIdx + 1);
  const ytdIncomePlanned: CurrencyTotals = {};
  const ytdIncomeActual: CurrencyTotals = {};
  const ytdExpensesPlanned: CurrencyTotals = {};
  const ytdExpensesActual: CurrencyTotals = {};

  for (const m of ytdMonths) {
    for (const [c, amt] of Object.entries(m.plannedIncome)) addTo(ytdIncomePlanned, c, amt);
    for (const [c, amt] of Object.entries(m.actualIncome)) addTo(ytdIncomeActual, c, amt);
    for (const [c, amt] of Object.entries(m.plannedExpenses)) addTo(ytdExpensesPlanned, c, amt);
    for (const [c, amt] of Object.entries(m.actualExpenses)) addTo(ytdExpensesActual, c, amt);
  }

  // Net balance per currency (income - expenses, for any currency with activity)
  const yearNetActual: CurrencyTotals = {};
  const allCurrencies = new Set([
    ...Object.keys(yearIncomeActual),
    ...Object.keys(yearExpensesActual),
  ]);
  for (const c of allCurrencies) {
    const net = (yearIncomeActual[c] ?? 0) - (yearExpensesActual[c] ?? 0);
    if (net !== 0) yearNetActual[c] = net;
  }

  // Calculate transfer impacts by currency
  const transferImpacts: CurrencyTotals = {};
  const totalFees: CurrencyTotals = {};
  
  for (const transfer of yearTransfers) {
    const sourceAmount = Number(transfer.sourceAmount);
    const targetAmount = Number(transfer.targetAmount);
    const fees = Number(transfer.feeAmount) + Number(transfer.taxAmount);
    
    // Source currency: money out (negative impact)
    addTo(transferImpacts, transfer.sourceCurrencyCode, -(sourceAmount + fees));
    addTo(totalFees, transfer.sourceCurrencyCode, fees);
    
    // Target currency: money in (positive impact)
    addTo(transferImpacts, transfer.targetCurrencyCode, targetAmount);
  }

  return {
    budget,
    monthlyData,
    currentMonthIdx,
    yearIncomePlanned,
    yearIncomeActual,
    yearExpensesPlanned,
    yearExpensesActual,
    ytdIncomePlanned,
    ytdIncomeActual,
    ytdExpensesPlanned,
    ytdExpensesActual,
    yearNetActual,
    allSavingsLines,
    yearTransfers,
    transferImpacts,
    totalFees,
  };
}

/**
 * Calculates savings data for a given currency
 */
export function calculateSavingsData(
  currencyCode: string,
  startingBalance: string | null,
  yearNetActual: CurrencyTotals,
  transferImpacts: CurrencyTotals
) {
  const startingBalanceNum = Number(startingBalance) || 0;
  const netIncome = yearNetActual[currencyCode] ?? 0;
  const transferImpact = transferImpacts[currencyCode] ?? 0;
  const finalBalance = startingBalanceNum + netIncome + transferImpact;
  
  return {
    startingBalance: startingBalanceNum,
    netIncome,
    transferImpact,
    finalBalance,
  };
}

/**
 * Gets YTD (Year-to-Date) totals for income and expenses
 */
export function getYtdTotals(data: DashboardData) {
  return {
    income: {
      planned: data.ytdIncomePlanned,
      actual: data.ytdIncomeActual,
    },
    expenses: {
      planned: data.ytdExpensesPlanned,
      actual: data.ytdExpensesActual,
    },
  };
}

/**
 * Gets yearly totals for income and expenses
 */
export function getYearlyTotals(data: DashboardData) {
  return {
    income: {
      planned: data.yearIncomePlanned,
      actual: data.yearIncomeActual,
    },
    expenses: {
      planned: data.yearExpensesPlanned,
      actual: data.yearExpensesActual,
    },
  };
}

/**
 * Calculates net balance (income - expenses) by currency
 */
export function calculateNetBalance(
  incomeActual: CurrencyTotals,
  expensesActual: CurrencyTotals
): CurrencyTotals {
  const netBalance: CurrencyTotals = {};
  const allCurrencies = new Set([
    ...Object.keys(incomeActual),
    ...Object.keys(expensesActual),
  ]);
  
  for (const currency of allCurrencies) {
    const net = (incomeActual[currency] ?? 0) - (expensesActual[currency] ?? 0);
    if (net !== 0) netBalance[currency] = net;
  }
  
  return netBalance;
}

/**
 * Calculates transfer impacts and fees by currency
 */
export function calculateTransferImpacts(transfers: DashboardData['yearTransfers']) {
  const transferImpacts: CurrencyTotals = {};
  const totalFees: CurrencyTotals = {};
  
  for (const transfer of transfers) {
    const sourceAmount = Number(transfer.sourceAmount);
    const targetAmount = Number(transfer.targetAmount);
    const fees = Number(transfer.feeAmount || 0) + Number(transfer.taxAmount || 0);
    
    // Source currency: money out (negative impact)
    addTo(transferImpacts, transfer.sourceCurrencyCode, -(sourceAmount + fees));
    addTo(totalFees, transfer.sourceCurrencyCode, fees);
    
    // Target currency: money in (positive impact)
    addTo(transferImpacts, transfer.targetCurrencyCode, targetAmount);
  }
  
  return { transferImpacts, totalFees };
}
