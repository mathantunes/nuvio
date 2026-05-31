"use client";

import { DataList, DataListRow, RowAction } from "@/components/ui";
import { useState } from "react";
import { updateCategory, deleteCategory, forceDeleteCategory, mergeCategories } from "./categories.actions";

type Category = {
  id: string;
  name: string;
  kind: string | null;
};

type Props = {
  categories: Category[];
  year: string;
  referencedCategoryId?: string;
  budgetLineCount?: number;
  transactionCount?: number;
};

const KIND_ORDER = ["income", "expense", "fixed_cost", "variable_cost", "savings", null] as const;
const KIND_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  fixed_cost: "Fixed Cost",
  variable_cost: "Variable Cost",
  savings: "Savings",
};

const inputCls = "input px-2 py-1 text-xs";

// Tabs: income and expense (primary); anything else goes into "other"
type TabKey = "income" | "expense" | "other";

function getTab(kind: string | null): TabKey {
  if (kind === "income") return "income";
  if (kind === "expense" || kind === null) return "expense";
  return "other";
}

function CategoryRow({
  category,
  allCategories,
  year,
}: {
  category: Category;
  allCategories: Category[];
  year: string;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "merge">("view");
  const others = allCategories.filter((c) => c.id !== category.id);

  return (
    <DataListRow className="flex-col items-start gap-2">
      {mode === "view" && (
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
            {category.name}
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <RowAction type="button" onClick={() => setMode("rename")}>
              Rename
            </RowAction>
            {others.length > 0 && (
              <RowAction type="button" onClick={() => setMode("merge")}>
                Merge
              </RowAction>
            )}
            <form action={deleteCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="year" value={year} />
              <RowAction type="submit" danger>
                Delete
              </RowAction>
            </form>
          </div>
        </div>
      )}

      {mode === "rename" && (
        <form action={updateCategory} className="flex items-center gap-2">
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="year" value={year} />
          <input name="name" defaultValue={category.name} required className={`${inputCls} flex-1`} autoFocus />
          <RowAction type="submit">
            Save
          </RowAction>
          <RowAction type="button" onClick={() => setMode("view")}>
            Cancel
          </RowAction>
        </form>
      )}

      {mode === "merge" && (
        <form action={mergeCategories} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="sourceCategoryId" value={category.id} />
          <input type="hidden" name="year" value={year} />
          <span className="shrink-0 text-xs font-medium" style={{ color: "var(--color-text)" }}>
            {category.name}
          </span>
          <span className="shrink-0 text-xs" style={{ color: "var(--color-text-subtle)" }}>
            → merge into
          </span>
          <select name="targetCategoryId" className={`${inputCls} min-w-0 flex-1`}>
            {KIND_ORDER.map((kind) => {
              const group = others.filter((c) => c.kind === kind);
              if (group.length === 0) return null;
              const label = kind ? (KIND_LABELS[kind] ?? kind) : "Uncategorized";
              return (
                <optgroup key={kind ?? "null"} label={label}>
                  {group.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <RowAction type="submit">
            Go
          </RowAction>
          <RowAction type="button" onClick={() => setMode("view")}>
            Cancel
          </RowAction>
        </form>
      )}
    </DataListRow>
  );
}

export function CategoryTabs({
  categories,
  year,
  referencedCategoryId,
  budgetLineCount = 0,
  transactionCount = 0,
}: Props) {
  const hasOther = categories.some((c) => getTab(c.kind) === "other");
  const [activeTab, setActiveTab] = useState<TabKey>("expense");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "expense", label: "Expenses" },
    { key: "income", label: "Income" },
    ...(hasOther ? [{ key: "other" as TabKey, label: "Other" }] : []),
  ];

  const referencedCategory = referencedCategoryId
    ? categories.find((c) => c.id === referencedCategoryId)
    : null;

  const visibleCategories = categories.filter((c) => getTab(c.kind) === activeTab);

  return (
    <div className="space-y-4">
      {/* Reference error banner */}
      {referencedCategory && (
        <div
          className="space-y-2 rounded-xl border p-3 text-xs"
          style={{
            backgroundColor: "var(--color-danger-subtle)",
            borderColor: "var(--color-danger)",
          }}
        >
          <p style={{ color: "var(--color-danger)" }}>
            Cannot delete <strong>{referencedCategory.name}</strong>: referenced by{" "}
            {budgetLineCount > 0 && `${budgetLineCount} budget line${budgetLineCount !== 1 ? "s" : ""}`}
            {budgetLineCount > 0 && transactionCount > 0 && " and "}
            {transactionCount > 0 && `${transactionCount} transaction${transactionCount !== 1 ? "s" : ""}`}.
            {" "}Use <strong>Merge</strong> to reassign references, or force delete to remove them.
          </p>
          <form action={forceDeleteCategory} className="inline">
            <input type="hidden" name="categoryId" value={referencedCategoryId} />
            <input type="hidden" name="year" value={year} />
            <RowAction type="submit" danger>
              Force delete — removes {budgetLineCount} budget line{budgetLineCount !== 1 ? "s" : ""}
              {transactionCount > 0 && `, uncategorises ${transactionCount} transaction${transactionCount !== 1 ? "s" : ""}`}
            </RowAction>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category list */}
      {visibleCategories.length === 0 ? (
        <p className="py-2 text-xs" style={{ color: "var(--color-text-subtle)" }}>
          No {tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} categories yet.
        </p>
      ) : (
        <DataList
          header={
            <>
              <span className="flex-1">Name</span>
              <span className="shrink-0 text-right">Actions</span>
            </>
          }
        >
          {visibleCategories.map((cat) => (
            <CategoryRow key={cat.id} category={cat} allCategories={categories} year={year} />
          ))}
        </DataList>
      )}
    </div>
  );
}
