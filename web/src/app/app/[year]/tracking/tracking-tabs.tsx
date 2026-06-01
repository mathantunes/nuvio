"use client";

import { startTransition, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DataList, DataListRow, RowAction } from "@/components/ui";
import { TransactionForm } from "./transaction-form";
import { formatAmount } from "../planning/currency-format";
import { deleteTransaction, createUnplannedTransaction, confirmAsPaid } from "./transactions.actions";

type BudgetLine = {
  id: string;
  category: {
    id: string;
    name: string;
    kind: string | null;
  };
  month: number;
  plannedAmount: string;
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

type BudgetLineWithActuals = BudgetLine & {
  transactions: Transaction[];
  actualTotal: number;
  actualCurrency: string;
};

type Account = {
  id: string;
  name: string;
  currencyCode: string;
  isPrimary: boolean;
};

type Category = {
  id: string;
  name: string;
  kind: string | null;
};

type Props = {
  year: number;
  selectedMonth: number;
  incomeLines: BudgetLine[];
  expenseLines: BudgetLine[];
  transactions: Transaction[];
  accounts: Account[];
  baseCurrency: string;
  incomeCategories: Category[];
  expenseCategories: Category[];
};

export function TrackingTabs({
  year,
  selectedMonth,
  incomeLines,
  expenseLines,
  transactions,
  accounts,
  incomeCategories,
  expenseCategories,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [selectedBudgetLine, setSelectedBudgetLine] =
    useState<BudgetLineWithActuals | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const [formAnchorPos, setFormAnchorPos] = useState<{ x: number; y: number } | null>(null);
  const [popoverAnchorPos, setPopoverAnchorPos] = useState<{ x: number; y: number } | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<Record<string, "pending" | "error">>({});

  function anchorFromEvent(e: { clientX: number; clientY: number }) {
    const FORM_WIDTH = 320;
    const FORM_HEIGHT = 320;
    const x = Math.min(e.clientX, window.innerWidth - FORM_WIDTH - 16);
    const spaceBelow = window.innerHeight - e.clientY;
    const y = spaceBelow < FORM_HEIGHT ? e.clientY - FORM_HEIGHT - 12 : e.clientY + 12;
    return { x, y };
  }

  function anchorFromElement(el: Element) {
    const rect = el.getBoundingClientRect();
    return anchorFromEvent({ clientX: rect.right - 320, clientY: rect.bottom });
  }

  function openForm(line: BudgetLineWithActuals, pos: { x: number; y: number }) {
    setEditingTransaction(null);
    setOpenPopupId(null);
    setSelectedBudgetLine(line);
    setFormAnchorPos(pos);
  }

  function closeForm() {
    setSelectedBudgetLine(null);
    setEditingTransaction(null);
    setFormAnchorPos(null);
    setOpenPopupId(null);
    setPopoverAnchorPos(null);
  }

  // Close both popovers when clicking outside any [data-transaction-popup] element
  // Also close on scroll (capture phase catches scroll on any container)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isInsidePopup = (event.target as Element)?.closest?.('[data-transaction-popup]');
      if (!isInsidePopup) closeForm();
    };
    const handleScroll = (event: Event) => {
      // Don't close if the scroll happened inside the popup itself
      const target = event.target as Element | null;
      if (target?.closest?.('[data-transaction-popup]')) return;
      closeForm();
    };
    if (openPopupId || selectedBudgetLine) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [openPopupId, selectedBudgetLine]);

  const allCurrentLines = activeTab === "income" ? incomeLines : expenseLines;

  // Filter lines by selected month
  const currentLines = allCurrentLines.filter(
    (line) => line.month === selectedMonth
  );

  // Group transactions by budgetLineId
  const transactionsByBudgetLine = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    if (tx.budgetLineId) {
      if (!transactionsByBudgetLine.has(tx.budgetLineId)) {
        transactionsByBudgetLine.set(tx.budgetLineId, []);
      }
      transactionsByBudgetLine.get(tx.budgetLineId)!.push(tx);
    }
  });

  // Combine budget lines with their actuals
  const linesWithActuals: BudgetLineWithActuals[] = currentLines
    .map((line) => {
      const lineTransactions = transactionsByBudgetLine.get(line.id) || [];

      // Group transactions by currency and sum
      const amountsByCurrency = new Map<string, number>();
      lineTransactions.forEach((tx) => {
        const current = amountsByCurrency.get(tx.currencyCode) || 0;
        amountsByCurrency.set(tx.currencyCode, current + parseFloat(tx.amount));
      });

      // For now, use the first currency found (or budget line currency if no transactions)
      // TODO: Convert all to budget line currency using FX rates
      const actualCurrency =
        lineTransactions[0]?.currencyCode || line.currencyCode;
      const actualTotal = amountsByCurrency.get(actualCurrency) || 0;

      return {
        ...line,
        transactions: lineTransactions,
        actualTotal,
        actualCurrency,
      };
    })
    .sort((a, b) => {
      // Sort by currency first, then by planned amount (descending), then by category name
      if (a.currencyCode !== b.currencyCode) {
        return a.currencyCode.localeCompare(b.currencyCode);
      }
      const aAmount = parseFloat(a.plannedAmount);
      const bAmount = parseFloat(b.plannedAmount);
      if (aAmount !== bAmount) {
        return bAmount - aAmount; // Descending order (higher amounts first)
      }
      return a.category.name.localeCompare(b.category.name);
    });

  // Keep ref up to date for keyboard handler
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i).toLocaleString("en-US", { month: "short" })
  );

  // Calculate percentage (actual / expected * 100)
  // Note: For now, only calculates when currencies match. FX conversion needed for cross-currency.
  const calculatePercentage = (
    expected: number,
    actual: number,
    expectedCurrency: string,
    actualCurrency: string
  ): number | null => {
    if (expectedCurrency === actualCurrency && expected > 0) {
      return (actual / expected) * 100;
    }
    return null; // Can't calculate percentage when currencies differ without FX rates
  };

  const clearLine = (line: BudgetLineWithActuals) => {
    startTransition(async () => {
      for (const tx of line.transactions) {
        await deleteTransaction(tx.id, year);
      }
      setSelectedBudgetLine(null);
      setEditingTransaction(null);
      setOpenPopupId(null);
    });
  };

  const handleTogglePaid = (line: BudgetLineWithActuals) => {
    setConfirmStatus((s) => ({ ...s, [line.id]: "pending" }));
    startTransition(async () => {
      let result: { error?: string } | undefined;
      if (line.transactions.length > 0) {
        for (const tx of line.transactions) {
          result = await deleteTransaction(tx.id, year) ?? undefined;
        }
        setSelectedBudgetLine(null);
        setEditingTransaction(null);
        setOpenPopupId(null);
      } else {
        result = await confirmAsPaid(line.id, year, selectedMonth) ?? undefined;
      }
      if (result?.error) {
        setConfirmStatus((s) => ({ ...s, [line.id]: "error" }));
        setTimeout(
          () => setConfirmStatus((s) => { const n = { ...s }; delete n[line.id]; return n; }),
          3000
        );
      } else {
        setConfirmStatus((s) => { const n = { ...s }; delete n[line.id]; return n; });
      }
    });
  };

  const currentCategories = activeTab === "income" ? incomeCategories : expenseCategories;

  // Currencies for which the user has at least one active account (enables ✓ shortcut)
  const accountedCurrencies = new Set(accounts.map((a) => a.currencyCode));

  return (
    <div className="space-y-4">
      {/* Month Selector and Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            Month:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const nextMonth = Number(e.target.value);
              setSelectedBudgetLine(null);
              setEditingTransaction(null);
              setOpenPopupId(null);
              router.push(`/app/${year}/tracking/${nextMonth}`);
            }}
            className="input py-1.5"
          >
            {monthNames.map((name, index) => (
              <option key={index + 1} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button
            onClick={() => {
              setActiveTab("expense");
              setSelectedBudgetLine(null);
              setEditingTransaction(null);
              setOpenPopupId(null);
            }}
            className={`tab-btn ${activeTab === "expense" ? "active" : ""}`}
          >
            Expenses
          </button>
          <button
            onClick={() => {
              setActiveTab("income");
              setSelectedBudgetLine(null);
              setEditingTransaction(null);
              setOpenPopupId(null);
            }}
            className={`tab-btn ${activeTab === "income" ? "active" : ""}`}
          >
            Income
          </button>
        </div>
      </div>

      {/* Lines List */}
      <div className="space-y-2">
        {linesWithActuals.length === 0 ? (
          <p className="py-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
            No {activeTab === "income" ? "income" : "expense"} budget lines yet.
            Create them in Planning first.
          </p>
        ) : (
          <div className="space-y-0 rounded-lg" style={{ backgroundColor: "var(--color-surface)" }}>
          <DataList
              headerClassName="hidden sm:flex"
              header={
                <>
                  <div className="min-w-0 flex-1">Budget line</div>
                  <div className="w-28 shrink-0">Transactions</div>
                  <div className="w-32 shrink-0 text-right">Expected</div>
                  <div className="w-32 shrink-0 text-right">Actual</div>
                  <div className="w-24 shrink-0 text-right">%</div>
                </>
              }
            >
            {linesWithActuals.map((line) => {
              const expected = parseFloat(line.plannedAmount);
              const actual = line.actualTotal;
              const percentage = calculatePercentage(
                expected,
                actual,
                line.currencyCode,
                line.actualCurrency
              );
              const isOver = percentage !== null && actual > expected;
              const isUnder = percentage !== null && actual < expected;
              const isSelected = selectedBudgetLine?.id === line.id;
              const transactionLabel = `${line.transactions.length} transaction${line.transactions.length !== 1 ? "s" : ""}`;

              return (
                <DataListRow
                  key={line.id}
                  data-line-id={line.id}
                  tabIndex={0}
                  className={`flex-col items-stretch gap-3 sm:flex-row sm:items-start ${
                    isSelected ? "border-l-2 bg-[var(--color-brand-subtle)]" : ""
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-inset`}
                  style={{
                    cursor: "pointer",
                    ...(isSelected ? { borderLeftColor: "var(--color-brand)" } : undefined),
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (isSelected) {
                        closeForm();
                      } else {
                        openForm(line, anchorFromElement(e.currentTarget));
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                      next?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                      prev?.focus();
                    } else if (e.key === 'Escape') {
                      closeForm();
                      (e.currentTarget as HTMLElement).focus();
                    }
                  }}
                  onMouseDown={(e) => {
                    const target = e.target as Element;
                    if (target.closest('button') || target.closest('[data-transaction-popup]')) return;
                    e.stopPropagation();
                    setOpenPopupId(null);
                    if (selectedBudgetLine?.id === line.id) {
                      closeForm();
                    } else {
                      openForm(line, anchorFromEvent(e));
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {accountedCurrencies.has(line.currencyCode) ? (
                        <button
                          type="button"
                          title={line.transactions.length > 0 ? "Clear transactions for this line" : "Mark as paid — records a transaction for the planned amount"}
                          disabled={confirmStatus[line.id] === "pending"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePaid(line);
                          }}
                          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition-all"
                          style={{
                            border: confirmStatus[line.id] === "error"
                              ? "1.5px solid var(--color-danger)"
                              : line.transactions.length > 0
                                ? "1.5px solid var(--color-brand)"
                                : "1.5px solid var(--color-border)",
                            backgroundColor: line.transactions.length > 0 && confirmStatus[line.id] !== "error"
                              ? "var(--color-brand)"
                              : "transparent",
                            color: confirmStatus[line.id] === "error"
                              ? "var(--color-danger)"
                              : "white",
                            fontSize: "9px",
                          }}
                        >
                          {confirmStatus[line.id] === "pending"
                            ? "…"
                            : confirmStatus[line.id] === "error"
                              ? "✗"
                              : line.transactions.length > 0
                                ? "✓"
                                : ""}
                        </button>
                      ) : (
                        <span
                          className="flex h-4 w-4 flex-shrink-0 rounded"
                          style={{ border: "1.5px solid var(--color-border)", opacity: 0.3 }}
                        />
                      )}
                      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {line.category.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                        {line.currencyCode}
                      </span>
                    </div>
                    {line.transactions.length > 0 && (
                      <div className="mt-1 sm:hidden" data-transaction-popup>
                        <div className="relative inline-block" data-transaction-popup>
                          <RowAction
                            type="button"
                            onClick={(e) => {
                              if (openPopupId === line.id) {
                                setOpenPopupId(null);
                                setPopoverAnchorPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setOpenPopupId(line.id);
                                setPopoverAnchorPos({ x: rect.left, y: rect.bottom + 4 });
                              }
                            }}
                            className="underline decoration-dotted underline-offset-2"
                          >
                            {transactionLabel}
                          </RowAction>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative hidden w-28 shrink-0 sm:block" data-transaction-popup>
                    {line.transactions.length > 0 ? (
                      <>
                        <RowAction
                          type="button"
                          onClick={(e) => {
                            if (openPopupId === line.id) {
                              setOpenPopupId(null);
                              setPopoverAnchorPos(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenPopupId(line.id);
                              setPopoverAnchorPos({ x: rect.left, y: rect.bottom + 4 });
                            }
                          }}
                          className="underline decoration-dotted underline-offset-2"
                        >
                          {transactionLabel}
                        </RowAction>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                        —
                      </span>
                    )}
                  </div>

                  <div className="hidden w-32 shrink-0 text-right sm:block">
                    <div className="text-sm leading-5 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {formatAmount(expected, line.currencyCode)}
                    </div>
                  </div>

                  <div className="hidden w-32 shrink-0 text-right sm:block">
                    <div className="text-sm leading-5 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {actual > 0 ? formatAmount(actual, line.actualCurrency) : "—"}
                    </div>
                  </div>

                  <div className="hidden w-24 shrink-0 text-right sm:block">
                    {actual > 0 && percentage !== null ? (
                      <div className="inline-flex items-center justify-end gap-1 text-sm leading-5 font-semibold">
                        {isOver ? (
                          <span
                            style={{
                              color:
                                activeTab === "income"
                                  ? "var(--color-on-track)"
                                  : "var(--color-off-track)",
                            }}
                          >
                            ↑
                          </span>
                        ) : isUnder ? (
                          <span
                            style={{
                              color:
                                activeTab === "income"
                                  ? "var(--color-off-track)"
                                  : "var(--color-on-track)",
                            }}
                          >
                            ↓
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-subtle)" }}>
                            →
                          </span>
                        )}
                        <span
                          style={{
                            color: isOver
                              ? activeTab === "income"
                                ? "var(--color-on-track)"
                                : "var(--color-off-track)"
                              : isUnder
                                ? activeTab === "income"
                                  ? "var(--color-off-track)"
                                  : "var(--color-on-track)"
                                : "var(--color-text-muted)",
                          }}
                        >
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs leading-5" style={{ color: "var(--color-text-subtle)" }}>
                        —
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border-t pt-3 sm:hidden" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-center gap-4">
                      <RowAction
                        type="button"
                        danger
                        onClick={() => {
                          clearLine(line);
                          setEditingTransaction(null);
                        }}
                      >
                        Clear
                      </RowAction>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-[11px] leading-4" style={{ color: "var(--color-text-subtle)" }}>
                          Expected
                        </div>
                        <div
                          className="text-sm leading-5 tabular-nums"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {formatAmount(expected, line.currencyCode)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] leading-4" style={{ color: "var(--color-text-subtle)" }}>
                          Actual
                        </div>
                        <div
                          className="text-sm leading-5 tabular-nums"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {actual > 0 ? formatAmount(actual, line.actualCurrency) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] leading-4" style={{ color: "var(--color-text-subtle)" }}>
                          Progress
                        </div>
                        {actual > 0 && percentage !== null ? (
                          <div className="inline-flex items-center gap-1 text-sm leading-5 font-semibold">
                            {isOver ? (
                              <span
                                style={{
                                  color:
                                    activeTab === "income"
                                      ? "var(--color-on-track)"
                                      : "var(--color-off-track)",
                                }}
                              >
                                ↑
                              </span>
                            ) : isUnder ? (
                              <span
                                style={{
                                  color:
                                    activeTab === "income"
                                      ? "var(--color-off-track)"
                                      : "var(--color-on-track)",
                                }}
                              >
                                ↓
                              </span>
                            ) : (
                              <span style={{ color: "var(--color-text-subtle)" }}>
                                →
                              </span>
                            )}
                            <span
                              style={{
                                color: isOver
                                  ? activeTab === "income"
                                    ? "var(--color-on-track)"
                                    : "var(--color-off-track)"
                                  : isUnder
                                    ? activeTab === "income"
                                      ? "var(--color-off-track)"
                                      : "var(--color-on-track)"
                                    : "var(--color-text-muted)",
                              }}
                            >
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <div
                            className="text-xs leading-5"
                            style={{ color: "var(--color-text-subtle)" }}
                          >
                            —
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </DataListRow>
              );
            })}
            </DataList>
          </div>
        )}
      </div>

      {/* Fixed-position transaction popover — portaled to body so overflow:hidden rows don't clip it */}
      {(() => {
        const openLine = openPopupId ? linesWithActuals.find((l) => l.id === openPopupId) ?? null : null;
        if (!openLine || !popoverAnchorPos) return null;
        const POPOVER_WIDTH = 320;
        const left = Math.min(popoverAnchorPos.x, window.innerWidth - POPOVER_WIDTH - 16);
        return createPortal(
          <div
            data-transaction-popup
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", left, top: popoverAnchorPos.y, width: POPOVER_WIDTH, zIndex: 50 }}
            className="shadow-xl"
          >
            <TransactionPopover
              transactions={openLine.transactions}
              onEdit={(tx, rect) => {
                closeForm();
                openForm(openLine, anchorFromEvent({ clientX: rect.left, clientY: rect.bottom }));
                setEditingTransaction(tx);
              }}
            />
          </div>,
          document.body
        );
      })()}

      {/* Fixed-position transaction form — portaled to body so no parent transform affects it */}
      {selectedBudgetLine && formAnchorPos && createPortal(
        <div
          data-transaction-popup
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              const lineId = selectedBudgetLine?.id;
              closeForm();
              setTimeout(() => {
                (document.querySelector(`[data-line-id="${lineId}"]`) as HTMLElement | null)?.focus();
              }, 0);
            }
          }}
          style={{
            position: "fixed",
            left: formAnchorPos.x,
            top: formAnchorPos.y,
            width: 320,
            zIndex: 50,
          }}
          className="shadow-xl"
        >
          <TransactionForm
            key={selectedBudgetLine.id}
            budgetLineId={selectedBudgetLine.id}
            year={year}
            month={selectedMonth}
            expectedAmount={selectedBudgetLine.plannedAmount}
            expectedCurrency={selectedBudgetLine.currencyCode}
            categoryName={selectedBudgetLine.category.name}
            accounts={accounts}
            transaction={editingTransaction}
            onSuccess={() => {
              const lineId = selectedBudgetLine?.id;
              closeForm();
              // Return focus to the row so keyboard navigation continues naturally
              if (lineId) {
                setTimeout(() => {
                  (document.querySelector(`[data-line-id="${lineId}"]`) as HTMLElement | null)?.focus();
                }, 50);
              }
            }}
          />
        </div>,
        document.body
      )}

      {/* Unplanned Section — form only; transactions appear in the regular list above */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
          Unplanned
        </h3>

        {/* Add unplanned transaction form */}
        <UnplannedForm
          year={year}
          month={selectedMonth}
          categories={currentCategories}
          accounts={accounts}
        />
      </div>
    </div>
  );
}

function TransactionPopover({
  transactions,
  onEdit,
}: {
  transactions: Transaction[];
  onEdit: (transaction: Transaction, rect: DOMRect) => void;
}) {
  return (
    <DataList
      listClassName="max-h-64 overflow-y-auto"
      header={
        <>
          <div className="min-w-0 flex-1">Transaction</div>
          <div className="w-24 shrink-0 text-right">Amount</div>
          <div className="w-12 shrink-0 text-right">Edit</div>
        </>
      }
    >
      {transactions.map((tx) => (
        <DataListRow key={tx.id} className="gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate" style={{ color: "var(--color-text-muted)" }}>
              {tx.account.name}
            </div>
            <div className="truncate text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
              {tx.description || "—"}
            </div>
          </div>
          <div className="w-24 shrink-0 text-right tabular-nums" style={{ color: "var(--color-text)" }}>
            {formatAmount(parseFloat(tx.amount), tx.currencyCode)}
          </div>
          <div className="w-12 shrink-0 text-right">
            <RowAction
              type="button"
              onClick={(e) => onEdit(tx, e.currentTarget.getBoundingClientRect())}
              title="Edit transaction"
            >
              Edit
            </RowAction>
          </div>
        </DataListRow>
      ))}
    </DataList>
  );
}

function UnplannedForm({
  year,
  month,
  categories,
  accounts,
}: {
  year: number;
  month: number;
  categories: Category[];
  accounts: { id: string; name: string; currencyCode: string }[];
}) {
  const [selectedAccountCurrency, setSelectedAccountCurrency] = useState(
    accounts[0]?.currencyCode ?? "CHF"
  );

  const defaultDate = (() => {
    const now = new Date();
    const nowMonth = now.getMonth() + 1;
    const nowYear = now.getFullYear();
    if (nowYear === year && nowMonth === month) {
      return now.toISOString().split("T")[0];
    }
    return `${year}-${String(month).padStart(2, "0")}-01`;
  })();

  if (categories.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
        No categories available. Create one in{" "}
        <a href={`/app/${year}/categories`} className="underline">
          Categories
        </a>
        .
      </p>
    );
  }

  return (
    <form action={createUnplannedTransaction} className="space-y-3">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="currencyCode" value={selectedAccountCurrency} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>Category</label>
          <select
            name="categoryId"
            required
            className="input mt-0.5 py-1.5 text-sm"
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>Account</label>
          <select
            name="accountId"
            required
            onChange={(e) => {
              const acc = accounts.find((a) => a.id === e.target.value);
              if (acc) setSelectedAccountCurrency(acc.currencyCode);
            }}
            className="input mt-0.5 py-1.5 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currencyCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
            Amount ({selectedAccountCurrency})
          </label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            className="input mt-0.5 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>Date</label>
          <input
            type="date"
            name="occurredAt"
            required
            defaultValue={defaultDate}
            className="input mt-0.5 py-1.5 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
          Description (optional)
        </label>
        <input
          type="text"
          name="description"
          maxLength={500}

          className="input mt-0.5 py-1.5 text-sm"
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
      >
        Add unplanned transaction
      </button>
    </form>
  );
}
