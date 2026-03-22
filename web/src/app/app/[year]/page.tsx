import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
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
import { formatCurrency } from "./planning/currency-format";

// Amounts grouped by ISO currency code — never forced into a single currency.
type CurrencyTotals = Record<string, number>;

function addTo(totals: CurrencyTotals, currency: string, amount: number) {
  totals[currency] = (totals[currency] ?? 0) + amount;
}

type MonthData = {
  month: number;
  name: string;
  plannedIncome: CurrencyTotals;
  actualIncome: CurrencyTotals;
  plannedExpenses: CurrencyTotals;
  actualExpenses: CurrencyTotals;
};

export default async function BudgetDashboardPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i).toLocaleString("en-US", { month: "short" })
);

  const user = await AuthService.getCurrentUser();

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, user.id)),
  });
  if (!budget) redirect("/app");

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
      and(eq(budgetLines.categoryId, categories.id), eq(categories.userId, user.id))
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
        eq(transactions.userId, user.id),
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
      eq(savingsSnapshots.userId, user.id),
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
        eq(transfers.userId, user.id),
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

  // Transfer currency pairs and impact calculations
  const transferPairs = new Set(
    yearTransfers.map((t) => `${t.sourceCurrencyCode}→${t.targetCurrencyCode}`)
  );

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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{year} budget overview</p>
      </header>

      {/* KPI Cards — YTD plan vs actual, per currency with percentage */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MultiCurrencyCard
          label="Income"
          ytdPlanned={ytdIncomePlanned}
          ytdActual={ytdIncomeActual}
          positiveWhenActualHigher
        />
        <MultiCurrencyCard
          label="Expenses"
          ytdPlanned={ytdExpensesPlanned}
          ytdActual={ytdExpensesActual}
          positiveWhenActualHigher={false}
        />
      </div>

      {/* Monthly Breakdown */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Monthly Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-3 text-left font-medium text-zinc-500 dark:text-zinc-400 w-12">
                  Month
                </th>
                <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                  Income
                </th>
                <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                  Expenses
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {monthlyData.map((m) => {
                const isFuture = m.month - 1 > currentMonthIdx && now.getUTCFullYear() === year;
                const hasActivity =
                  Object.keys(m.actualIncome).length > 0 ||
                  Object.keys(m.actualExpenses).length > 0;
                const currencies = Object.keys(m.plannedIncome);

                return (
                  <tr
                    key={m.month}
                  >
                    <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                      {m.name}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                      <div className={`grid grid-rows-${currencies.length} items-start`}>
                        {currencies.length > 0 &&
                          (Object.entries(m.plannedIncome).map(([currency, plannedIncome]) =>
                            <div key={currency} className={`px-2 text-right ${isFuture ? "opacity-30" : ""}`}>
                              <span className={`${(m.actualIncome[currency] ?? 0) > plannedIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(m.actualIncome[currency] ?? 0, currency)}</span> / {formatCurrency(plannedIncome, currency)}
                            </div>
                          ))}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                      <div className={`grid grid-rows-${currencies.length} items-start`}>
                        {currencies.length > 0 &&
                          (Object.entries(m.plannedExpenses).map(([currency, plannedExpenses]) =>
                            <div key={currency} className={`px-2 text-right ${isFuture ? "opacity-30" : ""}`}>
                              <span className={`${(m.actualExpenses[currency] ?? 0) < plannedExpenses
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(m.actualExpenses[currency] ?? 0, currency)}</span> / {formatCurrency(plannedExpenses, currency)}
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-300 font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 px-2 text-right">
                  <div className={`grid grid-rows-${Object.keys(yearIncomePlanned).length} items-start`}>
                    {Object.entries(yearIncomePlanned).map(([currency, yearIncomePlanned]) =>
                      <div key={currency} className={`px-2 text-right`}>
                        <span className={`${(yearIncomeActual[currency] ?? 0) > yearIncomePlanned
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(yearIncomeActual[currency] ?? 0, currency)}</span> / {formatCurrency(yearIncomePlanned, currency)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2 text-right">
                  <div className={`grid grid-rows-${Object.keys(yearExpensesPlanned).length} items-start`}>
                    {Object.entries(yearExpensesPlanned).map(([currency, yearExpensesPlanned]) =>
                      <div key={currency} className={`px-2 text-right`}>
                        <span className={`${(yearExpensesActual[currency] ?? 0) < yearExpensesPlanned
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(yearExpensesActual[currency] ?? 0, currency)}</span> / {formatCurrency(yearExpensesPlanned, currency)}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Net Balance + Savings + Transfers */}
      <div className="grid gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">FX Transfers</p>
            <a
              href={`/app/${year}/fx`}
              className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 underline"
            >
              Manage →
            </a>
          </div>
          {yearTransfers.length > 0 ? (
            <div className="mt-3 space-y-2">
              {/* Individual transfer lines */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {yearTransfers.map((transfer) => {
                  const totalFees = Number(transfer.feeAmount) + Number(transfer.taxAmount);
                  return (
                    <div key={transfer.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(Number(transfer.sourceAmount), transfer.sourceCurrencyCode)}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-600">→</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(Number(transfer.targetAmount), transfer.targetCurrencyCode)}
                      </span>
                      {totalFees > 0 && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          (fees: {formatCurrency(totalFees, transfer.sourceCurrencyCode)})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Net impact by currency */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Net Transfer Impact</p>
                <div className="space-y-1">
                  {Object.entries(transferImpacts).map(([currency, impact]) => (
                    <div key={currency} className="flex items-center justify-between">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">{currency}</span>
                      <span className={`text-xs font-mono font-semibold ${
                        impact > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {impact > 0 ? "+" : ""}{formatCurrency(impact, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">No FX transfers this year.</p>
              <a
                href={`/app/${year}/fx`}
                className="mt-1 inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 underline"
              >
                Create first transfer →
              </a>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Year snapshot</p>
          {allSavingsLines.length > 0 ? (
            <div className="mt-1 space-y-1">
              {/* Column headers - responsive */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs mb-2">
                <div className="text-zinc-500 dark:text-zinc-400">Start</div>
                <div className="text-zinc-500 dark:text-zinc-400">Income</div>
                <div className="hidden sm:block text-zinc-500 dark:text-zinc-400">FX</div>
                <div className="text-zinc-500 dark:text-zinc-400">Final</div>
              </div>
              {/* Currency rows - responsive */}
              {allSavingsLines.map(({ currencyCode, amount }) => {
                const startingBalance = Number(amount);
                const netIncome = yearNetActual[currencyCode!] ?? 0;
                const transferImpact = transferImpacts[currencyCode!] ?? 0;
                const finalBalance = startingBalance + netIncome + transferImpact;
                
                return (
                  <div key={currencyCode} className="space-y-1 sm:space-y-0">
                    {/* Mobile layout - stacked */}
                    <div className="sm:hidden grid grid-cols-2 gap-2 text-xs">
                      <div className="text-zinc-500 dark:text-zinc-400">Start:</div>
                      <div className="font-mono text-zinc-900 dark:text-zinc-50 text-right">
                        {formatCurrency(startingBalance, currencyCode!)}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400">Income:</div>
                      <div className={`font-mono text-right ${netIncome > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {netIncome > 0 ? "+" : ""}{formatCurrency(netIncome, currencyCode!)}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400">FX:</div>
                      <div className={`font-mono text-right ${transferImpact > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {transferImpact > 0 ? "+" : ""}{formatCurrency(transferImpact, currencyCode!)}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400">Final:</div>
                      <div className={`font-mono font-semibold text-right ${finalBalance > startingBalance ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(finalBalance, currencyCode!)}
                      </div>
                    </div>
                    {/* Desktop layout - horizontal */}
                    <div className="hidden sm:grid grid-cols-4 gap-4 text-xs">
                      <div className="font-mono text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(startingBalance, currencyCode!)}
                      </div>
                      <div className={`font-mono ${netIncome > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {netIncome > 0 ? "+" : ""}{formatCurrency(netIncome, currencyCode!)}
                      </div>
                      <div className={`font-mono ${transferImpact > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {transferImpact > 0 ? "+" : ""}{formatCurrency(transferImpact, currencyCode!)}
                      </div>
                      <div className={`font-mono font-semibold ${finalBalance > startingBalance ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(finalBalance, currencyCode!)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              No savings recorded.{" "}
              <a href={`/app/${year}/savings`} className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
                Add →
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * KPI card showing YTD plan vs actual amounts per currency, with percentage and arrows.
 * Follows the same pattern as the tracking page: ↑/↓ with color based on direction.
 */
function MultiCurrencyCard({
  label,
  ytdPlanned,
  ytdActual,
  positiveWhenActualHigher,
}: {
  label: string;
  ytdPlanned: CurrencyTotals;
  ytdActual: CurrencyTotals;
  positiveWhenActualHigher: boolean;
}) {
  const allCurrencies = Array.from(
    new Set([...Object.keys(ytdPlanned), ...Object.keys(ytdActual)])
  ).sort();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label} <span className="text-zinc-400 dark:text-zinc-600">(to date)</span>
      </p>
      {allCurrencies.length > 0 ? (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {allCurrencies.map((currency) => {
            const planned = ytdPlanned[currency] ?? 0;
            const actual = ytdActual[currency] ?? 0;
            const pct = planned > 0 && actual > 0 ? Math.round((actual / planned) * 100) : null;
            const isActualHigher = actual > planned;

            return (
              <div key={currency} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 py-2 first:pt-0 last:pb-0">
                {/* Currency badge */}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 w-8">
                  {currency}
                </span>

                {/* Expected (plan) + Actual */}
                <div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-600">
                    plan {planned > 0 ? formatCurrency(planned, currency) : "—"}
                  </div>
                  <div className={`text-sm font-bold font-mono ${actual > 0
                    ? positiveWhenActualHigher
                      ? actual >= planned && planned > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-900 dark:text-zinc-50"
                      : actual > planned && planned > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-400 dark:text-zinc-600"
                    }`}>
                    {actual > 0 ? formatCurrency(actual, currency) : "—"}
                  </div>
                </div>

                {/* Percentage with arrow (only when same currency can be compared) */}
                {pct !== null ? (
                  <div className={`text-right text-sm font-semibold ${positiveWhenActualHigher
                    ? isActualHigher
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                    : isActualHigher
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                    {isActualHigher ? "↑" : "↓"} {pct}%
                  </div>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">No data yet.</p>
      )}
    </div>
  );
}

