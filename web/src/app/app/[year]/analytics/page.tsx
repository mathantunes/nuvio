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
import { AnalyticsTabs } from "./analytics-tabs";
import { SavingsTab } from "./savings-tab";
import { GrowthTab } from "./growth-tab";

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

        <AnalyticsTabs
          savingsTab={
            <SavingsTab
              savingsHealthByCurrency={savingsHealthByCurrency}
              biggestPositiveDeviation={biggestPositiveDeviation}
              biggestNegativeDeviation={biggestNegativeDeviation}
              deviationsByMonth={deviationsByMonth}
              currentMonthIdx={data.currentMonthIdx}
            />
          }
          growthTab={<GrowthTab />}
        />
      </div>
    );
  } catch (error) {
    redirect("/app");
  }
}
