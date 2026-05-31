"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { BudgetLineForm } from "./budget-line-form";
import { formatAmount } from "./currency-format";
import { CardTitle, Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui";
import { ClipboardImportModal } from "./clipboard-import-modal";

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
  allCategories: { id: string; name: string; kind: string | null }[];
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
  allCategories,
}: Props) {
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);
  const [formAnchorPos, setFormAnchorPos] = useState<{ x: number; y: number } | null>(null);
  const [triggerCellId, setTriggerCellId] = useState<string | null>(null);
  const [clipboardText, setClipboardText] = useState<string | null>(null);

  // Ctrl+V listener: intercept paste when not focused on an input
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (!text.trim()) return;
      // Must look like tabular data: multiple cells or multiple rows
      const hasDelimiter = text.includes("\t") || text.includes(";") || (text.includes(",") && text.includes("\n"));
      if (!hasDelimiter) return;
      e.preventDefault();
      setClipboardText(text);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  function anchorFromElement(el: Element) {
    const FORM_WIDTH = 320;
    const FORM_HEIGHT = 280;
    const rect = el.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - FORM_WIDTH - 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const y = spaceBelow < FORM_HEIGHT ? rect.top - FORM_HEIGHT - 8 : rect.bottom + 8;
    return { x, y };
  }

  function openForm(line: BudgetLine, el: Element) {
    setEditingLine(line);
    setFormAnchorPos(anchorFromElement(el));
    setTriggerCellId(`cell-${line.id}`);
  }

  function closeForm() {
    const id = triggerCellId;
    setEditingLine(null);
    setFormAnchorPos(null);
    setTriggerCellId(null);
    if (id) {
      setTimeout(() => {
        (document.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null)?.focus();
      }, 0);
    }
  }

  useEffect(() => {
    if (!editingLine) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest?.('[data-planning-popup]')) closeForm();
    };
    const handleScroll = () => closeForm();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLine]);

  const currentLines = activeTab === "income" ? incomeLines : expenseLines;

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(year, i).toLocaleString("en-US", { month: "short" })
  );

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
      if (a.currencyCode !== b.currencyCode) {
        return a.currencyCode.localeCompare(b.currencyCode);
      }
      if (a.total !== b.total) {
        return b.total - a.total;
      }
      return a.categoryName.localeCompare(b.categoryName);
    });
  }, [currentLines]);

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
      <div className="flex items-center justify-between gap-4">
        <div className="tab-bar">
          <button
            onClick={() => {
              setActiveTab("expense");
              closeForm();
            }}
            className={`tab-btn ${activeTab === "expense" ? "active" : ""}`}
          >
            Expenses
          </button>
          <button
            onClick={() => {
              setActiveTab("income");
              closeForm();
            }}
            className={`tab-btn ${activeTab === "income" ? "active" : ""}`}
          >
            Income
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.readText().then((text) => {
              if (text.trim()) setClipboardText(text);
            }).catch(() => {
              // Fallback: show an empty modal so user knows the feature exists
              setClipboardText("\t");
            });
          }}
          className="text-xs hover:opacity-70 flex items-center gap-1"
          style={{ color: "var(--color-text-subtle)" }}
          title="Paste rows from a spreadsheet to bulk-import budget lines"
        >
          ⌘V Import from spreadsheet
        </button>
      </div>

      {categoryGroups.length === 0 ? (
        <p className="py-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
          No {activeTab === "income" ? "income" : "expense"} lines yet. Add one
          below.
        </p>
      ) : (
        <Table caption={activeTab === "income" ? "Income lines" : "Expense lines"}>
          <Thead>
            <Tr>
              <Th>Category</Th>
              {monthNames.map((month, idx) => (
                <Th key={idx} numeric>
                  {month}
                </Th>
              ))}
              <Th numeric>Total</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(() => {
              const rows: React.ReactNode[] = [];
                  let currentCurrency = "";

                  categoryGroups.forEach((group, idx) => {
                    if (currentCurrency !== "" && currentCurrency !== group.currencyCode) {
                      const currencyTotal = currencyTotals.get(currentCurrency);
                      if (currencyTotal) {
                        rows.push(
                          <Tr
                            key={`total-${currentCurrency}`}
                            separator
                            style={{ backgroundColor: "var(--color-surface-raised)" }}
                          >
                            <Td className="font-semibold">Total ({currentCurrency})</Td>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                              const monthTotal = currencyTotal.monthlyTotals.get(month) || 0;
                              return (
                                <Td key={month} numeric className="font-semibold">
                                  {monthTotal > 0
                                    ? formatAmount(monthTotal, currentCurrency)
                                    : "—"}
                                </Td>
                              );
                            })}
                            <Td numeric className="font-semibold">
                              {formatAmount(currencyTotal.yearlyTotal, currentCurrency)}
                            </Td>
                          </Tr>
                        );
                      }
                    }

                    rows.push(
                      <Tr key={`${group.categoryId}-${group.currencyCode}`}>
                        <Td>
                          <div className="space-x-1.5">
                            <span className="font-medium">{group.categoryName}</span>
                            <span className="text-[10px] uppercase tracking-wider">
                              ({group.currencyCode})
                            </span>
                          </div>
                        </Td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                          const line = group.months.get(month);
                          return (
                            <Td key={month} numeric>
                              {line ? (
                                <button
                                  data-cell-id={`cell-${line.id}`}
                                  tabIndex={0}
                                  onClick={(e) => openForm(line, e.currentTarget)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      openForm(line, e.currentTarget);
                                    } else if (e.key === 'ArrowRight') {
                                      e.preventDefault();
                                      const nextTd = e.currentTarget.closest('td')?.nextElementSibling;
                                      (nextTd?.querySelector('[data-cell-id]') as HTMLElement | null)?.focus();
                                    } else if (e.key === 'ArrowLeft') {
                                      e.preventDefault();
                                      const prevTd = e.currentTarget.closest('td')?.previousElementSibling;
                                      (prevTd?.querySelector('[data-cell-id]') as HTMLElement | null)?.focus();
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      const currentTr = e.currentTarget.closest('tr');
                                      const nextTr = currentTr?.nextElementSibling;
                                      const colIdx = Array.from(currentTr?.children ?? []).indexOf(e.currentTarget.closest('td')!);
                                      (nextTr?.children[colIdx]?.querySelector('[data-cell-id]') as HTMLElement | null)?.focus();
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      const currentTr = e.currentTarget.closest('tr');
                                      const prevTr = currentTr?.previousElementSibling;
                                      const colIdx = Array.from(currentTr?.children ?? []).indexOf(e.currentTarget.closest('td')!);
                                      (prevTr?.children[colIdx]?.querySelector('[data-cell-id]') as HTMLElement | null)?.focus();
                                    } else if (e.key === 'Escape') {
                                      closeForm();
                                    }
                                  }}
                                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:rounded-sm"
                                  title={`Edit ${group.categoryName} - ${monthNames[month - 1]}`}
                                >
                                  {formatAmount(
                                    parseFloat(line.plannedAmount),
                                    line.currencyCode
                                  )}
                                </button>
                              ) : (
                                <span>—</span>
                              )}
                            </Td>
                          );
                        })}
                        <Td numeric>{formatAmount(group.total, group.currencyCode)}</Td>
                      </Tr>
                    );

                    currentCurrency = group.currencyCode;

                    if (idx === categoryGroups.length - 1) {
                      const currencyTotal = currencyTotals.get(currentCurrency);
                      if (currencyTotal) {
                        rows.push(
                          <Tr
                            key={`total-${currentCurrency}`}
                            separator
                            style={{ backgroundColor: "var(--color-surface-raised)" }}
                          >
                            <Td className="font-semibold">Total ({currentCurrency})</Td>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                              const monthTotal = currencyTotal.monthlyTotals.get(month) || 0;
                              return (
                                <Td key={month} numeric className="font-semibold">
                                  {monthTotal > 0
                                    ? formatAmount(monthTotal, currentCurrency)
                                    : "—"}
                                </Td>
                              );
                            })}
                            <Td numeric className="font-semibold">
                              {formatAmount(currencyTotal.yearlyTotal, currentCurrency)}
                            </Td>
                          </Tr>
                        );
                      }
                    }
                  });

                  return rows;
                })()}
          </Tbody>
        </Table>
      )}

      <div className="mt-6">
        <BudgetLineForm
          budgetId={budgetId}
          year={year}
          categoryKind={activeTab}
          baseCurrency={baseCurrency}
          categories={allCategories.filter(c => activeTab === "income" ? c.kind === "income" : c.kind === "expense" || c.kind === null)}
        />
      </div>

      {/* Edit form portal — positioned near the clicked cell */}
      {editingLine && formAnchorPos && createPortal(
        <div
          data-planning-popup
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeForm();
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
            onSuccess={closeForm}
          />
        </div>,
        document.body
      )}

      {clipboardText && (
        <ClipboardImportModal
          budgetId={budgetId}
          year={year}
          baseCurrency={baseCurrency}
          initialText={clipboardText}
          defaultKind={activeTab}
          onClose={() => setClipboardText(null)}
        />
      )}
    </div>
  );
}
