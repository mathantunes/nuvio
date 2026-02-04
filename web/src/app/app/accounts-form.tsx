"use client";

import { useState, useTransition } from "react";
import { createAccount } from "./accounts.actions";

type Props = {
  defaultCurrencyCode?: string;
};

export function AccountsForm({ defaultCurrencyCode }: Props) {
  const [name, setName] = useState("");
  const [currencyCode, setCurrencyCode] = useState(defaultCurrencyCode ?? "");
  const [institution, setInstitution] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createAccount(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      // Reset form on success.
      setName("");
      setInstitution("");
      if (!defaultCurrencyCode) {
        setCurrencyCode("");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
          Account name
        </label>
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          placeholder="Checking, Brokerage, Pension…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs uppercase tracking-widest text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            placeholder="USD"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
            Institution (optional)
          </label>
          <input
            name="institution"
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            placeholder="Revolut, Wise, Local bank…"
          />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Creating…" : "Add account"}
      </button>
    </form>
  );
}

