"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createBudget } from "./budgets.actions";

type Props = {
  suggestedYear: number;
};

export function BudgetsForm({ suggestedYear }: Props) {
  const router = useRouter();
  const [year, setYear] = useState(String(suggestedYear));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createBudget(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      const targetYear = (result as { year?: number })?.year ?? suggestedYear;
      router.push(`/app/${targetYear}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Year
        </label>
        <input
          name="year"
          type="number"
          min={1900}
          max={3000}
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="block w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Creating…" : "Create budget"}
      </button>
    </form>
  );
}

