import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { budgets, budgetLines, categories, profiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { PlanningTabs } from "./planning-tabs";
import { AuthService } from "@/lib/auth-service";
import { Card } from "@/components/ui";
import Link from "next/link";
import { getOnboardingCounts } from "@/lib/onboarding";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetPlanningPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  if (!Number.isInteger(year)) {
    redirect("/app");
  }

  const user = await AuthService.getCurrentUser();

  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, user.id)),
  });

  if (!budget) {
    redirect("/app");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const baseCurrency = profile?.baseCurrency ?? "USD";

  const [allBudgetLines, allCategories, { accountCount }] = await Promise.all([
    db
      .select({
        id: budgetLines.id,
        categoryId: budgetLines.categoryId,
        month: budgetLines.month,
        plannedAmount: budgetLines.plannedAmount,
        currencyCode: budgetLines.currencyCode,
        notes: budgetLines.notes,
        category: {
          id: categories.id,
          name: categories.name,
          kind: categories.kind,
        },
      })
      .from(budgetLines)
      .innerJoin(
        categories,
        and(eq(budgetLines.categoryId, categories.id), eq(categories.userId, user.id))
      )
      .where(eq(budgetLines.budgetId, budget.id))
      .orderBy(budgetLines.month),
    db
      .select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories)
      .where(eq(categories.userId, user.id))
      .orderBy(categories.name),
    getOnboardingCounts(user.id, budget.id),
  ]);

  const incomeLines = allBudgetLines.filter(
    (line) => line.category.kind === "income"
  );
  const expenseLines = allBudgetLines.filter(
    (line) => line.category.kind === "expense" || line.category.kind === null
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Planning
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Define your {year} budget: income and expenses per month. Categories are
          created automatically when you add your first budget line.
        </p>
      </header>

      <Card className="text-left">
        {allBudgetLines.length === 0 && (
          <div className="mb-4 rounded-lg p-4 space-y-1" style={{ backgroundColor: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Set your monthly budget</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Use the form below to add your first budget line — pick a category, set the amount and currency. Once you have a plan, head to{" "}
              <Link href={`/app/${year}/tracking`} className="font-medium underline hover:opacity-70" style={{ color: "var(--color-brand)" }}>Tracking</Link>
              {" "}to log real transactions against it.
            </p>
          </div>
        )}
        {allBudgetLines.length > 0 && accountCount === 0 && (
          <div className="mb-4 rounded-lg p-4 space-y-1" style={{ backgroundColor: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Next: set up an account</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Great plan! Now add an{" "}
              <Link href={`/app/${year}/accounts`} className="font-medium underline hover:opacity-70" style={{ color: "var(--color-brand)" }}>account</Link>
              {" "}— a bank account, card, or cash wallet — so you can track which account funds come in and out of when logging transactions.
            </p>
          </div>
        )}
        <PlanningTabs
          budgetId={budget.id}
          year={year}
          incomeLines={incomeLines}
          expenseLines={expenseLines}
          baseCurrency={baseCurrency}
          allCategories={allCategories}
        />
      </Card>
    </div>
  );
}
