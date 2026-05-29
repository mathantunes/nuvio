import { Card } from "@/components/ui";
import { db } from "@/db/client";
import { budgets, categories } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CategoryTabs } from "./category-tabs";
import { createCategory } from "./categories.actions";
import { getOnboardingCounts } from "@/lib/onboarding";

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

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, numericYear), eq(budgets.userId, user.id)),
  });

  const [allCategories, { budgetLineCount }] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, user.id)).orderBy(categories.name),
    getOnboardingCounts(user.id, budget?.id ?? null),
  ]);

  const showPlanningTip = budgetLineCount === 0;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Categories
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Manage your budget categories. Create new ones, rename them, merge duplicates, or delete
          unused ones. Categories are shared across all budget years.
        </p>
      </header>

      <Card>
        {allCategories.length === 0 && (
          <div className="mb-4 rounded-lg p-4 space-y-2" style={{ backgroundColor: "var(--color-bg)", border: "1px dashed var(--color-border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              No categories yet
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Categories group your income and expenses — things like <em>Rent</em>, <em>Groceries</em>, or <em>Salary</em>. Create a few to get started, then head to{" "}
              <Link href={`/app/${yearString}/planning`} className="underline hover:opacity-70" style={{ color: "var(--color-brand)" }}>Planning</Link>
              {" "}to set monthly amounts.
            </p>
          </div>
        )}
        {showPlanningTip && allCategories.length > 0 && (
          <div className="mb-4 rounded-lg p-4 space-y-1" style={{ backgroundColor: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Great start! Now head to{" "}
              <Link href={`/app/${yearString}/planning`} className="font-medium underline hover:opacity-70" style={{ color: "var(--color-brand)" }}>Planning</Link>
              {" "}to set monthly amounts for each category.
            </p>
          </div>
        )}
        {allCategories.length > 0 && (
          <div className="mb-6">
            <CategoryTabs
              categories={allCategories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
              year={yearString}
              referencedCategoryId={sp.error === "referenced" ? sp.categoryId : undefined}
              budgetLineCount={Number(sp.budgetLines ?? 0)}
              transactionCount={Number(sp.transactions ?? 0)}
            />
          </div>
        )}

        {sp.error === "duplicate" && (
          <p className="mb-2 text-xs" style={{ color: "var(--color-danger)" }}>
            A category named &ldquo;{sp.name}&rdquo; already exists.
          </p>
        )}
        <form action={createCategory} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="year" value={yearString} />
          <div>
            <label className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
              Name
            </label>
            <input type="text" name="name" required maxLength={120} className="input mt-0.5 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
              Kind
            </label>
            <select name="kind" required className="input mt-0.5 px-2 py-1.5 text-sm">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <button type="submit" className="btn-primary text-xs">
            Create
          </button>
        </form>
      </Card>
    </div>
  );
}
