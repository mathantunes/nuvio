"use client";

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

const inputCls =
  "rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50";
const actionLinkCls =
  "text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition";
const deleteLinkCls =
  "text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition";

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
    <li className="flex flex-col gap-1.5 py-2">
      {mode === "view" && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
            {category.name}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => setMode("rename")} className={actionLinkCls}>
              Rename
            </button>
            {others.length > 0 && (
              <button type="button" onClick={() => setMode("merge")} className={actionLinkCls}>
                Merge
              </button>
            )}
            <form action={deleteCategory}>
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="year" value={year} />
              <button type="submit" className={deleteLinkCls}>
                Delete
              </button>
            </form>
          </div>
        </div>
      )}

      {mode === "rename" && (
        <form action={updateCategory} className="flex items-center gap-2">
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="year" value={year} />
          <input name="name" defaultValue={category.name} required className={`${inputCls} flex-1`} autoFocus />
          <button type="submit" className={actionLinkCls}>Save</button>
          <button type="button" onClick={() => setMode("view")} className={actionLinkCls}>Cancel</button>
        </form>
      )}

      {mode === "merge" && (
        <form action={mergeCategories} className="flex items-center gap-2 flex-wrap">
          <input type="hidden" name="sourceCategoryId" value={category.id} />
          <input type="hidden" name="year" value={year} />
          <span className="text-xs text-zinc-900 dark:text-zinc-50 font-medium shrink-0">{category.name}</span>
          <span className={`${actionLinkCls} shrink-0`}>→ merge into</span>
          <select name="targetCategoryId" className={`${inputCls} flex-1 min-w-0`}>
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
          <button type="submit" className={actionLinkCls}>Go</button>
          <button type="button" onClick={() => setMode("view")} className={actionLinkCls}>Cancel</button>
        </form>
      )}
    </li>
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2 text-xs dark:border-red-900 dark:bg-red-950/30">
          <p className="text-red-700 dark:text-red-400">
            Cannot delete <strong>{referencedCategory.name}</strong>: referenced by{" "}
            {budgetLineCount > 0 && `${budgetLineCount} budget line${budgetLineCount !== 1 ? "s" : ""}`}
            {budgetLineCount > 0 && transactionCount > 0 && " and "}
            {transactionCount > 0 && `${transactionCount} transaction${transactionCount !== 1 ? "s" : ""}`}.
            {" "}Use <strong>Merge</strong> to reassign references, or force delete to remove them.
          </p>
          <form action={forceDeleteCategory} className="inline">
            <input type="hidden" name="categoryId" value={referencedCategoryId} />
            <input type="hidden" name="year" value={year} />
            <button type="submit" className={deleteLinkCls}>
              Force delete — removes {budgetLineCount} budget line{budgetLineCount !== 1 ? "s" : ""}
              {transactionCount > 0 && `, uncategorises ${transactionCount} transaction${transactionCount !== 1 ? "s" : ""}`}
            </button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category list */}
      {visibleCategories.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
          No {tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} categories yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {visibleCategories.map((cat) => (
            <CategoryRow key={cat.id} category={cat} allCategories={categories} year={year} />
          ))}
        </ul>
      )}
    </div>
  );
}
