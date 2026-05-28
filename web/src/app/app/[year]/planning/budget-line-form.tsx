"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createBudgetLine, updateBudgetLine } from "./budget-lines.actions";
import { CurrencyInput } from "@/components/currency-input";

type Props = {
  budgetId: string;
  year: number;
  categoryKind: "income" | "expense";
  baseCurrency: string;
  categories?: { id: string; name: string; kind: string | null }[];
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
  categories = [],
  editingLine,
  onSuccess,
}: Props) {
  const [categoryName, setCategoryName] = useState(editingLine?.categoryName ?? "");
  const [isMonthly, setIsMonthly] = useState(!editingLine);
  const [month, setMonth] = useState(String(editingLine?.month ?? 1));
  const [plannedAmount, setPlannedAmount] = useState(
    editingLine ? parseFloat(editingLine.plannedAmount).toFixed(2) : "0.00"
  );
  const [currencyCode, setCurrencyCode] = useState(
    editingLine?.currencyCode ?? baseCurrency
  );
  const [notes, setNotes] = useState(editingLine?.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingLine;
  const amountRef = useRef<HTMLInputElement>(null);

  // Autofocus amount when rendered in a portal (autoFocus attr unreliable in portals)
  useEffect(() => {
    if (!isEditing) return;
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isEditing]);

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

      if (!isEditing) {
        setCategoryName("");
        setIsMonthly(true);
        setMonth("1");
        setPlannedAmount("0.00");
        setCurrencyCode(baseCurrency);
        setNotes("");
      }

      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      {isEditing && (
        <>
          <input type="hidden" name="budgetLineId" value={editingLine.id} />
          <input type="hidden" name="month" value={editingLine.month} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {editingLine.categoryName}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {new Date(year, editingLine.month - 1).toLocaleString("en-US", { month: "long" })}
            </p>
          </div>
        </>
      )}

      <div className="space-y-3">
        {!isEditing && (
          <div className="space-y-1">
            <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
              Category
            </label>
            {categories.length > 0 ? (
              <select
                name="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
                className="input"
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                name="categoryName"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                required
                className="input"
                placeholder={categoryKind === "income" ? "Salary, Dividends..." : "Rent, Groceries..."}
              />
            )}
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
              className="h-4 w-4 rounded"
              style={{
                accentColor: "var(--color-brand)",
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            />
            <label
              htmlFor="isMonthly"
              className="text-xs font-medium"
              style={{ color: "var(--color-text)" }}
            >
              Monthly (applies to all 12 months)
            </label>
          </div>
        )}

        {isMonthly && !isEditing && (
          <input type="hidden" name="month" value="1" />
        )}
        {!isMonthly && !isEditing && (
          <div className="space-y-1">
            <label
              className="block text-xs font-medium"
              style={{ color: "var(--color-text)" }}
            >
              Month
            </label>
            <select
              name="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              required
              disabled={isEditing}
              className="input disabled:cursor-not-allowed disabled:opacity-50"
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
            <label
              className="block text-xs font-medium"
              style={{ color: "var(--color-text)" }}
            >
              Amount
            </label>
            <input
              ref={amountRef}
              name="plannedAmount"
              type="number"
              step="0.01"
              min="0"
              value={plannedAmount}
              onChange={(event) => setPlannedAmount(event.target.value)}
              required
              className="input"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label
              className="block text-xs font-medium"
              style={{ color: "var(--color-text)" }}
            >
              Currency
            </label>
            {isEditing ? (
              <>
                <input type="hidden" name="currencyCode" value={currencyCode} />
                <p className="input uppercase tracking-[0.2em] cursor-default select-none opacity-60"
                   style={{ color: "var(--color-text)" }}>
                  {currencyCode}
                </p>
              </>
            ) : (
              <CurrencyInput
                name="currencyCode"
                value={currencyCode}
                onChange={setCurrencyCode}
                required
                className="input uppercase tracking-[0.2em]"
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label
          className="block text-xs font-medium"
          style={{ color: "var(--color-text)" }}
        >
          Notes (optional)
        </label>
        <textarea
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          maxLength={500}
          className="input"
          placeholder="Additional details..."
        />
      </div>

      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary">
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
