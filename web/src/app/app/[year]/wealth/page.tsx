import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import { fetchDashboardData } from "@/lib/dashboard-computations";
import { calculateGrowthAnalytics } from "@/lib/growth-computations";
import { fetchPortfolioData } from "@/lib/portfolio-computations";
import { fetchLoanData } from "@/lib/loan-computations";
import { GrowthTab } from "../analytics/growth-tab";

export default async function WealthPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const user = await AuthService.getCurrentUser();

  try {
    const [dashboardData, portfolioData, loanData] = await Promise.all([
      fetchDashboardData(year, user.id),
      fetchPortfolioData(user.id, year),
      fetchLoanData(user.id, year),
    ]);

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
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            Wealth
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {year} — net worth, cash flow, portfolio and asset breakdown
          </p>
        </header>

        <GrowthTab
          growthAnalytics={growthAnalytics}
          currentMonthIdx={dashboardData.currentMonthIdx}
        />
      </div>
    );
  } catch {
    redirect("/app");
  }
}
