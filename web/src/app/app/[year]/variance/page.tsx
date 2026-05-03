import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import {
  fetchVarianceData,
  getMonthlyVariance,
  getSavingsTimeline,
  getCategoryTrends,
  getDisciplineScores,
} from "@/lib/variance-computations";
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
    const { rows, currentMonthIdx } = await fetchVarianceData(year, user.id);

    const monthNames = Array.from({ length: 12 }, (_, i) =>
      new Date(year, i).toLocaleString("en-US", { month: "long" })
    );

    const allMonthlyVariance = Array.from({ length: 12 }, (_, i) =>
      getMonthlyVariance(rows, i + 1)
    );

    const savingsTimeline = getSavingsTimeline(rows, currentMonthIdx);
    const categoryTrends = getCategoryTrends(rows, currentMonthIdx);
    const disciplineScores = getDisciplineScores(rows, currentMonthIdx);

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Budget vs Actual
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {year} — spending, savings and trends
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
        />
      </div>
    );
  } catch {
    redirect("/app");
  }
}
