"use client";

import { useState, useTransition } from "react";
import { deleteTransfer } from "./transfers.actions";
import { formatCurrency } from "../planning/currency-format";

type Transfer = {
  id: string;
  sourceAccountId: string;
  sourceAmount: string;
  sourceCurrencyCode: string;
  sourceAccountName: string | null;
  targetAccountId: string;
  targetAmount: string;
  targetCurrencyCode: string;
  targetAccountName: string | null;
  fxRate: string | null;
  feeAmount: string | null;
  taxAmount: string | null;
  effectiveFxRate: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
};

type Props = {
  transfers: Transfer[];
  onUpdate?: () => void;
};

export function FxTransferList({ transfers, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (transferId: string) => {
    setError(null);
    
    startTransition(async () => {
      const result = await deleteTransfer(transferId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      
      if (onUpdate) {
        onUpdate();
      }
    });
  };

  if (transfers.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
        No transfers yet. Create your first transfer on the left.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      {error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>{error}</p>
      )}
      
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {transfers.map((transfer) => {
          const isSameCurrency = transfer.sourceCurrencyCode === transfer.targetCurrencyCode;
          const totalCosts = parseFloat(transfer.feeAmount ?? "0") + parseFloat(transfer.taxAmount ?? "0");
          const netSourceAmount = parseFloat(transfer.sourceAmount) - totalCosts;
          
          return (
            <div
              key={transfer.id}
              className="rounded-xl border p-3"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  {/* Accounts */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>
                      {transfer.sourceAccountName}
                    </span>
                    <span style={{ color: "var(--color-text-subtle)" }}>→</span>
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>
                      {transfer.targetAccountName}
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="tabular-nums" style={{ color: "var(--color-text)" }}>
                        {formatCurrency(parseFloat(transfer.sourceAmount), transfer.sourceCurrencyCode)}
                      </span>
                      {totalCosts > 0 && (
                        <span className="ml-1" style={{ color: "var(--color-text-subtle)" }}>
                          +{formatCurrency(totalCosts, transfer.sourceCurrencyCode)} fees
                        </span>
                      )}
                    </div>
                    <span style={{ color: "var(--color-text-subtle)" }}>→</span>
                    <div>
                      <span className="tabular-nums" style={{ color: "var(--color-text)" }}>
                        {formatCurrency(parseFloat(transfer.targetAmount), transfer.targetCurrencyCode)}
                      </span>
                    </div>
                  </div>

                  {/* FX Rate Info */}
                  {!isSameCurrency && transfer.effectiveFxRate && (
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Effective: 1 {transfer.sourceCurrencyCode} = {parseFloat(transfer.effectiveFxRate).toFixed(6)} {transfer.targetCurrencyCode}
                      {transfer.fxRate && (
                        <span className="ml-2">
                          (Market: {parseFloat(transfer.fxRate).toFixed(6)})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Note */}
                  {transfer.note && (
                    <div className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                      {transfer.note}
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                    {new Date(transfer.occurredAt).toLocaleDateString()} at{" "}
                    {new Date(transfer.occurredAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(transfer.id)}
                  disabled={isPending}
                  className="shrink-0 rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ color: "var(--color-text-subtle)" }}
                  title="Delete transfer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Cost Impact Indicator */}
              {!isSameCurrency && transfer.fxRate && transfer.effectiveFxRate && (
                <div
                  className="mt-2 border-t pt-2"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: "var(--color-text-muted)" }}>Cost impact:</span>
                    <span
                      className="font-medium"
                      style={{
                        color:
                          parseFloat(transfer.effectiveFxRate) < parseFloat(transfer.fxRate)
                            ? "var(--color-danger)"
                            : "var(--color-success)",
                      }}
                    >
                      {parseFloat(transfer.effectiveFxRate) < parseFloat(transfer.fxRate) ? "↓" : "↑"}{" "}
                      {((Math.abs(parseFloat(transfer.effectiveFxRate) - parseFloat(transfer.fxRate)) / parseFloat(transfer.fxRate)) * 100).toFixed(2)}%
                    </span>
                    <span style={{ color: "var(--color-text-subtle)" }}>
                      vs market rate
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
