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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No transfers yet. Create your first transfer on the left.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {transfers.map((transfer) => {
          const isSameCurrency = transfer.sourceCurrencyCode === transfer.targetCurrencyCode;
          const totalCosts = parseFloat(transfer.feeAmount ?? "0") + parseFloat(transfer.taxAmount ?? "0");
          const netSourceAmount = parseFloat(transfer.sourceAmount) - totalCosts;
          
          return (
            <div
              key={transfer.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  {/* Accounts */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {transfer.sourceAccountName}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-600">→</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {transfer.targetAccountName}
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(parseFloat(transfer.sourceAmount), transfer.sourceCurrencyCode)}
                      </span>
                      {totalCosts > 0 && (
                        <span className="ml-1 text-zinc-500 dark:text-zinc-400">
                          +{formatCurrency(totalCosts, transfer.sourceCurrencyCode)} fees
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-400 dark:text-zinc-600">→</span>
                    <div>
                      <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatCurrency(parseFloat(transfer.targetAmount), transfer.targetCurrencyCode)}
                      </span>
                    </div>
                  </div>

                  {/* FX Rate Info */}
                  {!isSameCurrency && transfer.effectiveFxRate && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
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
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                      {transfer.note}
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
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
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Delete transfer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Cost Impact Indicator */}
              {!isSameCurrency && transfer.fxRate && transfer.effectiveFxRate && (
                <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">Cost impact:</span>
                    <span className={`font-medium ${
                      parseFloat(transfer.effectiveFxRate) < parseFloat(transfer.fxRate)
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {parseFloat(transfer.effectiveFxRate) < parseFloat(transfer.fxRate) ? "↓" : "↑"}{" "}
                      {((Math.abs(parseFloat(transfer.effectiveFxRate) - parseFloat(transfer.fxRate)) / parseFloat(transfer.fxRate)) * 100).toFixed(2)}%
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
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
