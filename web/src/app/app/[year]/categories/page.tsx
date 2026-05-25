import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CategoryTabs } from "./category-tabs";
import { createCategory } from "./categories.actions";

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{
    error?: string;
    categoryId?: string;
    budgetLines?: string;
    transactions?: string;
    name?: string;
  }>;
};

export default async function CategoriesPage({ params, searchParams }: Props) {
  const { year: yearString } = await params;
  const sp = await searchParams;
  const numericYear = Number(yearString);
  if (!Number.isInteger(numericYear)) redirect("/app");

  const user = await AuthService.getCurrentUser();

  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, user.id))
    .orderBy(categories.name);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Categories</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage your budget categories. Create new ones, rename them, merge duplicates, or delete
          unused ones. Categories are shared across all budget years.
        </p>
      </header>

      {/* Create new category */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
          New Category
        </p>
        {sp.error === "duplicate" && (
          <p className="mb-2 text-xs text-red-600 dark:text-red-400">
            A category named &ldquo;{sp.name}&rdquo; already exists.
          </p>
        )}
        <form action={createCategory} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="year" value={yearString} />
          <div>
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400">Name</label>
            <input
              type="text"
              name="name"
              required
              maxLength={120}

              className="mt-0.5 block rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400">Kind</label>
            <select
              name="kind"
              required
              className="mt-0.5 block rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <button
            type="submit"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline decoration-dotted underline-offset-2 pb-2"
          >
            Create
          </button>
        </form>
      </div>

      {allCategories.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <CategoryTabs
            categories={allCategories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
            year={yearString}
            referencedCategoryId={sp.error === "referenced" ? sp.categoryId : undefined}
            budgetLineCount={Number(sp.budgetLines ?? 0)}
            transactionCount={Number(sp.transactions ?? 0)}
          />
        </div>
      )}
    </div>
  );
}
