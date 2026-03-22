"use client";

import { startTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransactionForm } from "./transaction-form";
import { formatAmount } from "../planning/currency-format";
import { deleteTransaction } from "./transactions.actions";

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
};

type Props = {
  budgetId: string;
  year: number;
  selectedMonth: number;
  incomeLines: BudgetLine[];
  expenseLines: BudgetLine[];
  transactions: Transaction[];
  accounts: Account[];
  baseCurrency: string;
};

export function TrackingTabs({
  budgetId,
  year,
  selectedMonth,
  incomeLines,
  expenseLines,
  transactions,
  accounts,
  baseCurrency,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [selectedBudgetLine, setSelectedBudgetLine] =
    useState<BudgetLineWithActuals | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is on any transaction button or popup
      const isTransactionClick = (target as Element)?.closest?.('[data-transaction-popup]');
      
      if (!isTransactionClick) {
        setOpenPopupId(null);
      }
    };

    if (openPopupId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopupId]);

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

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i).toLocaleString("en-US", { month: "short" })
  );
  
  const fullMonthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i).toLocaleString("en-US", { month: "long" })
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

  return (
    <div className="space-y-4">
      {/* Month Selector and Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          >
            {monthNames.map((name, index) => (
              <option key={index + 1} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
          onClick={() => {
            setActiveTab("expense");
            setSelectedBudgetLine(null);
            setEditingTransaction(null);
            setOpenPopupId(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "expense"
              ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
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
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "income"
              ? "border-b-2 border-zinc-900 text-zinc-900 dark:text-zinc-50 dark:text-zinc-50"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Income
          </button>
        </div>
      </div>

      {/* Month Header */}
      <div className="rounded-lg border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {fullMonthNames[selectedMonth - 1]} {year}
        </h2>
      </div>

      {/* Lines List */}
      <div className="space-y-2">
        {linesWithActuals.length === 0 ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 py-4">
            No {activeTab === "income" ? "income" : "expense"} budget lines yet.
            Create them in Planning first.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
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

              return (
                <div
                  key={line.id}
                  className="py-2 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {line.category.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          {line.currencyCode}
                        </span>
                      </div>
                      {line.transactions.length > 0 && (
                        <div className="relative" data-transaction-popup>
                          <button
                            onClick={() => setOpenPopupId(openPopupId === line.id ? null : line.id)}
                            className="text-xs text-zinc-600 underline decoration-dotted underline-offset-2 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300"
                          >
                            {line.transactions.length} transaction
                            {line.transactions.length !== 1 ? "s" : ""}
                          </button>
                          {openPopupId === line.id && (
                            <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800" data-transaction-popup>
                              <div className="p-3">
                                <div className="mb-2 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                                  Transactions
                                </div>
                                <div className="space-y-1.5">
                                {line.transactions.map((tx) => (
                                  <div
                                    key={tx.id}
                                    className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs group/transaction"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="truncate text-zinc-700 dark:text-zinc-300">
                                        {tx.account.name}
                                      </span>
                                      {tx.description && (
                                        <span className="truncate text-zinc-500 dark:text-zinc-400 text-[10px]">
                                          {tx.description}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono text-zinc-900 dark:text-zinc-50">
                                        {formatAmount(
                                          parseFloat(tx.amount),
                                          tx.currencyCode
                                        )}
                                      </span>
                                      <button
                                        onClick={() => {
                                          setEditingTransaction(tx);
                                          setSelectedBudgetLine(line);
                                          setOpenPopupId(null);
                                        }}
                                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                        title="Edit transaction"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-10">
                      <div className="text-right">
                        <div className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                          &nbsp;
                        </div>
                        <button
                          onClick={() => {
                            if (editingTransaction && selectedBudgetLine?.id === line.id) {
                              // Cancel edit mode
                              setEditingTransaction(null);
                              setSelectedBudgetLine(null);
                            } else {
                              // Start create mode
                              setEditingTransaction(null);
                              setSelectedBudgetLine(line);
                            }
                          }}
                          className="text-xs leading-5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          {editingTransaction && selectedBudgetLine?.id === line.id ? "Cancel" : "Add"}
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                          &nbsp;
                        </div>
                        <button
                          onClick={() => {
                            clearLine(line);
                            setEditingTransaction(null);
                          }}
                          className="text-xs leading-5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid items-center gap-x-4 gap-y-1 grid-cols-[7.5rem_7.5rem_5.5rem]">
                      {/* Expected */}
                      <div className="text-right">
                        <div className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                          Expected
                        </div>
                        <div className="text-sm leading-5 font-mono text-zinc-700 dark:text-zinc-300">
                          {formatAmount(expected, line.currencyCode)}
                        </div>
                      </div>

                      {/* Actual */}
                      <div className="text-right">
                        <div className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                          Actual
                        </div>
                        <div className="text-sm leading-5 font-mono text-zinc-700 dark:text-zinc-300">
                          {actual > 0
                            ? formatAmount(actual, line.actualCurrency)
                            : "—"}
                        </div>
                      </div>

                      {/* Percentage with arrow */}
                      <div className="text-right">
                        <div className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                          %
                        </div>
                        {actual > 0 && percentage !== null ? (
                          <div className="inline-flex items-center justify-end gap-1 text-sm leading-5 font-semibold">
                            {isOver ? (
                              <span className={`${activeTab === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                ↑
                              </span>
                            ) : isUnder ? (
                              <span className={`${activeTab === "income" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                ↓
                              </span>
                            ) : (
                              <span className="text-zinc-500 dark:text-zinc-400">
                                →
                              </span>
                            )}
                            <span
                              className={
                                isOver
                                  ? `${activeTab === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`
                                  : isUnder
                                    ? `${activeTab === "income" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`
                                    : "text-zinc-700 dark:text-zinc-300"
                              }
                            >
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        ) : actual > 0 ? (
                          <div className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                            —
                          </div>
                        ) : (
                          <div className="text-xs leading-5 text-zinc-400 dark:text-zinc-600">
                            —
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Form */}
                  {(selectedBudgetLine?.id === line.id) && (
                    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <TransactionForm
                        budgetLineId={line.id}
                        year={year}
                        expectedAmount={line.plannedAmount}
                        expectedCurrency={line.currencyCode}
                        accounts={accounts}
                        transaction={editingTransaction}
                        onSuccess={() => {
                          setSelectedBudgetLine(null);
                          setEditingTransaction(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
