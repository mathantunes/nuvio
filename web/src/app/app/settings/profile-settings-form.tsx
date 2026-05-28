"use client";

import { useTransition, useState } from "react";
import { updateProfile } from "./settings.actions";
import { CurrencyInput } from "@/components/currency-input";

type Props = {
  currentBaseCurrency: string;
};

export function ProfileSettingsForm({ currentBaseCurrency }: Props) {
  const [baseCurrency, setBaseCurrency] = useState(currentBaseCurrency);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "success", text: "Preferences saved." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
          Primary (base) currency
        </label>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Used for budget summaries and cross-currency reporting. You can still use other currencies on individual accounts and transactions.
        </p>
        <div className="mt-2 w-48">
          <CurrencyInput
            name="baseCurrency"
            value={baseCurrency}
            onChange={setBaseCurrency}
            required
          />
        </div>
      </div>

      {message && (
        <p
          className="text-xs"
          style={{ color: message.kind === "success" ? "var(--color-brand)" : "var(--color-danger)" }}
        >
          {message.text}
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary text-xs">
        {isPending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
