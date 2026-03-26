import { redirect } from "next/navigation";
import React from "react";
import { AuthService } from "@/lib/auth-service";
import { 
  fetchDashboardData, 
  calculateSavingsData, 
  getYtdTotals,
  getYearlyTotals,
  type CurrencyTotals 
} from "@/lib/dashboard-computations";
import { formatCurrency } from "../planning/currency-format";

export default async function AnalyticsPage({
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
    const yearlyTotals = getYearlyTotals(data);

    // Simple monthly deviations - calculate directly from dashboard data
    const monthlyDeviations = data.monthlyData
      .filter(month => month.month <= data.currentMonthIdx + 1) // Only YTD
      .flatMap(month => {
        const currencies = [...new Set([
          ...Object.keys(month.plannedExpenses),
          ...Object.keys(month.actualExpenses),
          ...Object.keys(month.plannedIncome),
          ...Object.keys(month.actualIncome)
        ])];

        return currencies.map(currency => {
          const plannedIncome = Number(month.plannedIncome[currency] || 0);
          const actualIncome = Number(month.actualIncome[currency] || 0);
          const plannedExpenses = Number(month.plannedExpenses[currency] || 0);
          const actualExpenses = Number(month.actualExpenses[currency] || 0);
          
          const plannedNet = plannedIncome - plannedExpenses;
          const actualNet = actualIncome - actualExpenses;
          const deviation = actualNet - plannedNet;
          const deviationPercent = plannedNet !== 0 ? (deviation / Math.abs(plannedNet)) * 100 : 0;

          return {
            month: month.month,
            monthName: month.name,
            currency,
            plannedIncome,
            actualIncome,
            plannedExpenses,
            actualExpenses,
            plannedNet,
            actualNet,
            deviation,
            deviationPercent
          };
        });
      });

    // Group deviations by month for table display
    const deviationsByMonth = monthlyDeviations.reduce((acc, deviation) => {
      if (!acc[deviation.month]) {
        acc[deviation.month] = {
          monthName: deviation.monthName,
          currencies: []
        };
      }
      acc[deviation.month].currencies.push(deviation);
      return acc;
    }, {} as Record<number, { monthName: string; currencies: typeof monthlyDeviations }>);

    // Find months with biggest deviations
    const biggestPositiveDeviation = monthlyDeviations.reduce((max, curr) => 
      curr.deviation > max.deviation ? curr : max, monthlyDeviations[0] || { deviation: 0 });
    const biggestNegativeDeviation = monthlyDeviations.reduce((min, curr) => 
      curr.deviation < min.deviation ? curr : min, monthlyDeviations[0] || { deviation: 0 });

    // Calculate savings health per currency
    const savingsHealthByCurrency: Array<{
      currency: string;
      plannedSavings: number;
      actualSavings: number;
      savingsRate: number;
      onTrack: boolean;
    }> = [];

    for (const currency of Object.keys(ytdTotals.income.planned)) {
      const plannedIncome = ytdTotals.income.planned[currency] || 0;
      const actualIncome = ytdTotals.income.actual[currency] || 0;
      const plannedExpenses = ytdTotals.expenses.planned[currency] || 0;
      const actualExpenses = ytdTotals.expenses.actual[currency] || 0;

      const plannedSavings = plannedIncome - plannedExpenses;
      const actualSavings = actualIncome - actualExpenses;
      const savingsRate = plannedSavings > 0 
        ? (actualSavings / plannedSavings) * 100 
        : 0;

      savingsHealthByCurrency.push({
        currency,
        plannedSavings,
        actualSavings,
        savingsRate,
        onTrack: savingsRate >= 95
      });
    }

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{year} plan deviation and savings trajectory analysis</p>
        </header>

        {/* Savings Health Overview */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Savings Health</h2>
          <div className="space-y-4">
            {savingsHealthByCurrency.map((health) => (
              <div key={health.currency} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{health.currency}</h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                    health.onTrack 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {health.onTrack ? '✓ On Track' : '⚠ Off Track'}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">YTD Planned Savings</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(health.plannedSavings, health.currency)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">YTD Actual Savings</p>
                    <p className={`text-lg font-bold ${health.actualSavings >= health.plannedSavings 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(health.actualSavings, health.currency)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Savings Rate</p>
                    <p className={`text-lg font-bold ${health.savingsRate >= 95 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-red-600 dark:text-red-400'}`}>
                      {health.savingsRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Monthly</p>
                    <p className="text-lg font-bold text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(health.actualSavings / (data.currentMonthIdx + 1), health.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Key Insights</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {biggestPositiveDeviation && biggestPositiveDeviation.deviation > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-900/20 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400">📈</span>
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Best Month</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {biggestPositiveDeviation.monthName}: {formatCurrency(biggestPositiveDeviation.deviation, biggestPositiveDeviation.currency)} over target
                </p>
              </div>
            )}
            {biggestNegativeDeviation && biggestNegativeDeviation.deviation < 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-600 dark:text-red-400">📉</span>
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">Challenging Month</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {biggestNegativeDeviation.monthName}: {formatCurrency(Math.abs(biggestNegativeDeviation.deviation), biggestNegativeDeviation.currency)} under target
                </p>
              </div>
            )}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-600 dark:text-blue-400">📊</span>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Monthly Average</span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {savingsHealthByCurrency.length > 0 
                  ? formatCurrency(savingsHealthByCurrency[0].actualSavings / (data.currentMonthIdx + 1), savingsHealthByCurrency[0].currency)
                  : formatCurrency(0, 'USD')
                } per month
              </p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg dark:bg-purple-900/20 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-600 dark:text-purple-400">🎯</span>
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Year Progress</span>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                {Math.round(((data.currentMonthIdx + 1) / 12) * 100)}% complete
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Deviations */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Monthly Plan Deviations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Month</th>
                  <th className="py-2 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Currency</th>
                  <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Planned Net</th>
                  <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Actual Net</th>
                  <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Deviation</th>
                  <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">% Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {Object.entries(deviationsByMonth).map(([monthNum, monthData]) => {
                  const monthKey = `month-${monthNum}`;
                  return (
                    <React.Fragment key={monthKey}>
                      <tr className="bg-zinc-50 dark:bg-zinc-900 font-medium">
                        <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-50">
                          {monthData.monthName}
                        </td>
                        <td className="py-2 px-2 text-zinc-500 dark:text-zinc-400" colSpan={5}>
                          {monthData.currencies.length} {monthData.currencies.length === 1 ? 'currency' : 'currencies'}
                        </td>
                      </tr>
                      {monthData.currencies.map((currency) => (
                        <tr key={`${monthNum}-${currency.currency}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                          <td className="py-2 pr-3 text-zinc-400 dark:text-zinc-600">
                            
                          </td>
                          <td className="py-2 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                            {currency.currency}
                          </td>
                          <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                            {formatCurrency(currency.plannedNet, currency.currency)}
                          </td>
                          <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                            {formatCurrency(currency.actualNet, currency.currency)}
                          </td>
                          <td className={`py-2 px-2 text-right font-medium ${
                            currency.deviation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {currency.deviation >= 0 ? '+' : ''}{formatCurrency(currency.deviation, currency.currency)}
                          </td>
                          <td className={`py-2 px-2 text-right font-medium ${
                            currency.deviationPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {currency.deviationPercent >= 0 ? '+' : ''}{currency.deviationPercent.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    redirect("/app");
  }
}
