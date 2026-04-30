"use client";

import { useState, useTransition, useEffect } from "react";
import { createTransfer, getUserAccounts } from "./transfers.actions";

type Account = {
  id: string;
  name: string;
  currencyCode: string;
  institution?: string | null;
  isActive: boolean;
};

export function FxTransferForm() {
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [sourceAmount, setSourceAmount] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [fxRate, setFxRate] = useState("");
  const [feeAmount, setFeeAmount] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate effective FX rate when amounts change
  const calculateEffectiveRate = () => {
    const source = parseFloat(sourceAmount) || 0;
    const target = parseFloat(targetAmount) || 0;
    const fee = parseFloat(feeAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    
    if (source > 0 && target > 0) {
      const effective = target / (source - fee - tax);
      return effective.toFixed(8);
    }
    return "";
  };

  const effectiveRate = calculateEffectiveRate();

  // Auto-calculate target amount when FX rate changes
  const handleFxRateChange = (rate: string) => {
    setFxRate(rate);
    const source = parseFloat(sourceAmount) || 0;
    const fee = parseFloat(feeAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const rateValue = parseFloat(rate) || 0;
    
    if (source > 0 && rateValue > 0) {
      const target = (source - fee - tax) * rateValue;
      setTargetAmount(target.toFixed(4));
    }
  };

  // Auto-calculate FX rate when target amount changes
  const handleTargetAmountChange = (amount: string) => {
    setTargetAmount(amount);
    const source = parseFloat(sourceAmount) || 0;
    const fee = parseFloat(feeAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const target = parseFloat(amount) || 0;
    
    if (source > 0 && target > 0) {
      const rate = target / (source - fee - tax);
      setFxRate(rate.toFixed(8));
    }
  };

  useEffect(() => {
    const loadAccounts = async () => {
      const result = await getUserAccounts();
      if (result.success && result.data) {
        setAccounts(result.data.filter(acc => acc.isActive));
      }
      setLoading(false);
    };
    loadAccounts();
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("occurredAt", new Date(occurredAt).toISOString());

    startTransition(async () => {
      const result = await createTransfer(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      // Reset form on success
      setSourceAccountId("");
      setSourceAmount("");
      setTargetAccountId("");
      setTargetAmount("");
      setFxRate("");
      setFeeAmount("0");
      setTaxAmount("0");
      setNote("");
      setOccurredAt(new Date().toISOString().slice(0, 16));
    });
  };

  if (loading) {
    return <div className="text-xs text-zinc-500 dark:text-zinc-400">Loading accounts...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        No accounts available. Please create an account first.
      </div>
    );
  }

  const sourceAccount = accounts.find(acc => acc.id === sourceAccountId);
  const targetAccount = accounts.find(acc => acc.id === targetAccountId);
  const isSameCurrency = sourceAccount?.currencyCode === targetAccount?.currencyCode;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Source Account */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          From Account
        </label>
        <select
          name="sourceAccountId"
          value={sourceAccountId}
          onChange={(e) => setSourceAccountId(e.target.value)}
          required
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        >
          <option value="">Select source account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currencyCode})
            </option>
          ))}
        </select>
        <input
          type="hidden"
          name="sourceCurrencyCode"
          value={sourceAccount?.currencyCode || ""}
        />
      </div>

      {/* Source Amount */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Amount to Send
        </label>
        <input
          name="sourceAmount"
          type="number"
          step="0.0001"
          min="0.0001"
          value={sourceAmount}
          onChange={(e) => setSourceAmount(e.target.value)}
          required
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          placeholder="0.00"
        />
      </div>

      {/* Target Account */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          To Account
        </label>
        <select
          name="targetAccountId"
          value={targetAccountId}
          onChange={(e) => setTargetAccountId(e.target.value)}
          required
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        >
          <option value="">Select target account</option>
          {accounts.filter(acc => acc.id !== sourceAccountId).map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currencyCode})
            </option>
          ))}
        </select>
        <input
          type="hidden"
          name="targetCurrencyCode"
          value={targetAccount?.currencyCode || ""}
        />
      </div>

      {/* FX Rate (only for different currencies) */}
      {!isSameCurrency && sourceAccountId && targetAccountId && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            FX Rate (1 {sourceAccount?.currencyCode} = ? {targetAccount?.currencyCode})
          </label>
          <input
            name="fxRate"
            type="number"
            step="0.00000001"
            min="0.00000001"
            value={fxRate}
            onChange={(e) => handleFxRateChange(e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            placeholder="Auto-calculated"
          />
        </div>
      )}

      {/* Target Amount */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Amount to Receive {targetAccount && `(${targetAccount.currencyCode})`}
        </label>
        <input
          name="targetAmount"
          type="number"
          step="0.0001"
          min="0.0001"
          value={targetAmount}
          onChange={(e) => handleTargetAmountChange(e.target.value)}
          required
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          placeholder="0.00"
        />
      </div>

      {/* Fees and Taxes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Fee Amount ({sourceAccount?.currencyCode})
          </label>
          <input
            name="feeAmount"
            type="number"
            step="0.0001"
            min="0"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Tax Amount ({sourceAccount?.currencyCode})
          </label>
          <input
            name="taxAmount"
            type="number"
            step="0.0001"
            min="0"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Effective Rate Display */}
      {effectiveRate && !isSameCurrency && (
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Effective Rate: 1 {sourceAccount?.currencyCode} = {effectiveRate} {targetAccount?.currencyCode}
          </p>
        </div>
      )}

      {/* Note */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Note (optional)
        </label>
        <input
          name="note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          placeholder="Transfer via Wise, Revolut, etc."
        />
      </div>

      {/* Date */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Date
        </label>
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          required
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
        />
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !sourceAccountId || !targetAccountId}
        className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Creating Transfer…" : "Create Transfer"}
      </button>
    </form>
  );
}
