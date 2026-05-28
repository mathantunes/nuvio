"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createTransaction, updateTransaction } from "./transactions.actions";
import { formatAmount } from "../planning/currency-format";

type Account = {
  id: string;
  name: string;
  currencyCode: string;
};

type Transaction = {
  id: string;
  budgetLineId: string | null;
  amount: string;
  currencyCode: string;
  occurredAt: Date | string;
  description: string | null;
  account: {
    id: string;
    name: string;
  };
};

type Props = {
  budgetLineId: string;
  year: number;
  month: number;
  expectedAmount: string;
  expectedCurrency: string;
  accounts: Account[];
  transaction?: Transaction | null;
  categoryName?: string;
  onSuccess?: () => void;
};

export function TransactionForm({
  budgetLineId,
  year,
  month,
  expectedAmount,
  expectedCurrency,
  accounts,
  transaction,
  categoryName,
  onSuccess,
}: Props) {
  const isEditMode = !!transaction;

  // Default date: today if we're in the budget line's month, otherwise the 1st of that month.
  function defaultDateForMonth() {
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
    if (isCurrentMonth) return now.toISOString().split("T")[0];
    return new Date(year, month - 1, 1).toISOString().split("T")[0];
  }
  
  const [accountId, setAccountId] = useState(
    transaction?.account.id ?? accounts[0]?.id ?? ""
  );
  const [amount, setAmount] = useState(
    transaction?.amount ?? ""
  );
  const [occurredAt, setOccurredAt] = useState(
    transaction?.occurredAt
      ? new Date(transaction.occurredAt).toISOString().split("T")[0]
      : defaultDateForMonth()
  );
  const [description, setDescription] = useState(
    transaction?.description ?? ""
  );
  const [sameAsPlanned, setSameAsPlanned] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("budgetLineId", budgetLineId);
    formData.set("year", String(year));
    
    if (isEditMode) {
      formData.set("transactionId", transaction.id);
    }
    
    if (sameAsPlanned) {
      formData.set("amount", expectedAmount);
    }
    if (selectedAccount) {
      formData.set("currencyCode", selectedAccount.currencyCode);
    }

    startTransition(async () => {
      const result = isEditMode 
        ? await updateTransaction(formData)
        : await createTransaction(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      // Reset form on success (only for create mode)
      if (!isEditMode) {
        setAmount("");
        setDescription("");
        setSameAsPlanned(false);
        setOccurredAt(defaultDateForMonth());
      }

      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            {isEditMode ? "Edit Transaction" : "Add Transaction"}
          </h3>
          {categoryName && (
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{categoryName}</p>
          )}
        </div>
        {isEditMode && (
          <span
            className="text-xs tabular-nums break-all"
            style={{ color: "var(--color-text-subtle)" }}
          >
            ID: {transaction.id}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            className="block text-xs font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Account
          </label>
          <select
            name="accountId"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
            className="input text-xs"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currencyCode})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            className="block text-xs font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Date
          </label>
          <input
            name="occurredAt"
            type="date"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
            className="input text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            className="block text-xs font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Amount
          </label>
          {sameAsPlanned ? (
            <div className="flex items-center gap-2">
              <span
                className="flex-1 rounded-lg px-3 py-2 text-xs tabular-nums"
                style={{
                  backgroundColor: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
              >
                {formatAmount(parseFloat(expectedAmount), expectedCurrency)}
              </span>
              <span
                className="text-xs tabular-nums uppercase"
                style={{ color: "var(--color-text-subtle)" }}
              >
                {selectedAccount?.currencyCode ?? expectedCurrency}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={amountRef}
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="input flex-1 text-xs"
                placeholder="0.00"
              />
              <span
                className="text-xs tabular-nums uppercase"
                style={{ color: "var(--color-text-subtle)" }}
              >
                {selectedAccount?.currencyCode ?? "USD"}
              </span>
            </div>
          )}
          <label
            className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            <input
              type="checkbox"
              checked={sameAsPlanned}
              onChange={(e) => {
                setSameAsPlanned(e.target.checked);
                if (e.target.checked) setAmount(expectedAmount);
              }}
              className="rounded"
              style={{ accentColor: "var(--color-brand)" }}
            />
            Same as planned
          </label>
        </div>

        <div className="space-y-1">
          <label
            className="block text-xs font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Expected
          </label>
          <div className="flex items-center gap-2">
            <span
              className="flex-1 rounded-lg px-3 py-2 text-xs tabular-nums"
              style={{
                backgroundColor: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
              }}
            >
              {formatAmount(parseFloat(expectedAmount), expectedCurrency)}
            </span>
            <span
              className="text-xs tabular-nums uppercase"
              style={{ color: "var(--color-text-subtle)" }}
            >
              {expectedCurrency}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label
          className="block text-xs font-medium"
          style={{ color: "var(--color-text)" }}
        >
          Description (optional)
        </label>
        <input
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          className="input text-xs"
          placeholder="Transaction details..."
        />
      </div>

      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? (isEditMode ? "Updating…" : "Creating…") : (isEditMode ? "Update transaction" : "Add transaction")}
      </button>
    </form>
  );
}
