"use client";

import { useState, useMemo } from "react";
import { BudgetLineForm } from "./budget-line-form";
import { formatCurrency, formatAmount } from "./currency-format";

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
  notes: string | null;
};

type Props = {
  budgetId: string;
  year: number;
  incomeLines: BudgetLine[];
  expenseLines: BudgetLine[];
  baseCurrency: string;
};

type CategoryGroup = {
  categoryId: string;
  categoryName: string;
  currencyCode: string;
  months: Map<number, BudgetLine>;
  total: number;
};

export function PlanningTabs({
  budgetId,
  year,
  incomeLines,
  expenseLines,
  baseCurrency,
}: Props) {
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);

  const currentLines = activeTab === "income" ? incomeLines : expenseLines;

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i).toLocaleString("en-US", { month: "short" })
  );

  // Group lines by category and aggregate by month
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, CategoryGroup>();

    currentLines.forEach((line) => {
      const key = `${line.category.id}-${line.currencyCode}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          categoryId: line.category.id,
          categoryName: line.category.name,
          currencyCode: line.currencyCode,
          months: new Map(),
          total: 0,
        });
      }

      const group = groups.get(key)!;
      group.months.set(line.month, line);
      group.total += parseFloat(line.plannedAmount);
    });

    return Array.from(groups.values()).sort((a, b) => {
      // Sort by currency first, then by total amount (descending), then by category name
      if (a.currencyCode !== b.currencyCode) {
        return a.currencyCode.localeCompare(b.currencyCode);
      }
      if (a.total !== b.total) {
        return b.total - a.total; // Descending order (higher amounts first)
      }
      return a.categoryName.localeCompare(b.categoryName);
    });
  }, [currentLines]);

  // Calculate totals per currency
  const currencyTotals = useMemo(() => {
    const totals = new Map<string, { monthlyTotals: Map<number, number>; yearlyTotal: number }>();

    currentLines.forEach((line) => {
      if (!totals.has(line.currencyCode)) {
        totals.set(line.currencyCode, {
          monthlyTotals: new Map(),
          yearlyTotal: 0,
        });
      }

      const currencyTotal = totals.get(line.currencyCode)!;
      const currentMonthTotal = currencyTotal.monthlyTotals.get(line.month) || 0;
      currencyTotal.monthlyTotals.set(
        line.month,
        currentMonthTotal + parseFloat(line.plannedAmount)
      );
      currencyTotal.yearlyTotal += parseFloat(line.plannedAmount);
    });

    return totals;
  }, [currentLines]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => {
            setActiveTab("expense");
            setEditingLine(null);
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
            setEditingLine(null);
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

      {/* Table View */}
      <div className="overflow-x-auto">
        {categoryGroups.length === 0 ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 py-4">
            No {activeTab === "income" ? "income" : "expense"} lines yet. Add one
            below.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left py-2 px-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  Category
                </th>
                {monthNames.map((month, idx) => (
                  <th
                    key={idx}
                    className="text-left py-2 px-1 font-semibold text-zinc-600 dark:text-zinc-400"
                  >
                    {month}
                  </th>
                ))}
                <th className="text-left py-2 px-1 font-semibold text-zinc-900 dark:text-zinc-50">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows: React.ReactNode[] = [];
                let currentCurrency = "";

                categoryGroups.forEach((group, idx) => {
                  // Add a total row when currency changes
                  if (currentCurrency !== "" && currentCurrency !== group.currencyCode) {
                    const currencyTotal = currencyTotals.get(currentCurrency);
                    if (currencyTotal) {
                      rows.push(
                        <tr
                          key={`total-${currentCurrency}`}
                          className="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        >
                          <td className="py-2 px-2 font-semibold text-zinc-900 dark:text-zinc-50">
                            Total ({currentCurrency})
                          </td>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                            const monthTotal = currencyTotal.monthlyTotals.get(month) || 0;
                            return (
                              <td
                                key={month}
                                className="text-left py-2 px-1 font-mono font-semibold text-zinc-900 dark:text-zinc-50 text-[11px]"
                              >
                                {monthTotal > 0
                                  ? formatAmount(monthTotal, currentCurrency)
                                  : "—"}
                              </td>
                            );
                          })}
                          <td className="text-left py-2 px-1 font-mono font-semibold text-zinc-900 dark:text-zinc-50 text-[11px]">
                            {formatAmount(currencyTotal.yearlyTotal, currentCurrency)}
                          </td>
                        </tr>
                      );
                    }
                  }

                  // Add category row
                  rows.push(
                    <tr
                      key={`${group.categoryId}-${group.currencyCode}`}
                      className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <td className="py-2 px-2">
                        <div className="space-x-1.5">
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {group.categoryName}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            ({group.currencyCode})
                          </span>
                        </div>
                      </td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                        const line = group.months.get(month);
                        return (
                          <td
                            key={month}
                            className="text-left py-2 px-1 text-zinc-700 dark:text-zinc-300"
                          >
                            {line ? (
                              <button
                                onClick={() => setEditingLine(line)}
                                className="hover:underline font-mono text-[11px]"
                                title={`Edit ${group.categoryName} - ${monthNames[month - 1]}`}
                              >
                                {formatAmount(
                                  parseFloat(line.plannedAmount),
                                  line.currencyCode
                                )}
                              </button>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-600">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-left py-2 px-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {formatAmount(group.total, group.currencyCode)}
                      </td>
                    </tr>
                  );

                  currentCurrency = group.currencyCode;

                  // Add total row after last category of last currency
                  if (idx === categoryGroups.length - 1) {
                    const currencyTotal = currencyTotals.get(currentCurrency);
                    if (currencyTotal) {
                      rows.push(
                        <tr
                          key={`total-${currentCurrency}`}
                          className="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        >
                          <td className="py-2 px-2 font-semibold text-zinc-900 dark:text-zinc-50">
                            Total ({currentCurrency})
                          </td>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                            const monthTotal = currencyTotal.monthlyTotals.get(month) || 0;
                            return (
                              <td
                                key={month}
                                className="text-left py-2 px-1 font-mono font-semibold text-zinc-900 dark:text-zinc-50 text-[11px]"
                              >
                                {monthTotal > 0
                                  ? formatAmount(monthTotal, currentCurrency)
                                  : "—"}
                              </td>
                            );
                          })}
                          <td className="text-left py-2 px-1 font-mono font-semibold text-zinc-900 dark:text-zinc-50 text-[11px]">
                            {formatAmount(currencyTotal.yearlyTotal, currentCurrency)}
                          </td>
                        </tr>
                      );
                    }
                  }
                });

                return rows;
              })()}
            </tbody>
          </table>
        )}
      </div>

      {/* Form */}
      <div className="mt-6">
        {editingLine ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                Editing: {editingLine.category.name} ({monthNames[editingLine.month - 1]})
              </p>
              <button
                onClick={() => setEditingLine(null)}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
            <BudgetLineForm
              budgetId={budgetId}
              year={year}
              categoryKind={activeTab}
              baseCurrency={baseCurrency}
              editingLine={{
                id: editingLine.id,
                categoryName: editingLine.category.name,
                month: editingLine.month,
                plannedAmount: editingLine.plannedAmount,
                currencyCode: editingLine.currencyCode,
                notes: editingLine.notes,
              }}
              onSuccess={() => setEditingLine(null)}
            />
          </div>
        ) : (
          <BudgetLineForm
            budgetId={budgetId}
            year={year}
            categoryKind={activeTab}
            baseCurrency={baseCurrency}
            onSuccess={() => setEditingLine(null)}
          />
        )}
      </div>
    </div>
  );
}
