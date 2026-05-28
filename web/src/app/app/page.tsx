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
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-3xl space-y-6 rounded-2xl p-8 text-left shadow-sm"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <header className="space-y-2">
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--color-text-subtle)" }}
          >
            {messages.common.appName}
          </p>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
            {messages.app.budgetsListTitle}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {messages.app.budgetsListSubtitle}
          </p>
        </header>

        <section className="space-y-4">
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
            }}
          >
            {userBudgets.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {messages.app.budgetsEmptyState}
              </p>
            ) : (
              <ul className="text-sm">
                {userBudgets.map((budget, index) => (
                  <li
                    key={budget.id}
                    className="py-2"
                    style={index > 0 ? { borderTop: "1px solid var(--color-border)" } : undefined}
                  >
                    <Link
                      href={`/app/${budget.year}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 transition-opacity hover:opacity-80"
                    >
                      <span style={{ color: "var(--color-text)" }}>{budget.year}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                        Open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            className="rounded-xl border border-dashed p-4"
            style={{
              backgroundColor: "var(--color-bg)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {messages.app.budgetsCreateLabel}
                </h2>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
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
