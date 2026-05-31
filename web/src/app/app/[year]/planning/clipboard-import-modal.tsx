"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { importClipboardRows } from "./budget-lines.actions";
import { CurrencyInput } from "@/components/currency-input";
import { parseClipboard, type ParsedClipboardRow, type SkippedClipboardRow } from "@/lib/clipboard-parser";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ParsedRow = ParsedClipboardRow;
type SkippedRow = SkippedClipboardRow;

type Props = {
  budgetId: string;
  year: number;
  baseCurrency: string;
  defaultKind: "income" | "expense";
  onClose: () => void;
  initialText: string;
};

export function ClipboardImportModal({ budgetId, year, baseCurrency, defaultKind, onClose, initialText }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>(() => parseClipboard(initialText, baseCurrency, defaultKind).rows);
  const [skipped] = useState<SkippedRow[]>(() => parseClipboard(initialText, baseCurrency, defaultKind).skipped);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateRow = (key: string, patch: Partial<ParsedRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const updateAmount = (key: string, month: number, value: string) => {
    const val = parseFloat(value.replace(",", "."));
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const existing = r.amounts.filter((a) => a.month !== month);
        if (!isNaN(val) && val > 0) {
          return { ...r, amounts: [...existing, { month, amount: val }].sort((a, b) => a.month - b.month) };
        }
        return { ...r, amounts: existing };
      })
    );
  };

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleImport = () => {    setError(null);
    startTransition(async () => {
      const result = await importClipboardRows(budgetId, year, rows);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  const totalLines = rows.reduce((sum, r) => sum + r.amounts.length, 0);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[90vw] flex-col rounded-xl shadow-2xl"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
              Import from clipboard
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {rows.length} categor{rows.length !== 1 ? "ies" : "y"} · {totalLines} budget line{totalLines !== 1 ? "s" : ""} to create
              {skipped.length > 0 && ` · ${skipped.length} row${skipped.length !== 1 ? "s" : ""} skipped`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none hover:opacity-70"
            style={{ color: "var(--color-text-subtle)" }}
          >
            ✕
          </button>
        </div>

        {/* Skipped warnings */}
        {skipped.length > 0 && (
          <div className="border-b px-6 py-3 space-y-1" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-raised)" }}>
            {skipped.map((s, i) => (
              <p key={i} className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span style={{ color: "var(--color-danger)" }}>Skipped:</span>{" "}
                <span className="font-mono">{s.raw.slice(0, 60)}{s.raw.length > 60 ? "…" : ""}</span>
                {" "}— {s.reason}
              </p>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm px-6" style={{ color: "var(--color-text-muted)" }}>
              No rows could be parsed. Make sure your data has a category name in the first column followed by monthly amounts.
            </p>
          ) : (
            <table className="text-sm border-collapse" style={{ minWidth: "100%" }}>
              <thead>
                <tr className="data-list-header" style={{ display: "table-row" }}>
                  <th className="text-left font-medium px-4 py-2" style={{ color: "var(--color-text-subtle)", minWidth: 180, position: "sticky", left: 0, backgroundColor: "var(--color-surface-raised)", zIndex: 1 }}>Category</th>
                  <th className="text-left font-medium px-2 py-2" style={{ color: "var(--color-text-subtle)", minWidth: 100 }}>Kind</th>
                  <th className="text-left font-medium px-2 py-2" style={{ color: "var(--color-text-subtle)", minWidth: 100 }}>Currency</th>
                  {MONTH_NAMES.map((m) => (
                    <th key={m} className="text-right font-medium px-2 py-2" style={{ color: "var(--color-text-subtle)", minWidth: 90 }}>{m}</th>
                  ))}
                  <th className="px-4 py-2" style={{ minWidth: 32 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                    <td className="px-4 py-2" style={{ position: "sticky", left: 0, backgroundColor: "var(--color-surface)", zIndex: 1 }}>
                      <input
                        className="input w-full text-sm py-1"
                        value={row.categoryName}
                        onChange={(e) => updateRow(row.key, { categoryName: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="input w-full text-sm py-1"
                        value={row.kind}
                        onChange={(e) => updateRow(row.key, { kind: e.target.value as "income" | "expense" })}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <CurrencyInput
                        name={`currency-${row.key}`}
                        value={row.currencyCode}
                        onChange={(v) => updateRow(row.key, { currencyCode: v })}
                        required
                      />
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const entry = row.amounts.find((a) => a.month === month);
                      return (
                        <td key={month} className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input w-full text-right text-sm py-1 tabular-nums"
                            value={entry?.amount ?? ""}
                            placeholder="—"
                            onChange={(e) => updateAmount(row.key, month, e.target.value)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="hover:opacity-70"
                        style={{ color: "var(--color-text-subtle)" }}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: "var(--color-border)" }}>
          <div>
            {error && <p className="text-xs" style={{ color: "var(--color-danger)" }}>{error}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isPending || rows.length === 0}
              className="btn-primary text-xs"
            >
              {isPending ? "Importing…" : `Import ${rows.length} categor${rows.length !== 1 ? "ies" : "y"} (${totalLines} budget line${totalLines !== 1 ? "s" : ""})`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
