import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import {
  fetchDashboardData,
  calculateSavingsData,
  getYtdTotals,
  type CurrencyTotals,
} from "@/lib/dashboard-computations";
import { fetchPortfolioData } from "@/lib/portfolio-computations";
import { fetchLoanData } from "@/lib/loan-computations";
import { Card, CardHeader, CardTitle, Table, Thead, Tbody, Tfoot, Th, Td, Tr } from "@/components/ui";
import { formatCurrency } from "./planning/currency-format";
import { db } from "@/db/client";
import { categories, budgetLines, transactions, budgets, accounts } from "@/db/schema";
import { eq, count, inArray, and } from "drizzle-orm";
import Link from "next/link";

export default async function BudgetDashboardPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  const user = await AuthService.getCurrentUser();

  try {
    const budget = await db.query.budgets.findFirst({
      where: and(eq(budgets.year, year), eq(budgets.userId, user.id)),
    });

    const [[categoryCount], [budgetLineCount], [accountCount], [transactionCount]] = await Promise.all([
      db.select({ count: count() }).from(categories).where(eq(categories.userId, user.id)),
      budget
        ? db.select({ count: count() }).from(budgetLines).where(eq(budgetLines.budgetId, budget.id))
        : Promise.resolve([{ count: 0 }]),
      db.select({ count: count() }).from(accounts).where(eq(accounts.userId, user.id)),
      db.select({ count: count() }).from(transactions).where(eq(transactions.userId, user.id)),
    ]);

    const onboardingSteps = [
      { label: "Add spending categories", done: categoryCount.count > 0, href: `/app/${year}/categories` },
      { label: "Plan a budget line", done: budgetLineCount.count > 0, href: `/app/${year}/planning` },
      { label: "Set up an account", done: accountCount.count > 0, href: `/app/${year}/accounts` },
      { label: "Log your first transaction", done: transactionCount.count > 0, href: `/app/${year}/tracking` },
    ];
    const onboardingDone = onboardingSteps.every((s) => s.done);

    const [data, portfolio, loanData] = await Promise.all([
      fetchDashboardData(year, user.id),
      fetchPortfolioData(user.id, year),
      fetchLoanData(user.id, year),
    ]);
    const ytdTotals = getYtdTotals(data);

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {year} overview
          </p>
        </header>

        {/* Getting started checklist — shown inside the year until all done */}
        {!onboardingDone && (
          <section
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--color-brand)" }}>
              Getting started
            </span>
            <ul className="space-y-2 pt-1">
              {onboardingSteps.map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: step.done ? "var(--color-brand)" : "var(--color-surface)",
                      color: step.done ? "#fff" : "var(--color-text-muted)",
                      border: step.done ? "none" : "1px solid var(--color-border)",
                    }}
                  >
                    {step.done ? "✓" : i + 2}
                  </span>
                  {step.done ? (
                    <span className="text-sm line-through" style={{ color: "var(--color-text-muted)" }}>
                      {step.label}
                    </span>
                  ) : (
                    <Link href={step.href} className="text-sm hover:underline" style={{ color: "var(--color-text)" }}>
                      {step.label} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <MultiCurrencyCard
            label="Income"
            ytdPlanned={ytdTotals.income.planned}
            ytdActual={ytdTotals.income.actual}
            positiveWhenActualHigher
          />
          <MultiCurrencyCard
            label="Expenses"
            ytdPlanned={ytdTotals.expenses.planned}
            ytdActual={ytdTotals.expenses.actual}
            positiveWhenActualHigher={false}
          />
        </div>

        <Card>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Year at a Glance
          </h2>
          <div className="overflow-x-auto">
            <div style={{ minWidth: "640px" }}>
              {/* Month headers */}
              <div className="grid grid-cols-12 gap-px mb-1">
                {data.monthlyData.map((m) => {
                  const isCurrent = m.month - 1 === data.currentMonthIdx;
                  return (
                    <div
                      key={m.month}
                      className="px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wider rounded"
                      style={{
                        color: isCurrent ? "var(--color-brand)" : "var(--color-text-subtle)",
                        backgroundColor: isCurrent ? "var(--color-brand-subtle)" : "transparent",
                      }}
                    >
                      {m.name.slice(0, 3)}
                    </div>
                  );
                })}
              </div>

              {/* Income row */}
              <div className="mb-1">
                <div className="grid grid-cols-12 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                  {data.monthlyData.map((m) => {
                    const isFuture = m.month - 1 > data.currentMonthIdx;
                    const currencies = Object.keys(m.plannedIncome);
                    return (
                      <div
                        key={m.month}
                        className="px-1.5 py-2 text-[10px] tabular-nums"
                        style={{ backgroundColor: "var(--color-surface)", opacity: isFuture ? 0.4 : 1 }}
                      >
                        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>Inc</div>
                        {currencies.length === 0 ? <span style={{ color: "var(--color-text-subtle)" }}>—</span> : currencies.map((cur) => {
                          const actual = m.actualIncome[cur] ?? 0;
                          const planned = m.plannedIncome[cur] as number ?? 0;
                          const ok = actual >= planned;
                          return (
                           <div key={cur} className="truncate" style={{ color: ok ? "var(--color-text)" : "var(--color-off-track)" }}>
                              {formatCurrency(actual, cur)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expenses row */}
              <div>
                <div className="grid grid-cols-12 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                  {data.monthlyData.map((m) => {
                    const isFuture = m.month - 1 > data.currentMonthIdx;
                    const currencies = Object.keys(m.plannedExpenses);
                    return (
                      <div
                        key={m.month}
                        className="px-1.5 py-2 text-[10px] tabular-nums"
                        style={{ backgroundColor: "var(--color-surface)", opacity: isFuture ? 0.4 : 1 }}
                      >
                        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>Exp</div>
                        {currencies.length === 0 ? <span style={{ color: "var(--color-text-subtle)" }}>—</span> : currencies.map((cur) => {
                          const actual = m.actualExpenses[cur] ?? 0;
                          const planned = m.plannedExpenses[cur] as number ?? 0;
                          const ok = actual <= planned;
                          return (
                           <div key={cur} className="truncate" style={{ color: ok ? "var(--color-text)" : "var(--color-off-track)" }}>
                              {formatCurrency(actual, cur)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Net Worth Movement
              </p>
              <a
                href={`/app/${year}/savings`}
                className="text-xs underline transition-opacity hover:opacity-80"
                style={{ color: "var(--color-text-muted)" }}
              >
                Details →
              </a>
            </CardHeader>
            {data.allSavingsLines.length > 0 ? (
              <div className="space-y-1">
                {data.allSavingsLines.map(({ currencyCode, amount }) => {
                  const savingsData = calculateSavingsData(
                    currencyCode!,
                    amount,
                    data.yearNetActual,
                    data.transferImpacts,
                    data.instrumentTransferImpacts,
                  );
                  const netChange = savingsData.finalBalance - savingsData.startingBalance;
                  const isUp = netChange >= 0;

                  return (
                    <details key={currencyCode} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--color-surface-raised)]">
                        <div className="flex items-center gap-2 tabular-nums text-sm">
                          <span style={{ color: "var(--color-text-subtle)" }} className="text-[10px] font-semibold uppercase tracking-wider w-8">{currencyCode}</span>
                          <span className="hidden sm:inline" style={{ color: "var(--color-text)" }}>{formatCurrency(savingsData.startingBalance, currencyCode!)}</span>
                          <span className="hidden sm:inline" style={{ color: "var(--color-text-subtle)" }}>→</span>
                          <span className="font-semibold" style={{ color: isUp ? "var(--color-success)" : "var(--color-danger)" }}>
                            {formatCurrency(savingsData.finalBalance, currencyCode!)}
                          </span>
                        </div>
                        <span className="text-xs font-medium tabular-nums" style={{ color: isUp ? "var(--color-success)" : "var(--color-danger)" }}>
                          {isUp ? "+" : ""}{formatCurrency(netChange, currencyCode!)}
                        </span>
                      </summary>
                      <div className="mt-1 space-y-1 px-3 pb-2 pt-1" style={{ borderTop: "1px dashed var(--color-border)" }}>
                        {[
                          { label: "Net income", value: savingsData.netIncome },
                          ...(savingsData.transferImpact !== 0 ? [{ label: "FX transfers", value: savingsData.transferImpact }] : []),
                          ...(savingsData.instrumentTransferImpact !== 0 ? [{ label: "Portfolio moves", value: savingsData.instrumentTransferImpact }] : []),
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--color-text-subtle)" }}>{label}</span>
                            <span className="tabular-nums font-medium" style={{ color: value >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                              {value > 0 ? "+" : ""}{formatCurrency(value, currencyCode!)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-subtle)" }}>
                No savings recorded.{" "}
                <a href={`/app/${year}/savings`} className="underline transition-opacity hover:opacity-80" style={{ color: "var(--color-text-muted)" }}>
                  Add →
                </a>
              </p>
            )}
          </Card>

          {portfolio.positions.length > 0 && (() => {
            const kindLabels = { invest: "Investments", pension: "Pension", crypto: "Crypto" };
            const activeKinds = (["invest", "pension", "crypto"] as const).filter(
              (k) => (portfolio.byKind[k]?.length ?? 0) > 0
            );
            const smCols = (["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3"] as const)[activeKinds.length];
            const maxCurrencies = Math.max(...activeKinds.map((k) => {
              const t: Record<string, unknown> = {};
              for (const p of portfolio.byKind[k]!) { t[p.currencyCode] = true; }
              return Object.keys(t).length;
            }));
            return (
              <div className={`grid grid-cols-1 gap-6 ${smCols}`} style={{ alignItems: "start" }}>
                {activeKinds.map((kind) => {
                  const positions = portfolio.byKind[kind]!;
                  const totals: Record<string, { value: number; gain: number }> = {};
                  for (const pos of positions) {
                    if (!totals[pos.currencyCode]) totals[pos.currencyCode] = { value: 0, gain: 0 };
                    totals[pos.currencyCode].value += pos.latestValue;
                    totals[pos.currencyCode].gain += pos.marketReturn;
                  }
                  const hasAnyGain = Object.values(totals).some((t) => t.gain !== 0);
                  const hasStale = positions.some((p) => p.isStale);
                  return (
                    <details key={kind} className="group" style={{ border: "1px solid var(--color-border)", borderRadius: "0.75rem", overflow: "hidden", backgroundColor: "var(--color-surface)" }}>
                      <summary className="flex cursor-pointer list-none flex-col gap-1.5 px-3 py-2 transition-colors hover:bg-[var(--color-surface-raised)]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                            {kindLabels[kind]}
                            {hasStale && <span className="ml-1" style={{ color: "var(--color-warning)" }}>⚠</span>}
                          </span>
                          <a href={`/app/${year}/portfolio`} className="text-xs underline transition-opacity hover:opacity-80" style={{ color: "var(--color-text-muted)" }}>
                            Manage →
                          </a>
                        </div>
                        {Object.entries(totals).map(([currency, { value, gain }]) => (
                          <div key={currency} className="flex items-center gap-3 tabular-nums text-sm">
                            <span className="w-8 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>{currency}</span>
                            <span style={{ color: "var(--color-text)" }}>{formatCurrency(value, currency)}</span>
                            {hasAnyGain && gain !== 0 && (
                              <span className="ml-auto text-xs font-medium" style={{ color: gain >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                                {gain >= 0 ? "+" : ""}{formatCurrency(gain, currency)}
                              </span>
                            )}
                          </div>
                        ))}
                        {Array.from({ length: maxCurrencies - Object.keys(totals).length }).map((_, i) => (
                          <div key={`pad-${i}`} className="flex items-center gap-3 text-sm opacity-0 select-none" aria-hidden>
                            <span className="w-8">—</span><span>—</span>
                          </div>
                        ))}
                      </summary>
                        <div className="space-y-0.5 px-3 py-2" style={{ borderTop: "1px dashed var(--color-border)" }}>
                        {positions.map((pos) => (
                          <div key={pos.id} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--color-text-muted)" }}>
                              {pos.name}
                              {pos.isStale && <span className="ml-1" style={{ color: "var(--color-warning)" }}>⚠</span>}
                            </span>
                            <div className="flex items-center gap-1.5 tabular-nums">
                              <span style={{ color: "var(--color-text)" }}>
                                {pos.latestValue > 0 ? formatCurrency(pos.latestValue, pos.currencyCode) : "—"}
                              </span>
                              {pos.marketReturn !== 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: pos.marketReturn >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                                  {pos.marketReturn >= 0 ? "+" : ""}{formatCurrency(pos.marketReturn, pos.currencyCode)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        </div>
                    </details>
                  );
                })}
              </div>
            );
          })()}

          {loanData.loans.filter((l) => l.status === "active").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-medium normal-case tracking-normal">
                  Loans & Assets
                </CardTitle>
                <a
                  href={`/app/${year}/loans`}
                  className="text-xs underline transition-opacity hover:opacity-80"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Manage →
                </a>
              </CardHeader>
              <div className="space-y-2">
                {loanData.loans.filter((l) => l.status === "active").map((loan) => {
                  const equity = loan.asset
                    ? loan.asset.currentValue - loan.outstandingBalance
                    : null;
                  return (
                    <div key={loan.id} className="text-xs">
                      <div className="flex items-center justify-between py-0.5">
                        <span className="font-medium" style={{ color: "var(--color-text-muted)" }}>
                          {loan.name}
                        </span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span style={{ color: "var(--color-danger)" }}>
                            −{formatCurrency(loan.outstandingBalance, loan.currencyCode)}
                          </span>
                          {equity !== null && (
                            <span
                              className="text-[10px] font-semibold"
                              style={{
                                color:
                                  equity >= 0
                                    ? "var(--color-success)"
                                    : "var(--color-danger)",
                              }}
                            >
                              equity {equity >= 0 ? "+" : ""}
                              {formatCurrency(equity, loan.currencyCode)}
                            </span>
                          )}
                        </div>
                      </div>
                      {loan.asset && (
                        <div
                          className="flex items-center justify-between py-0.5 pl-2"
                          style={{ color: "var(--color-text-subtle)" }}
                        >
                          <span>{loan.asset.name}</span>
                          <span className="tabular-nums" style={{ color: "var(--color-success)" }}>
                            {formatCurrency(loan.asset.currentValue, loan.asset.currencyCode)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  } catch (error) {
    // Only redirect for "Budget not found" — surface other errors in logs
    if (error instanceof Error && error.message === "Budget not found") {
      redirect("/app");
    }
    console.error("[nuvio] Dashboard error:", error);
    throw error;
  }
}

function MultiCurrencyCard({
  label,
  ytdPlanned,
  ytdActual,
  positiveWhenActualHigher,
}: {
  label: string;
  ytdPlanned: CurrencyTotals;
  ytdActual: CurrencyTotals;
  positiveWhenActualHigher: boolean;
}) {
  const allCurrencies = Array.from(new Set([...Object.keys(ytdPlanned), ...Object.keys(ytdActual)])).sort();

  return (
    <Card>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
        {label} · YTD
      </p>
      {allCurrencies.length > 0 ? (
        <div>
          {allCurrencies.map((currency, index) => {
            const planned = ytdPlanned[currency] ?? 0;
            const actual = ytdActual[currency] ?? 0;
            const pct = planned > 0 && actual > 0 ? Math.round((actual / planned) * 100) : null;
            const isActualHigher = actual > planned;
            const actualColor =
              actual > 0
                ? positiveWhenActualHigher
                  ? actual >= planned && planned > 0
                    ? "var(--color-on-track)"
                    : "var(--color-text)"
                  : actual > planned && planned > 0
                    ? "var(--color-off-track)"
                    : "var(--color-text)"
                : "var(--color-text-subtle)";

            return (
              <div
                key={currency}
                className="py-2 first:pt-0 last:pb-0"
                style={index > 0 ? { borderTop: "1px solid var(--color-border)" } : undefined}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-subtle)" }}
                  >
                    {currency}
                  </span>
                  {pct !== null && (
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{
                        color: positiveWhenActualHigher
                          ? isActualHigher ? "var(--color-on-track)" : "var(--color-off-track)"
                          : isActualHigher ? "var(--color-off-track)" : "var(--color-on-track)",
                      }}
                    >
                      {isActualHigher ? "↑" : "↓"} {pct}%
                    </span>
                  )}
                </div>
                <div
                  className="mt-0.5 text-xl font-bold tabular-nums leading-tight"
                  style={{ color: actualColor }}
                >
                  {actual > 0 ? formatCurrency(actual, currency) : "—"}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                  of {planned > 0 ? formatCurrency(planned, currency) : "—"} planned
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
          No data yet.
        </p>
      )}
    </Card>
  );
}
