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
        <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
          Account name
        </label>
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="input text-xs"
          placeholder="Checking, Brokerage, Pension…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
            Currency
          </label>
          <input
            name="currencyCode"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
            required
            maxLength={3}
            className="input text-xs uppercase tracking-widest"
            placeholder="USD"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
            Institution (optional)
          </label>
          <input
            name="institution"
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            className="input text-xs"
            placeholder="Revolut, Wise, Local bank…"
          />
        </div>
      </div>

      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary text-xs">
        {isPending ? "Creating…" : "Add account"}
      </button>
    </form>
  );
}
