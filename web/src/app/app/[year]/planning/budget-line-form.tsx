"use client";

import { useState, useTransition } from "react";
import { createBudgetLine, updateBudgetLine } from "./budget-lines.actions";

type Props = {
  budgetId: string;
  year: number;
  categoryKind: "income" | "expense";
  baseCurrency: string;
  editingLine?: {
    id: string;
    categoryName: string;
    month: number;
    plannedAmount: string;
    currencyCode: string;
    notes?: string | null;
  };
  onSuccess?: () => void;
};

export function BudgetLineForm({
  budgetId,
  year,
  categoryKind,
  baseCurrency,
  editingLine,
  onSuccess,
}: Props) {
  const [categoryName, setCategoryName] = useState(editingLine?.categoryName ?? "");
  const [isMonthly, setIsMonthly] = useState(!editingLine);
  const [month, setMonth] = useState(String(editingLine?.month ?? 1));
  const [plannedAmount, setPlannedAmount] = useState(
    editingLine?.plannedAmount ?? "0"
  );
  const [currencyCode, setCurrencyCode] = useState(
    editingLine?.currencyCode ?? baseCurrency
  );
  const [notes, setNotes] = useState(editingLine?.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingLine;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("budgetId", budgetId);
    formData.set("year", String(year));
    formData.set("categoryKind", categoryKind);
    formData.set("isMonthly", String(isMonthly));
    formData.set("currencyCode", currencyCode);

    startTransition(async () => {
      const result = isEditing
        ? await updateBudgetLine(formData)
        : await createBudgetLine(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      // Reset form on success
      if (!isEditing) {
        setCategoryName("");
        setIsMonthly(true);
        setMonth("1");
        setPlannedAmount("0");
        setCurrencyCode(baseCurrency);
        setNotes("");
      }

      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {isEditing && (
        <input type="hidden" name="budgetLineId" value={editingLine.id} />
      )}

      <div className="space-y-3">
        {!isEditing && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
              Category
            </label>
            <input
              name="categoryName"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              required
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              placeholder={categoryKind === "income" ? "Salary, Dividends..." : "Rent, Groceries..."}
            />
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isMonthly"
              name="isMonthly"
              checked={isMonthly}
              onChange={(event) => setIsMonthly(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <label
              htmlFor="isMonthly"
              className="text-xs font-medium text-zinc-900 dark:text-zinc-50"
            >
              Monthly (applies to all 12 months)
            </label>
          </div>
        )}

        {isMonthly && !isEditing && (
          <input type="hidden" name="month" value="1" />
        )}
        {(!isMonthly || isEditing) && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
              Month
            </label>
            <select
              name="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              required
              disabled={isEditing}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(year, m - 1).toLocaleString("en-US", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
              Amount
            </label>
            <input
              name="plannedAmount"
              type="number"
              step="0.01"
              min="0"
              value={plannedAmount}
              onChange={(event) => setPlannedAmount(event.target.value)}
              required
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
              Currency
            </label>
            <input
              name="currencyCode"
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
              required
              maxLength={3}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
              placeholder="USD"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Notes (optional)
        </label>
        <textarea
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          maxLength={500}
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          placeholder="Additional details..."
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
        {isPending
          ? isEditing
            ? "Updating…"
            : "Creating…"
          : isEditing
            ? "Update"
            : "Add"}
      </button>
    </form>
  );
}
