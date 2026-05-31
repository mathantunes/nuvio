import { AuthService } from "@/lib/auth-service";
import {
  fetchVarianceData,
  getMonthlyVariance,
  getSavingsTimeline,
  getCategoryTrends,
  getDisciplineScores,
} from "@/lib/variance-computations";
import { VarianceTabs } from "./variance-tabs";
import { Card } from "@/components/ui";

export default async function VariancePage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const user = await AuthService.getCurrentUser();

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
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Budget vs Actual
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {year} — spending, savings and trends
        </p>
      </header>

      <Card>
        <VarianceTabs
          allMonthlyVariance={allMonthlyVariance}
          currentMonthIdx={currentMonthIdx}
          monthNames={monthNames}
          savingsTimeline={savingsTimeline}
          categoryTrends={categoryTrends}
          disciplineScores={disciplineScores}
        />
      </Card>
    </div>
  );
}
