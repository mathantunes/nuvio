import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import { fetchLoanData } from "@/lib/loan-computations";
import { db } from "@/db/client";
import { accounts, assets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { LoanList } from "./loan-list";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function LoansPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);
  if (!Number.isInteger(year)) redirect("/app");

  const user = await AuthService.getCurrentUser();

  const [loanData, userAccounts, userAssets] = await Promise.all([
    fetchLoanData(user.id, year),
    db
      .select({
        id: accounts.id,
        name: accounts.name,
        currencyCode: accounts.currencyCode,
        isActive: accounts.isActive,
      })
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), eq(accounts.isActive, true))),
    db
      .select({
        id: assets.id,
        name: assets.name,
        kind: assets.kind,
        currencyCode: assets.currencyCode,
      })
      .from(assets)
      .where(and(eq(assets.userId, user.id), eq(assets.isActive, true))),
  ]);

  const allCurrencies = Array.from(
    new Set([
      ...Object.keys(loanData.outstandingBalanceByCurrency),
      ...Object.keys(loanData.assetValueByCurrency),
    ])
  ).sort();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Loans &amp; Mortgages
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Simulate, track, and manage your loans. Monitor outstanding balances and
          linked asset equity.
        </p>
      </header>

      {/* Currency summary cards */}
      {allCurrencies.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allCurrencies.map((currency) => {
            const outstanding = loanData.outstandingBalanceByCurrency[currency] ?? 0;
            const assetValue = loanData.assetValueByCurrency[currency] ?? 0;
            const equity = assetValue - outstanding;
            return (
              <div key={currency} className="card p-4">
                <p
                  className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-text-subtle)" }}
                >
                  {currency} Debt Overview
                </p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--color-danger)" }}>
                  −
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(outstanding)}
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                  outstanding balance
                </p>
                {assetValue > 0 && (
                  <div
                    className="mt-2 flex items-center justify-between border-t pt-2 text-xs"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span style={{ color: "var(--color-text-subtle)" }}>Asset value</span>
                    <span className="font-medium tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(assetValue)}
                    </span>
                  </div>
                )}
                {assetValue > 0 && (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span style={{ color: "var(--color-text-subtle)" }}>Equity</span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{
                        color: equity >= 0 ? "var(--color-success)" : "var(--color-danger)",
                      }}
                    >
                      {equity >= 0 ? "+" : ""}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(equity)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <LoanList loanData={loanData} accounts={userAccounts} availableAssets={userAssets} year={year} />
    </div>
  );
}
