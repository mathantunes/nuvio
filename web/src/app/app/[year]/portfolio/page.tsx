import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import { fetchPortfolioData } from "@/lib/portfolio-computations";
import { formatCurrency } from "../planning/currency-format";
import { PortfolioPositions } from "./portfolio-positions";
import { createPosition } from "./portfolio.actions";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type Props = {
  params: Promise<{ year: string }>;
};

const cardStyle = {
  backgroundColor: "var(--color-surface)",
  borderColor: "var(--color-border)",
};

export default async function PortfolioPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);
  if (!Number.isInteger(year)) redirect("/app");

  const user = await AuthService.getCurrentUser();

  try {
    const [portfolio, userAccounts] = await Promise.all([
      fetchPortfolioData(user.id, year),
      db
        .select({ id: accounts.id, name: accounts.name, currencyCode: accounts.currencyCode })
        .from(accounts)
        .where(and(eq(accounts.userId, user.id), eq(accounts.isActive, true))),
    ]);

    const allCurrencies = Array.from(
      new Set([
        ...Object.keys(portfolio.totalValueByCurrency),
        ...Object.keys(portfolio.yearStartValueByCurrency),
      ])
    ).sort();

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            Portfolio
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Investment positions, pension accounts, and crypto — tracked by market value.
          </p>
        </header>

        {allCurrencies.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ alignItems: "start" }}>
            {allCurrencies.map((currency) => {
              const latest = portfolio.totalValueByCurrency[currency] ?? 0;
              const yearStart = portfolio.yearStartValueByCurrency[currency] ?? 0;
              const ret = portfolio.totalReturnByCurrency[currency] ?? 0;
              const retPct = yearStart !== 0 ? (ret / yearStart) * 100 : null;
              return (
                <div key={currency} className="card">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}>
                    {currency} Total
                  </p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                    {formatCurrency(latest, currency)}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span style={{ color: "var(--color-text-subtle)" }}>
                      from {formatCurrency(yearStart, currency)}
                    </span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{ color: ret >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                    >
                      {ret >= 0 ? "+" : ""}
                      {formatCurrency(ret, currency)}
                      {retPct !== null && ` (${retPct >= 0 ? "+" : ""}${retPct.toFixed(1)}%)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {portfolio.positions.length > 0 ? (
          <PortfolioPositions byKind={portfolio.byKind} year={year} accounts={userAccounts} />
        ) : (
          <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
            No positions yet. Add your first one below.
          </p>
        )}

        <div className="rounded-xl border border-dashed p-4" style={cardStyle}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Add position
          </h2>
          <form
            action={async (fd: FormData) => {
              "use server";
              fd.set("year", yearString);
              await createPosition(fd);
            }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                Name
              </label>
              <input name="name" required placeholder="e.g. Neon Invest" className="input" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                Currency
              </label>
              <input
                name="currencyCode"
                required
                placeholder="CHF"
                maxLength={3}
                className="input"
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                Kind
              </label>
              <select name="kind" required className="input">
                <option value="invest">Investment</option>
                <option value="pension">Pension</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                Institution (optional)
              </label>
              <input name="institution" placeholder="e.g. Neon, UBS" className="input" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" className="btn-primary">
                Add position
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  } catch {
    redirect("/app");
  }
}
