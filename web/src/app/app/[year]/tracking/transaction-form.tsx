"use client";

import { useState, useTransition } from "react";
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
  expectedAmount: string;
  expectedCurrency: string;
  accounts: Account[];
  transaction?: Transaction | null;
  onSuccess?: () => void;
};

export function TransactionForm({
  budgetLineId,
  year,
  expectedAmount,
  expectedCurrency,
  accounts,
  transaction,
  onSuccess,
}: Props) {
  const isEditMode = !!transaction;
  
  const [accountId, setAccountId] = useState(
    transaction?.account.id ?? accounts[0]?.id ?? ""
  );
  const [amount, setAmount] = useState(
    transaction?.amount ?? ""
  );
  const [occurredAt, setOccurredAt] = useState(
    transaction?.occurredAt 
      ? new Date(transaction.occurredAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(
    transaction?.description ?? ""
  );
  const [sameAsPlanned, setSameAsPlanned] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        setOccurredAt(new Date().toISOString().split("T")[0]);
      }

      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {isEditMode ? "Edit Transaction" : "Add Transaction"}
        </h3>
        {isEditMode && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono break-all">
            ID: {transaction.id}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Account
          </label>
          <select
            name="accountId"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currencyCode})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Date
          </label>
          <input
            name="occurredAt"
            type="date"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Amount
          </label>
          {sameAsPlanned ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {formatAmount(parseFloat(expectedAmount), expectedCurrency)}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                {selectedAccount?.currencyCode ?? expectedCurrency}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="block flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
                placeholder="0.00"
              />
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                {selectedAccount?.currencyCode ?? "USD"}
              </span>
            </div>
          )}
          <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={sameAsPlanned}
              onChange={(e) => {
                setSameAsPlanned(e.target.checked);
                if (e.target.checked) setAmount(expectedAmount);
              }}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-50"
            />
            Same as planned
          </label>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Expected
          </label>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {formatAmount(parseFloat(expectedAmount), expectedCurrency)}
            </span>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase">
              {expectedCurrency}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Description (optional)
        </label>
        <input
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          placeholder="Transaction details..."
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
        {isPending ? (isEditMode ? "Updating…" : "Creating…") : (isEditMode ? "Update transaction" : "Add transaction")}
      </button>
    </form>
  );
}
