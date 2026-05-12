"use client";

import { useRef, useState } from "react";
import { formatCurrency } from "../planning/currency-format";
import { recordValuation, recordFlow, deleteValuation, deleteFlow } from "./portfolio.actions";
import type { PositionSummary } from "@/lib/portfolio-computations";

type Account = { id: string; name: string; currencyCode: string };

const todayISO = () => new Date().toISOString().split("T")[0];

const FLOW_KIND_LABELS: Record<string, string> = {
  deposit:    "Deposit (cash in)",
  withdrawal: "Withdrawal (cash out)",
  dividend:   "Dividend (cash paid out)",
};

function ReturnBadge({ value, pct }: { value: number; pct: number | null }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {positive ? "↑" : "↓"}
      {pct !== null ? `${Math.abs(pct).toFixed(1)}%` : "—"}
    </span>
  );
}

function PositionCard({
  position,
  year,
  accounts,
}: {
  position: PositionSummary;
  year: number;
  accounts: Account[];
}) {
  const [showValForm, setShowValForm] = useState(false);
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const valFormRef  = useRef<HTMLFormElement>(null);
  const flowFormRef = useRef<HTMLFormElement>(null);

  const hasData = position.latestValuation !== null;
  const latestDate = position.latestValuation?.asOf
    ? new Date(position.latestValuation.asOf).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : null;

  async function handleValuation(fd: FormData) {
    await recordValuation(fd);
    setShowValForm(false);
    valFormRef.current?.reset();
  }

  async function handleFlow(fd: FormData) {
    await recordFlow(fd);
    setShowFlowForm(false);
    flowFormRef.current?.reset();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {position.name}
          </p>
          {position.institution && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              {position.institution}
            </p>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
          {position.currencyCode}
        </span>
      </div>

      {/* Value row */}
      {hasData ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Latest value</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {formatCurrency(position.latestValue, position.currencyCode)}
            </p>
            {position.isStale && (
              <p className="text-[10px] text-amber-500 dark:text-amber-400">⚠ Stale — update needed</p>
            )}
            {latestDate && !position.isStale && (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">as of {latestDate}</p>
            )}
          </div>
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Year start</p>
            <p className="font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
              {formatCurrency(position.yearStartValue, position.currencyCode)}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Market return</p>
            <div className="flex items-center gap-1.5">
              <p className={`font-semibold tabular-nums ${position.marketReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {position.marketReturn >= 0 ? "+" : ""}
                {formatCurrency(position.marketReturn, position.currencyCode)}
              </p>
              <ReturnBadge value={position.marketReturn} pct={position.marketReturnPct} />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">No valuation yet. Record the current market value below.</p>
      )}

      {/* History (valuations + flows) */}
      {(position.valuationHistory.length > 0 || position.ytdFlows.length > 0) && (
        <div className="border-t border-zinc-100 dark:border-zinc-900 pt-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
          >
            {showHistory ? "Hide history" : `Show history (${position.valuationHistory.length} valuations, ${position.ytdFlows.length} flows)`}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-3">
              {/* Valuations */}
              {position.valuationHistory.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valuations</p>
                  <ul className="space-y-1">
                    {position.valuationHistory.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                          {new Date(v.asOf).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" — "}
                          <span className="font-medium">{formatCurrency(v.amount, position.currencyCode)}</span>
                          {v.notes && <span className="text-zinc-400"> · {v.notes}</span>}
                        </span>
                        <form action={deleteValuation}>
                          <input type="hidden" name="valuationId" value={v.id} />
                          <input type="hidden" name="year" value={year} />
                          <button type="submit" className="text-[11px] text-red-400 hover:text-red-600 dark:hover:text-red-300">
                            Delete
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Flows */}
              {position.ytdFlows.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Flows (YTD)</p>
                  <ul className="space-y-1">
                    {position.ytdFlows.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                          {new Date(f.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" — "}
                          <span className={`font-medium ${f.flowKind === "withdrawal" ? "text-red-500" : "text-emerald-600"}`}>
                            {f.flowKind === "withdrawal" ? "−" : "+"}{formatCurrency(f.amount, position.currencyCode)}
                          </span>
                          {" "}
                          <span className="text-zinc-400">{f.notes ?? f.flowKind}</span>
                        </span>
                        <form action={deleteFlow}>
                          <input type="hidden" name="flowId" value={f.id} />
                          <input type="hidden" name="year" value={year} />
                          <button type="submit" className="text-[11px] text-red-400 hover:text-red-600 dark:hover:text-red-300">
                            Delete
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-2">
        <button
          onClick={() => { setShowValForm((v) => !v); setShowFlowForm(false); }}
          className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 underline"
        >
          {showValForm ? "Cancel" : "Record valuation"}
        </button>
        <button
          onClick={() => { setShowFlowForm((v) => !v); setShowValForm(false); }}
          className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 underline"
        >
          {showFlowForm ? "Cancel" : "Record flow"}
        </button>
      </div>

      {/* Valuation form */}
      {showValForm && (
        <form ref={valFormRef} action={handleValuation} className="space-y-2 pt-1">
          <input type="hidden" name="positionId" value={position.id} />
          <input type="hidden" name="year" value={year} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Market value ({position.currencyCode})</label>
              <input name="amount" type="number" step="0.01" min="0" required
                placeholder="0.00"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Date</label>
              <input name="asOf" type="date" required defaultValue={todayISO()}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              />
            </div>
          </div>
          <input name="notes" type="text" placeholder="Notes (optional)"
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
          />
          <button type="submit"
            className="inline-flex items-center rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Save valuation
          </button>
        </form>
      )}

      {/* Flow form */}
      {showFlowForm && (
        <form ref={flowFormRef} action={handleFlow} className="space-y-2 pt-1">
          <input type="hidden" name="positionId" value={position.id} />
          <input type="hidden" name="year" value={year} />
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Flow type</label>
            <select name="flowKind" required
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
            >
              {Object.entries(FLOW_KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Amount ({position.currencyCode})</label>
              <input name="amount" type="number" step="0.01" min="0.01" required
                placeholder="0.00"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Date</label>
              <input name="occurredAt" type="date" required defaultValue={todayISO()}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
              />
            </div>
          </div>
          <input name="notes" type="text" placeholder="e.g. Sold Stock X, Dividend Q1"
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
          />
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              Cash account <span className="text-zinc-400">(links to wealth picture)</span>
            </label>
            <select name="accountId"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
            >
              <option value="">— not linked —</option>
              {accounts
                .filter((a) => a.currencyCode === position.currencyCode)
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </select>
          </div>
          <button type="submit"
            className="inline-flex items-center rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Save flow
          </button>
        </form>
      )}
    </div>
  );
}

export function PortfolioPositions({
  byKind,
  year,
  accounts,
}: {
  byKind: Record<string, PositionSummary[]>;
  year: number;
  accounts: Account[];
}) {
  const kindMeta: Record<string, { label: string; emoji: string }> = {
    invest:  { label: "Investments",   emoji: "📈" },
    pension: { label: "Pension",       emoji: "🏦" },
    crypto:  { label: "Crypto",        emoji: "₿"  },
  };

  return (
    <div className="space-y-6">
      {(["invest", "pension", "crypto"] as const).map((kind) => {
        const positions = byKind[kind] ?? [];
        if (positions.length === 0) return null;
        const meta = kindMeta[kind];
        return (
          <section key={kind} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              {meta.emoji} {meta.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {positions.map((pos) => (
                <PositionCard key={pos.id} position={pos} year={year} accounts={accounts} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
