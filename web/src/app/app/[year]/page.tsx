import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import { 
  fetchDashboardData, 
  calculateSavingsData, 
  getYtdTotals,
  type CurrencyTotals 
} from "@/lib/dashboard-computations";
import { formatCurrency } from "./planning/currency-format";

export default async function BudgetDashboardPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const user = await AuthService.getCurrentUser();

  try {
    const data = await fetchDashboardData(year, user.id);
    const ytdTotals = getYtdTotals(data);

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
            ytdPlanned={ytdTotals.income.planned}
            ytdActual={ytdTotals.income.actual}
            positiveWhenActualHigher
          />
          <MultiCurrencyCard
            label="Expenses"
            ytdPlanned={ytdTotals.expenses.planned}
            ytdActual={ytdTotals.expenses.actual}
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
                {data.monthlyData.map((m) => {
                  const isFuture = m.month - 1 > data.currentMonthIdx;
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
                                <span className={`${(m.actualIncome[currency] ?? 0) > (plannedIncome as number)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(m.actualIncome[currency] ?? 0, currency)}</span> / {formatCurrency(plannedIncome as number, currency)}
                              </div>
                            ))}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                        <div className={`grid grid-rows-${currencies.length} items-start`}>
                          {currencies.length > 0 &&
                            (Object.entries(m.plannedExpenses).map(([currency, plannedExpenses]) =>
                              <div key={currency} className={`px-2 text-right ${isFuture ? "opacity-30" : ""}`}>
                                <span className={`${(m.actualExpenses[currency] ?? 0) < (plannedExpenses as number)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(m.actualExpenses[currency] ?? 0, currency)}</span> / {formatCurrency(plannedExpenses as number, currency)}
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 px-2 text-right">
                    <div className={`grid grid-rows-${Object.keys(data.yearIncomePlanned).length} items-start`}>
                      {Object.entries(data.yearIncomePlanned).map(([currency, yearIncomePlanned]) =>
                        <div key={currency} className={`px-2 text-right`}>
                          <span className={`${(data.yearIncomeActual[currency] ?? 0) > (yearIncomePlanned as number)
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(data.yearIncomeActual[currency] ?? 0, currency)}</span> / {formatCurrency(yearIncomePlanned as number, currency)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className={`grid grid-rows-${Object.keys(data.yearExpensesPlanned).length} items-start`}>
                      {Object.entries(data.yearExpensesPlanned).map(([currency, yearExpensesPlanned]) =>
                        <div key={currency} className={`px-2 text-right`}>
                          <span className={`${(data.yearExpensesActual[currency] ?? 0) < (yearExpensesPlanned as number)
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "font-semibold text-red-400 dark:text-red-400"}`}>{formatCurrency(data.yearExpensesActual[currency] ?? 0, currency)}</span> / {formatCurrency(yearExpensesPlanned as number, currency)}
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
            {data.yearTransfers.length > 0 ? (
              <div className="mt-3 space-y-2">
                {/* Individual transfer lines */}
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {data.yearTransfers.map((transfer) => {
                    const totalFees = Number(transfer.feeAmount || 0) + Number(transfer.taxAmount || 0);
                    return (
                      <div key={transfer.id} className="flex items-center gap-2 text-xs">
                        <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatCurrency(Number(transfer.sourceAmount), transfer.sourceCurrencyCode)}
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-600">→</span>
                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
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
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Net Transfer Impact</p>
                  <div className="space-y-1">
                    {Object.entries(data.transferImpacts).map(([currency, impact]) => (
                      <div key={currency} className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">{currency}</span>
                        <span className={`text-xs tabular-nums font-semibold ${
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
            {data.allSavingsLines.length > 0 ? (
              <div className="mt-1 space-y-1">
                {/* Column headers - responsive */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs mb-2">
                  <div className="text-zinc-500 dark:text-zinc-400">Start</div>
                  <div className="text-zinc-500 dark:text-zinc-400">Savings</div>
                  <div className="hidden sm:block text-zinc-500 dark:text-zinc-400">FX</div>
                  <div className="text-zinc-500 dark:text-zinc-400">Final</div>
                </div>
                {/* Currency rows - responsive */}
                {data.allSavingsLines.map(({ currencyCode, amount }) => {
                  const savingsData = calculateSavingsData(
                    currencyCode!,
                    amount,
                    data.yearNetActual,
                    data.transferImpacts
                  );
                  
                  return (
                    <div key={currencyCode} className="space-y-1 sm:space-y-0">
                      {/* Mobile layout - stacked */}
                      <div className="sm:hidden grid grid-cols-2 gap-2 text-xs">
                        <div className="text-zinc-500 dark:text-zinc-400">Start:</div>
                        <div className="tabular-nums text-zinc-900 dark:text-zinc-50 text-right">
                          {formatCurrency(savingsData.startingBalance, currencyCode!)}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400">Income:</div>
                        <div className={`tabular-nums text-right ${savingsData.netIncome > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {savingsData.netIncome > 0 ? "+" : ""}{formatCurrency(savingsData.netIncome, currencyCode!)}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400">FX:</div>
                        <div className={`tabular-nums text-right ${savingsData.transferImpact > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {savingsData.transferImpact > 0 ? "+" : ""}{formatCurrency(savingsData.transferImpact, currencyCode!)}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400">Final:</div>
                        <div className={`tabular-nums font-semibold text-right ${savingsData.finalBalance > savingsData.startingBalance ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(savingsData.finalBalance, currencyCode!)}
                        </div>
                      </div>
                      {/* Desktop layout - horizontal */}
                      <div className="hidden sm:grid grid-cols-4 gap-4 text-xs">
                        <div className="tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatCurrency(savingsData.startingBalance, currencyCode!)}
                        </div>
                        <div className={`tabular-nums ${savingsData.netIncome > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {savingsData.netIncome > 0 ? "+" : ""}{formatCurrency(savingsData.netIncome, currencyCode!)}
                        </div>
                        <div className={`tabular-nums ${savingsData.transferImpact > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {savingsData.transferImpact > 0 ? "+" : ""}{formatCurrency(savingsData.transferImpact, currencyCode!)}
                        </div>
                        <div className={`tabular-nums font-semibold ${savingsData.finalBalance > savingsData.startingBalance ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(savingsData.finalBalance, currencyCode!)}
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
  } catch (error) {
    redirect("/app");
  }
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
                  <div className={`text-sm font-bold tabular-nums ${actual > 0
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

