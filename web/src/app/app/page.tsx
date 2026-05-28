import { AuthService } from "@/lib/auth-service";
import { getMessages } from "@/i18n";
import { db } from "@/db/client";
import { budgets } from "@/db/schema";
import { CreateYearTrackerForm } from "./budgets-form";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

export default async function AppHomePage() {
  const messages = getMessages("en");
  const user = await AuthService.getCurrentUser();

  const userBudgets = await db
    .select()
    .from(budgets)
    .where(eq(budgets.userId, user.id))
    .orderBy(desc(budgets.year));

  const currentYear = new Date().getFullYear();
  const isFirstTime = userBudgets.length === 0;

  if (isFirstTime) {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div
          className="w-full max-w-md space-y-8 rounded-2xl p-8 text-left shadow-sm"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <header className="space-y-4">
            <Image
              src="/logo.png"
              alt="Nuvio"
              width={352}
              height={116}
              style={{ width: "auto", height: "32px", objectFit: "contain", objectPosition: "left" }}
            />
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
                👋 Welcome to Nuvio
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Let&apos;s set up your first year tracker. You&apos;ll plan your budget, log transactions, and see how your finances hold up — all in one place.
              </p>
            </div>
          </header>

          <section
            className="rounded-xl p-5 space-y-4"
            style={{ backgroundColor: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: "var(--color-brand)", color: "#fff" }}
              >
                1
              </span>
              <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                Create your first year tracker
              </span>
            </div>
            <p className="text-xs pl-9" style={{ color: "var(--color-text-muted)" }}>
              Pick a year to get started. You can always add past or future years later.
            </p>
            <div className="pl-9">
              <CreateYearTrackerForm currentYear={currentYear} showCurrencyField />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-md space-y-6 rounded-2xl p-8 text-left shadow-sm"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <header className="space-y-3">
          <Image
            src="/logo.png"
            alt="Nuvio"
            width={352}
            height={116}
            style={{ width: "auto", height: "32px", objectFit: "contain", objectPosition: "left" }}
          />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
              {messages.app.budgetsListTitle}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Each year tracker holds your planned budget, logged transactions, and a full picture of how your finances performed that year. Pick a year to dive in, or add a new one below.
            </p>
          </div>
        </header>

        <ul className="space-y-1">
          {userBudgets.map((budget) => (
            <li key={budget.id}>
              <Link
                href={`/app/${budget.year}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
              >
                <span className="font-medium" style={{ color: "var(--color-text)" }}>{budget.year}</span>
                <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Open →</span>
              </Link>
            </li>
          ))}
        </ul>

        <details className="group">
          <summary
            className="cursor-pointer select-none list-none text-xs font-medium"
            style={{ color: "var(--color-brand)" }}
          >
            + Add another year
          </summary>
          <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
            <CreateYearTrackerForm currentYear={currentYear} />
          </div>
        </details>

        <div className="pt-2 text-center">
          <Link href="/app/settings" className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
            ⚙ Preferences
          </Link>
        </div>
      </div>
    </main>
  );
}
