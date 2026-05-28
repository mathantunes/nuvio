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
        <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
          Year
        </label>
        <input
          name="year"
          type="number"
          min={1900}
          max={3000}
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="input w-32 text-xs"
        />
      </div>

      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary text-xs">
        {isPending ? "Creating…" : "Create budget"}
      </button>
    </form>
  );
}
