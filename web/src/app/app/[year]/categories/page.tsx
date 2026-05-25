import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CategoryTabs } from "./category-tabs";

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{
    error?: string;
    categoryId?: string;
    budgetLines?: string;
    transactions?: string;
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
          Manage your budget categories. Rename them, merge duplicates, or delete unused ones.
          Categories are shared across all budget years.
        </p>
      </header>

      {allCategories.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No categories yet. Categories are created when you add budget lines.
          </p>
        </div>
      ) : (
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
