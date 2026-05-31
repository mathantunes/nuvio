import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { budgets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getMessages } from "@/i18n";
import { AuthService } from "@/lib/auth-service";
import { LayoutContent } from "./layout-content";
import { ThemeToggle } from "@/app/theme-toggle";

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
    where: and(eq(budgets.year, numericYear), eq(budgets.userId, user.id)),
  });

  if (!budget) {
    redirect("/app");
  }

  const messages = getMessages("en");

  return (
    <main
      className="flex h-screen text-left"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <aside
        className="hidden w-52 shrink-0 sm:flex flex-col"
        style={{ padding: "0.75rem 0 0.75rem 0.75rem" }}
      >
        <div
          className="flex flex-col flex-1 overflow-y-auto scrollbar-hide px-4 py-4 text-sm"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "0.75rem",
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)",
          }}
        >
        <div className="mb-4 space-y-2">
          <Image src="/logo.png" alt="Nuvio" width={352} height={116} className="logo" style={{ width: "auto", height: "28px", objectFit: "contain", objectPosition: "left" }} />
          <Link
            href="/app"
            className="flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--color-brand)" }}
          >
            {budget.year}
            <span className="text-[10px] font-normal" style={{ color: "var(--color-text-subtle)" }}>↗</span>
          </Link>
        </div>
        <nav className="space-y-3 text-sm">
          <div className="space-y-1">
            <Link
              href={`/app/${budget.year}`}
              className="nav-link rounded-md px-2 py-1 font-normal"
            >
              Dashboard
            </Link>
          </div>
          <div>
            <p className="nav-section-label">Plan</p>
            <div className="space-y-1">
              <Link href={`/app/${budget.year}/planning`} className="nav-link rounded-md px-2 py-1 font-normal">
                Planning
              </Link>
              <Link href={`/app/${budget.year}/savings`} className="nav-link rounded-md px-2 py-1 font-normal">
                Savings
              </Link>
            </div>
          </div>
          <div>
            <p className="nav-section-label">Track</p>
            <div className="space-y-1">
              <Link href={`/app/${budget.year}/tracking`} className="nav-link rounded-md px-2 py-1 font-normal">
                Tracking
              </Link>
              <Link href={`/app/${budget.year}/variance`} className="nav-link rounded-md px-2 py-1 font-normal">
                Budget vs Actual
              </Link>
              <Link href={`/app/${budget.year}/fx`} className="nav-link rounded-md px-2 py-1 font-normal">
                FX Transfers
              </Link>
            </div>
          </div>
          <div>
            <p className="nav-section-label">Net Worth</p>
            <div className="space-y-1">
              <Link href={`/app/${budget.year}/assets`} className="nav-link rounded-md px-2 py-1 font-normal">
                Assets
              </Link>
              <Link href={`/app/${budget.year}/loans`} className="nav-link rounded-md px-2 py-1 font-normal">
                Loans
              </Link>
              <Link href={`/app/${budget.year}/portfolio`} className="nav-link rounded-md px-2 py-1 font-normal">
                Portfolio
              </Link>
              <Link href={`/app/${budget.year}/wealth`} className="nav-link rounded-md px-2 py-1 font-normal">
                Wealth
              </Link>
            </div>
          </div>
          <div>
            <p className="nav-section-label">Settings</p>
            <div className="space-y-1">
              <Link href={`/app/${budget.year}/accounts`} className="nav-link rounded-md px-2 py-1 font-normal">
                Accounts
              </Link>
              <Link href={`/app/${budget.year}/categories`} className="nav-link rounded-md px-2 py-1 font-normal">
                Categories
              </Link>
              <Link href="/app/settings" className="nav-link rounded-md px-2 py-1 font-normal">
                Preferences
              </Link>
            </div>
          </div>
        </nav>
        <div className="mt-auto pt-4">
          <ThemeToggle />
        </div>
        </div>
      </aside>
      <section
        className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <LayoutContent budgetYear={numericYear}>
          {children}
        </LayoutContent>
      </section>
    </main>
  );
}
