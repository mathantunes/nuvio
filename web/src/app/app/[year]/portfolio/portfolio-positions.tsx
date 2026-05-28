"use client";

import React from "react";

import { useRef, useState } from "react";
import { formatCurrency } from "../planning/currency-format";
import { recordValuation, recordFlow, deleteValuation, deleteFlow } from "./portfolio.actions";
import { IconTrendUp, IconBank, IconCoin, IconWarning } from "@/components/icons";
import type { PositionSummary } from "@/lib/portfolio-computations";

type Account = { id: string; name: string; currencyCode: string };

const todayISO = () => new Date().toISOString().split("T")[0];

const FLOW_KIND_LABELS: Record<string, string> = {
  deposit: "Deposit (cash in)",
  withdrawal: "Withdrawal (cash out)",
  dividend: "Dividend (cash paid out)",
};

const cardStyle = {
  backgroundColor: "var(--color-surface)",
  borderColor: "var(--color-border)",
};

function ReturnBadge({ value, pct }: { value: number; pct: number | null }) {
  const positive = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums"
      style={{ color: positive ? "var(--color-success)" : "var(--color-danger)" }}
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
  const valFormRef = useRef<HTMLFormElement>(null);
  const flowFormRef = useRef<HTMLFormElement>(null);

  const hasData = position.latestValuation !== null;
  const latestDate = position.latestValuation?.asOf
    ? new Date(position.latestValuation.asOf).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
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
    <div className="flex h-full flex-col rounded-xl border p-4" style={{ ...cardStyle, gap: "0.75rem" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {position.name}
          </p>
          <p className="text-[11px]" style={{ color: "var(--color-text-subtle)", visibility: position.institution ? "visible" : "hidden" }}>
            {position.institution ?? "\u00A0"}
          </p>
        </div>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}>
          {position.currencyCode}
        </span>
      </div>

      {hasData ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p style={{ color: "var(--color-text-muted)" }}>Latest value</p>
            <p className="tabular-nums font-semibold" style={{ color: "var(--color-text)" }}>
              {formatCurrency(position.latestValue, position.currencyCode)}
            </p>
            {position.isStale && (
              <p className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-warning)" }}><IconWarning size={11} /> Stale — update needed</p>
            )}
            {latestDate && !position.isStale && (
              <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>as of {latestDate}</p>
            )}
          </div>
          <div>
            <p style={{ color: "var(--color-text-muted)" }}>Year start</p>
            <p className="tabular-nums font-medium" style={{ color: "var(--color-text-muted)" }}>
              {formatCurrency(position.yearStartValue, position.currencyCode)}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--color-text-muted)" }}>Market return</p>
            <div className="flex items-center gap-1.5">
              <p
                className="font-semibold tabular-nums"
                style={{ color: position.marketReturn >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
              >
                {position.marketReturn >= 0 ? "+" : ""}
                {formatCurrency(position.marketReturn, position.currencyCode)}
              </p>
              <ReturnBadge value={position.marketReturn} pct={position.marketReturnPct} />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
          No valuation yet. Record the current market value below.
        </p>
      )}

      {(position.valuationHistory.length > 0 || position.ytdFlows.length > 0) && (
        <div className="border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-[11px] underline"
            style={{ color: "var(--color-text-muted)" }}
          >
            {showHistory ? "Hide history" : `Show history (${position.valuationHistory.length} valuations, ${position.ytdFlows.length} flows)`}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-3">
              {position.valuationHistory.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>Valuations</p>
                  <ul className="space-y-1">
                    {position.valuationHistory.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(v.asOf).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" — "}
                          <span className="font-medium" style={{ color: "var(--color-text)" }}>
                            {formatCurrency(v.amount, position.currencyCode)}
                          </span>
                          {v.notes && <span style={{ color: "var(--color-text-subtle)" }}> · {v.notes}</span>}
                        </span>
                        <form action={deleteValuation}>
                          <input type="hidden" name="valuationId" value={v.id} />
                          <input type="hidden" name="year" value={year} />
                          <button type="submit" className="text-[11px]" style={{ color: "var(--color-danger)" }}>
                            Delete
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {position.ytdFlows.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>Flows (YTD)</p>
                  <ul className="space-y-1">
                    {position.ytdFlows.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(f.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" — "}
                          <span
                            className="font-medium"
                            style={{ color: f.flowKind === "withdrawal" ? "var(--color-danger)" : "var(--color-success)" }}
                          >
                            {f.flowKind === "withdrawal" ? "−" : "+"}
                            {formatCurrency(f.amount, position.currencyCode)}
                          </span>
                          {" "}
                          <span style={{ color: "var(--color-text-subtle)" }}>{f.notes ?? f.flowKind}</span>
                        </span>
                        <form action={deleteFlow}>
                          <input type="hidden" name="flowId" value={f.id} />
                          <input type="hidden" name="year" value={year} />
                          <button type="submit" className="text-[11px]" style={{ color: "var(--color-danger)" }}>
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

      <div className="mt-auto flex gap-2 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={() => {
            setShowValForm((v) => !v);
            setShowFlowForm(false);
          }}
          className="btn-ghost"
        >
          {showValForm ? "Cancel" : "Record valuation"}
        </button>
        <button
          onClick={() => {
            setShowFlowForm((v) => !v);
            setShowValForm(false);
          }}
          className="btn-ghost"
        >
          {showFlowForm ? "Cancel" : "Record flow"}
        </button>
      </div>

      {showValForm && (
        <form ref={valFormRef} action={handleValuation} className="space-y-2 pt-1">
          <input type="hidden" name="positionId" value={position.id} />
          <input type="hidden" name="year" value={year} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                Market value ({position.currencyCode})
              </label>
              <input name="amount" type="number" step="0.01" min="0" required placeholder="0.00" className="input" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Date</label>
              <input name="asOf" type="date" required defaultValue={todayISO()} className="input" />
            </div>
          </div>
          <input name="notes" type="text" placeholder="Notes (optional)" className="input" />
          <button type="submit" className="btn-primary">
            Save valuation
          </button>
        </form>
      )}

      {showFlowForm && (
        <form ref={flowFormRef} action={handleFlow} className="space-y-2 pt-1">
          <input type="hidden" name="positionId" value={position.id} />
          <input type="hidden" name="year" value={year} />
          <div className="space-y-1">
            <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Flow type</label>
            <select name="flowKind" required className="input">
              {Object.entries(FLOW_KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                Amount ({position.currencyCode})
              </label>
              <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className="input" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Date</label>
              <input name="occurredAt" type="date" required defaultValue={todayISO()} className="input" />
            </div>
          </div>
          <input name="notes" type="text" placeholder="e.g. Sold Stock X, Dividend Q1" className="input" />
          <div className="space-y-1">
            <label className="block text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
              Cash account <span style={{ color: "var(--color-text-subtle)" }}>(links to wealth picture)</span>
            </label>
            <select name="accountId" className="input">
              <option value="">— not linked —</option>
              {accounts
                .filter((a) => a.currencyCode === position.currencyCode)
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
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
  const kindMeta: Record<string, { label: string; icon: React.ReactNode }> = {
    invest: { label: "Investments", icon: <IconTrendUp size={13} /> },
    pension: { label: "Pension", icon: <IconBank size={13} /> },
    crypto: { label: "Crypto", icon: <IconCoin size={13} /> },
  };

  return (
    <div className="space-y-6">
      {(["invest", "pension", "crypto"] as const).map((kind) => {
        const positions = byKind[kind] ?? [];
        if (positions.length === 0) return null;
        const meta = kindMeta[kind];
        return (
          <section key={kind} className="space-y-3">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              {meta.icon} {meta.label}
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
