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
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Loans &amp; Mortgages
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              <div
                key={currency}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                  {currency} Debt Overview
                </p>
                <p className="text-xl font-bold tabular-nums text-red-500 dark:text-red-400">
                  −
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(outstanding)}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  outstanding balance
                </p>
                {assetValue > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Asset value</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
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
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-zinc-500 dark:text-zinc-400">Equity</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        equity >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
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
