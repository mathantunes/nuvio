import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { budgets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMessages } from "@/i18n";
import { AuthService } from "@/lib/auth-service";
import { LayoutContent } from "./layout-content";

type Props = {
  children: React.ReactNode;
  params: Promise<{ year: string }>;
};

export default async function BudgetYearLayout({ children, params }: Props) {
  const { year: yearString } = await params;
  const numericYear = Number(yearString);
  if (!Number.isInteger(numericYear)) {
    redirect("/app");
  }

  const user = await AuthService.getCurrentUser();

  const budget = await db.query.budgets.findFirst({
    where: eq(budgets.year, numericYear),
  });

  if (!budget || budget.userId !== user.id) {
    redirect("/app");
  }

  const messages = getMessages("en");

  return (
    <main className="flex h-screen bg-zinc-50 text-left dark:bg-black">
      <aside className="hidden w-48 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:block">
        <div className="mb-6 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {messages.common.appName}
          </p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Budget {budget.year}
          </p>
        </div>
        <nav className="space-y-4 text-sm">
          <div>
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
              Core
            </p>
            <div className="space-y-1">
              <Link
                href={`/app/${budget.year}`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Dashboard
              </Link>
              <Link
                href={`/app/${budget.year}/accounts`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Accounts
              </Link>
              <Link
                href={`/app/${budget.year}/fx`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                FX Transfers
              </Link>
            </div>
          </div>
          <div>
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
              Planning
            </p>
            <div className="space-y-1">
              <Link
                href={`/app/${budget.year}/savings`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Savings
              </Link>
              <Link
                href={`/app/${budget.year}/planning`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Planning
              </Link>
            </div>
          </div>
          <div>
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
              Follow Up
            </p>
            <div className="space-y-1">
              <Link
                href={`/app/${budget.year}/variance`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Budget vs Actual
              </Link>
              <Link
                href={`/app/${budget.year}/portfolio`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Portfolio
              </Link>
              <Link
                href={`/app/${budget.year}/tracking`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Tracking
              </Link>
              <Link
                href={`/app/${budget.year}/loans`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Loans
              </Link>
              <Link
                href={`/app/${budget.year}/wealth`}
                className="block rounded-md px-2 py-1 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Wealth
              </Link>
            </div>
          </div>
        </nav>
      </aside>
      <section className="flex flex-1 flex-col overflow-y-auto bg-zinc-50 px-4 py-8 dark:bg-black sm:px-8">
        <LayoutContent budgetYear={numericYear}>
          <div className="mb-4 hidden sm:flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/app" className="hover:underline">
              ← All budgets
            </Link>
            <span>Year {budget.year}</span>
          </div>
          {children}
        </LayoutContent>
      </section>
    </main>
  );
}

