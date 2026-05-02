import { redirect } from "next/navigation";
import { AuthService } from "@/lib/auth-service";
import { fetchPortfolioData } from "@/lib/portfolio-computations";
import { formatCurrency } from "../planning/currency-format";
import { PortfolioPositions } from "./portfolio-positions";
import { createPosition } from "./portfolio.actions";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function PortfolioPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);
  if (!Number.isInteger(year)) redirect("/app");

  const user = await AuthService.getCurrentUser();

  try {
    const portfolio = await fetchPortfolioData(user.id, year);

    const allCurrencies = Array.from(
      new Set([
        ...Object.keys(portfolio.totalValueByCurrency),
        ...Object.keys(portfolio.yearStartValueByCurrency),
      ])
    ).sort();

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Portfolio
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Investment positions, pension accounts, and crypto — tracked by market value.
          </p>
        </header>

        {/* Summary totals by currency */}
        {allCurrencies.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allCurrencies.map((currency) => {
              const latest    = portfolio.totalValueByCurrency[currency] ?? 0;
              const yearStart = portfolio.yearStartValueByCurrency[currency] ?? 0;
              const ret       = portfolio.totalReturnByCurrency[currency] ?? 0;
              const retPct    = yearStart !== 0 ? (ret / yearStart) * 100 : null;
              return (
                <div
                  key={currency}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                    {currency} Total
                  </p>
                  <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(latest, currency)}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-zinc-400 dark:text-zinc-500">
                      from {formatCurrency(yearStart, currency)}
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        ret >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
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

        {/* Position cards grouped by kind */}
        {portfolio.positions.length > 0 ? (
          <PortfolioPositions byKind={portfolio.byKind} year={year} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No positions yet. Add your first one below.
          </p>
        )}

        {/* Add new position */}
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
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
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Name
              </label>
              <input
                name="name"
                required
                placeholder="e.g. Neon Invest"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Currency
              </label>
              <input
                name="currencyCode"
                required
                placeholder="CHF"
                maxLength={3}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs uppercase dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Kind
              </label>
              <select
                name="kind"
                required
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              >
                <option value="invest">Investment</option>
                <option value="pension">Pension</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Institution (optional)
              </label>
              <input
                name="institution"
                placeholder="e.g. Neon, UBS"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
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
