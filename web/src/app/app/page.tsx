import { AuthService } from "@/lib/auth-service";
import { getMessages } from "@/i18n";
import { db } from "@/db/client";
import { budgets } from "@/db/schema";
import { BudgetsForm } from "./budgets-form";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

export default async function AppHomePage() {
  const messages = getMessages("en");
  const user = await AuthService.getCurrentUser();

  const userBudgets = await db
    .select()
    .from(budgets)
    .where(eq(budgets.userId, user.id))
    .orderBy(desc(budgets.year));

  const currentYear = new Date().getFullYear();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 text-center dark:bg-black">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
        <header className="space-y-2 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {messages.common.appName}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {messages.app.budgetsListTitle}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {messages.app.budgetsListSubtitle}
          </p>
        </header>

        <section className="space-y-4 text-left">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
            {userBudgets.length === 0 ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {messages.app.budgetsEmptyState}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                {userBudgets.map((budget) => (
                  <li key={budget.id} className="py-2">
                    <Link
                      href={`/app/${budget.year}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span className="text-zinc-900 dark:text-zinc-50">
                        {budget.year}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {messages.app.budgetsCreateLabel}
                </h2>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {messages.app.budgetsCreateHelper}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <BudgetsForm suggestedYear={currentYear} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

