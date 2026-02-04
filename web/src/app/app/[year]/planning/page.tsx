type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetPlanningPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Planning
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Here you&apos;ll define your {year} budget: income, fixed and variable
        expenses, and savings lines per month. We&apos;ll later connect this to
        your transactions for planned vs actual views.
      </p>
    </div>
  );
}

