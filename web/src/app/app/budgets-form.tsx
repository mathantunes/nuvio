"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createBudget } from "./budgets.actions";
import { CurrencyInput } from "@/components/currency-input";

type Props = {
  currentYear: number;
  /** Only shown on first-time setup — base currency is a user preference, not per year tracker. */
  showCurrencyField?: boolean;
};

export function CreateYearTrackerForm({ currentYear, showCurrencyField }: Props) {
  const router = useRouter();
  const [year, setYear] = useState(String(currentYear));
  const [baseCurrency, setBaseCurrency] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Offer a reasonable window: 5 years back to 3 years forward
  const yearOptions = Array.from({ length: 9 }, (_, i) => currentYear - 5 + i);

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

      const targetYear = (result as { year?: number })?.year ?? currentYear;
      router.push(`/app/${targetYear}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className={showCurrencyField ? "grid grid-cols-2 gap-3" : ""}>
        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
            Year
          </label>
          <select
            name="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="input w-full text-xs"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {showCurrencyField && (
          <div className="space-y-1">
            <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
              Primary currency
            </label>
            <CurrencyInput
              name="baseCurrency"
              value={baseCurrency}
              onChange={setBaseCurrency}
              required
              placeholder="USD"
            />
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary text-xs">
        {isPending ? "Creating…" : "Create year tracker"}
      </button>
    </form>
  );
}
