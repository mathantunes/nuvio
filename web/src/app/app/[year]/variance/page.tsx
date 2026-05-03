import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import {
  fetchVarianceData,
  getMonthlyVariance,
  getSavingsTimeline,
  getCategoryTrends,
  getDisciplineScores,
} from "@/lib/variance-computations";
import { fetchDashboardData } from "@/lib/dashboard-computations";
import { calculateGrowthAnalytics } from "@/lib/growth-computations";
import { fetchPortfolioData } from "@/lib/portfolio-computations";
import { fetchLoanData } from "@/lib/loan-computations";
import { VarianceTabs } from "./variance-tabs";

export default async function VariancePage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const user = await AuthService.getCurrentUser();

  try {
    const [{ rows, currentMonthIdx }, dashboardData, portfolioData, loanData] = await Promise.all([
      fetchVarianceData(year, user.id),
      fetchDashboardData(year, user.id),
      fetchPortfolioData(user.id, year),
      fetchLoanData(user.id, year),
    ]);

    const monthNames = Array.from({ length: 12 }, (_, i) =>
      new Date(year, i).toLocaleString("en-US", { month: "long" })
    );

    const allMonthlyVariance = Array.from({ length: 12 }, (_, i) =>
      getMonthlyVariance(rows, i + 1)
    );

    const savingsTimeline = getSavingsTimeline(rows, currentMonthIdx);
    const categoryTrends = getCategoryTrends(rows, currentMonthIdx);
    const disciplineScores = getDisciplineScores(rows, currentMonthIdx);

    const growthAnalytics = calculateGrowthAnalytics(
      dashboardData.allSavingsLines,
      dashboardData.yearNetActual,
      dashboardData.transferImpacts,
      dashboardData.totalFees,
      dashboardData.yearTransfers,
      dashboardData.monthlyData,
      portfolioData.yearStartValueByCurrency,
      portfolioData.totalValueByCurrency,
      portfolioData.totalReturnByCurrency,
      portfolioData.netDepositsYTDByCurrency,
      dashboardData.instrumentTransferImpacts,
      dashboardData.loanTransferImpacts,
      dashboardData.yearInstrumentTransfers,
      dashboardData.yearLoanTransfers,
      loanData.outstandingBalanceByCurrency,
      loanData.assetValueByCurrency,
      loanData.yearStartOutstandingByCurrency,
      loanData.yearStartAssetValueByCurrency,
    );

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Budget vs Actual
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {year} — spending, savings, trends and net worth in one view
          </p>
        </header>

        <VarianceTabs
          allMonthlyVariance={allMonthlyVariance}
          currentMonthIdx={currentMonthIdx}
          monthNames={monthNames}
          year={year}
          savingsTimeline={savingsTimeline}
          categoryTrends={categoryTrends}
          disciplineScores={disciplineScores}
          growthAnalytics={growthAnalytics}
        />
      </div>
    );
  } catch {
    redirect("/app");
  }
}
