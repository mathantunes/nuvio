import { Card } from "@/components/ui";
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
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Categories
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Manage your budget categories. Create new ones, rename them, merge duplicates, or delete
          unused ones. Categories are shared across all budget years.
        </p>
      </header>

      <Card>
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
