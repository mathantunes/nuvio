"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "./settings.actions";
import { CurrencyInput } from "@/components/currency-input";

type Props = {
  currentBaseCurrency: string;
};

export function ProfileSettingsForm({ currentBaseCurrency }: Props) {
  const [baseCurrency, setBaseCurrency] = useState(currentBaseCurrency);
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="space-y-4">
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

      {state?.error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs" style={{ color: "var(--color-brand)" }}>
          Preferences saved.
        </p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary text-xs">
        {isPending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
