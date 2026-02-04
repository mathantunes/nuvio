type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetTrackingPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Tracking
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This section will show how your actual {year} income, expenses, savings,
        and FX transfers compare to your plan. We&apos;ll aggregate your
        transactions against the budget lines you define in Planning.
      </p>
    </div>
  );
}

