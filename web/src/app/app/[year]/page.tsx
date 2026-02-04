type Props = {year: string };
;

export default async function BudgetDashboardPage({ params }: { params: Promise<Props> }) {
  const { year: yearString } = await params;
  console.log(yearString);
  const year = Number(yearString);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This is the overview for your {year} budget. Upcoming work here will
        surface key metrics like planned vs actual income, expenses, and
        savings, plus FX transfer summaries.
      </p>
    </div>
  );
}

