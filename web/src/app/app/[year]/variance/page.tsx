import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import {
  fetchVarianceData,
  getMonthlyVariance,
  getYtdVariance,
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

    // Pre-compute all months so the client doesn't need server round-trips
    // when switching the month selector.
    const monthNames = Array.from({ length: 12 }, (_, i) =>
      new Date(year, i).toLocaleString("en-US", { month: "long" })
    );

    const allMonthlyVariance = Array.from({ length: 12 }, (_, i) =>
      getMonthlyVariance(rows, i + 1)
    );

    const ytdVariance = getYtdVariance(rows, currentMonthIdx);

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Budget vs Actual
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {year} — planned vs actual spending and income by category
          </p>
        </header>

        <VarianceTabs
          allMonthlyVariance={allMonthlyVariance}
          ytdVariance={ytdVariance}
          currentMonthIdx={currentMonthIdx}
          monthNames={monthNames}
          year={year}
        />
      </div>
    );
  } catch {
    redirect("/app");
  }
}
