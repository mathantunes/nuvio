"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "../planning/currency-format";
import {
  simulateSAC,
  simulateExtraMonthly,
  simulateLumpSum,
  simulateRefinance,
  type LoanParams,
} from "@/lib/loan-simulation";
import type {
  LoanData,
  LoanSummary,
} from "@/lib/loan-computations";
import {
  createSimulation,
  updateSimulation,
  promoteToActive,
  recordPayment,
  recordAmortization,
  linkAssetToLoan,
  closeLoan,
  deleteLoan,
  deletePayment,
  deleteAmortization,
  demoteToSimulation,
} from "./loans.actions";
import { RecordAssetValuationForm } from "../assets/assets-page";
import { CurrencyInput } from "@/components/currency-input";
import { Card, CardTitle, Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Account = { id: string; name: string; currencyCode: string; isActive: boolean };
type AvailableAsset = { id: string; name: string; kind: string; currencyCode: string };

interface LoanListProps {
  loanData: LoanData;
  accounts: Account[];
  availableAssets: AvailableAsset[];
  year: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const inputCls = "input px-3 py-1.5 text-xs";

const labelCls = "block text-[11px] font-medium";
const labelStyle = { color: "var(--color-text-muted)" } as const;

const submitBtnCls = "btn-primary px-3 py-1.5 text-xs";

const ghostBtnCls = "btn-ghost text-xs";

const dangerBtnCls = "text-xs underline";

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "simulation" | "active" | "closed" }) {
  const style =
    status === "simulation"
      ? {
          backgroundColor: "var(--color-brand-subtle)",
          color: "var(--color-brand)",
        }
      : status === "active"
      ? {
          backgroundColor: "var(--color-success-subtle)",
          color: "var(--color-success)",
        }
      : {
          backgroundColor: "var(--color-surface-raised)",
          color: "var(--color-text-subtle)",
        };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
      style={style}
    >
      {status}
    </span>
  );
}

// ─── ScheduleTable ────────────────────────────────────────────────────────────

import type { PaymentRow } from "@/lib/loan-simulation";

function ScheduleTable({
  rows,
  currencyCode,
}: {
  rows: PaymentRow[];
  currencyCode: string;
}) {
  return (
    <div
      className="max-h-96 overflow-auto rounded-lg border"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Table className="text-[11px] tabular-nums">
        <Thead
          className="sticky top-0 z-10"
          style={{
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text-subtle)",
          }}
        >
          <Tr>
            <Th>#</Th>
            <Th>Date</Th>
            <Th numeric>Principal</Th>
            <Th numeric>Interest</Th>
            <Th numeric>Total</Th>
            <Th numeric>Balance</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, i) => (
            <Tr
              key={i}
              className="border-t"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: row.isExtraAmortization
                  ? "var(--color-warning-subtle)"
                  : undefined,
              }}
            >
              <Td style={{ color: "var(--color-text-subtle)" }}>
                {row.isExtraAmortization ? "⚡" : row.month}
              </Td>
              <Td muted>{fmtShortDate(row.date)}</Td>
              <Td numeric muted>
                {formatCurrency(row.principalAmort, currencyCode)}
              </Td>
              <Td numeric style={{ color: "var(--color-danger)" }}>
                {row.interest > 0 ? formatCurrency(row.interest, currencyCode) : "—"}
              </Td>
              <Td numeric className="font-medium" style={{ color: "var(--color-text)" }}>
                {formatCurrency(row.totalPayment, currencyCode)}
              </Td>
              <Td numeric style={{ color: "var(--color-brand)" }}>
                {formatCurrency(row.remainingBalance, currencyCode)}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}

// ─── WhatIfPanel ─────────────────────────────────────────────────────────────

function WhatIfPanel({
  loanParams,
  currencyCode,
  outstandingBalance,
  monthsElapsed,
  interestRate,
  termMonths,
}: {
  loanParams: LoanParams;
  currencyCode: string;
  outstandingBalance: number;
  monthsElapsed: number;
  interestRate: number;
  termMonths: number;
}) {
  const [tab, setTab] = useState<"extra" | "lump" | "refi">("extra");
  const [extraAmount, setExtraAmount] = useState(0);
  const [lumpAmount, setLumpAmount] = useState(0);
  const [lumpMonth, setLumpMonth] = useState(1);
  const [refiRate, setRefiRate] = useState(interestRate);
  const [refiTerm, setRefiTerm] = useState(termMonths);

  const { principal, annualRatePercent, termMonths: loanTerm } = loanParams;
  const startDateStr = String(loanParams.startDate);

  const comparison = useMemo(() => {
    const params: LoanParams = {
      principal,
      annualRatePercent,
      termMonths: loanTerm,
      startDate: new Date(startDateStr),
    };
    if (tab === "extra") {
      return simulateExtraMonthly(params, extraAmount);
    } else if (tab === "lump") {
      return simulateLumpSum(params, lumpAmount, Math.max(1, lumpMonth));
    } else {
      return simulateRefinance(
        params,
        outstandingBalance,
        monthsElapsed,
        refiRate,
        refiTerm
      );
    }
  }, [
    tab,
    extraAmount,
    lumpAmount,
    lumpMonth,
    refiRate,
    refiTerm,
    principal,
    annualRatePercent,
    loanTerm,
    startDateStr,
    outstandingBalance,
    monthsElapsed,
  ]);

  const tabs: { id: "extra" | "lump" | "refi"; label: string }[] = [
    { id: "extra", label: "Extra monthly" },
    { id: "lump", label: "Lump sum" },
    { id: "refi", label: "Refinance" },
  ];

  return (
    <div
      className="space-y-3 rounded-lg border p-3"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}>
        What-if analysis
      </p>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab inputs */}
      {tab === "extra" && (
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Extra monthly payment ({currencyCode})</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={extraAmount || ""}
            onChange={(e) => setExtraAmount(parseFloat(e.target.value) || 0)}
            placeholder="e.g. 500"
            className={inputCls}
          />
        </div>
      )}
      {tab === "lump" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Lump sum amount ({currencyCode})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={lumpAmount || ""}
              onChange={(e) => setLumpAmount(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 10000"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>At month</label>
            <input
              type="number"
              min="1"
              max={loanTerm}
              value={lumpMonth}
              onChange={(e) => setLumpMonth(parseInt(e.target.value) || 1)}
              className={inputCls}
            />
          </div>
        </div>
      )}
      {tab === "refi" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>New rate (%/year)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={refiRate}
              onChange={(e) => setRefiRate(parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>New term (months)</label>
            <input
              type="number"
              min="1"
              value={refiTerm}
              onChange={(e) => setRefiTerm(parseInt(e.target.value) || 1)}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Comparison result */}
      {comparison && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div
            className="space-y-1 rounded-lg border p-2"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-text-subtle)" }}>
              Base scenario
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Interest:{" "}
              <span className="font-medium tabular-nums" style={{ color: "var(--color-danger)" }}>
                {formatCurrency(comparison.base.summary.totalInterest, currencyCode)}
              </span>
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Payoff: <span className="font-medium">{fmtDate(comparison.base.summary.payoffDate)}</span>
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {comparison.base.summary.actualTermMonths} months
            </p>
          </div>
          <div
            className="space-y-1 rounded-lg border p-2"
            style={{ backgroundColor: "var(--color-brand-subtle)", borderColor: "var(--color-brand)" }}
          >
            <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-brand)" }}>
              Scenario
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Interest:{" "}
              <span className="font-medium tabular-nums" style={{ color: "var(--color-danger)" }}>
                {formatCurrency(comparison.scenario.summary.totalInterest, currencyCode)}
              </span>
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Payoff:{" "}
              <span className="font-medium">
                {fmtDate(comparison.scenario.summary.payoffDate)}
              </span>
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {comparison.scenario.summary.actualTermMonths} months
            </p>
          </div>
          {(comparison.interestSaved > 0 || comparison.monthsSaved > 0) && (
            <div
              className="col-span-2 rounded-lg border p-2"
              style={{ backgroundColor: "var(--color-success-subtle)", borderColor: "var(--color-success)" }}
            >
              <p className="text-[11px] font-semibold" style={{ color: "var(--color-success)" }}>
                💚 You save{" "}
                <span className="tabular-nums">
                  {formatCurrency(comparison.interestSaved, currencyCode)}
                </span>{" "}
                in interest
                {comparison.monthsSaved > 0 &&
                  ` and pay off ${comparison.monthsSaved} month${comparison.monthsSaved !== 1 ? "s" : ""} earlier`}
              </p>
            </div>
          )}
          {comparison.interestSaved < 0 && (
            <div
              className="col-span-2 rounded-lg border p-2"
              style={{ backgroundColor: "var(--color-danger-subtle)", borderColor: "var(--color-danger)" }}
            >
              <p className="text-[11px] font-semibold" style={{ color: "var(--color-danger)" }}>
                ⚠ This scenario costs{" "}
                <span className="tabular-nums">
                  {formatCurrency(Math.abs(comparison.interestSaved), currencyCode)}
                </span>{" "}
                more in interest
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AddLoanForm ──────────────────────────────────────────────────────────────
// Primary CTA: create an active loan directly (simulation + immediate promotion)

function AddLoanForm({
  year,
  accounts,
  availableAssets,
  onCreated,
  onCancel,
}: {
  year: number;
  accounts: Account[];
  availableAssets: AvailableAsset[];
  onCreated: (loanName: string, accountId: string, disbursementDate: string) => void;
  onCancel: () => void;
}) {
  const [currency, setCurrency] = useState("CHF");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      const loanName = fd.get("name") as string;
      const accountId = (fd.get("accountId") as string) || "";
      const disbursementDate = (fd.get("disbursementDate") as string) || "";
      fd.set("year", String(year));
      await createSimulation(fd);
      onCreated(loanName, accountId, disbursementDate);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Add Active Loan</h2>
      <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
        Enter your existing loan details. The loan will be immediately tracked as active.
      </p>

      <form action={handleSubmit} className="space-y-4">
        {/* Row 1: Name, Lender, Currency */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Loan name</label>
            <input name="name" required placeholder="e.g. Home mortgage" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Lender (optional)</label>
            <input name="lender" placeholder="e.g. UBS" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Currency</label>
            <CurrencyInput
              name="currencyCode"
              required
              value={currency}
              onChange={setCurrency}
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>

        {/* Row 2: Principal, Rate, Term, Start date */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Principal ({currency})</label>
            <input
              name="principal"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="500000"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Annual rate (%)</label>
            <input
              name="interestRate"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="1.50"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Term (months)</label>
            <input
              name="termMonths"
              type="number"
              min="1"
              step="1"
              required
              placeholder="300"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Start date</label>
            <input
              name="startDate"
              type="date"
              required
              defaultValue={todayISO()}
              className={inputCls}
            />
          </div>
        </div>

        {/* Row 3: Asset, Notes */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Link to asset (optional)</label>
            <select name="assetId" className={inputCls}>
              <option value="">— no asset linked —</option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.kind}, {a.currencyCode})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Notes (optional)</label>
            <input name="notes" placeholder="Any additional notes" className={inputCls} />
          </div>
        </div>

        {/* Row 4: Disbursement account + date (optional) */}
        <div className="rounded-lg border p-3 space-y-3"
      style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
          <p
            className="text-[11px] font-medium uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Bank disbursement (optional)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelCls} style={labelStyle}>Linked account</label>
              <select name="accountId" className={inputCls}>
                <option value="">— skip —</option>
                {accounts
                  .filter((a) => a.currencyCode === currency)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls} style={labelStyle}>Disbursement date</label>
              <input name="disbursementDate" type="date" defaultValue={todayISO()} className={inputCls} />
            </div>
          </div>
          <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
            If set, records the loan proceeds as a cash inflow on the selected account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className={submitBtnCls}>
            {submitting ? "Creating…" : "Add Loan"}
          </button>
          <button type="button" onClick={onCancel} className={ghostBtnCls}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

// ─── NewSimulationForm ────────────────────────────────────────────────────────

function NewSimulationForm({
  year,
  availableAssets,
  onDone,
}: {
  year: number;
  availableAssets: AvailableAsset[];
  onDone: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Controlled fields for live preview
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [currency, setCurrency] = useState("CHF");
  const [submitting, setSubmitting] = useState(false);

  // Live schedule preview
  const preview = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const t = parseInt(term);
    if (!p || !r || !t || !startDate || p <= 0 || r <= 0 || t <= 0) return null;
    try {
      return simulateSAC({ principal: p, annualRatePercent: r, termMonths: t, startDate: new Date(startDate) });
    } catch {
      return null;
    }
  }, [principal, rate, term, startDate]);

  const firstPayment = preview?.schedule.find((r) => !r.isExtraAmortization);
  const lastPayment = [...(preview?.schedule ?? [])].reverse().find((r) => !r.isExtraAmortization);

  async function handleSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      fd.set("year", String(year));
      await createSimulation(fd);
      formRef.current?.reset();
      setPrincipal("");
      setRate("");
      setTerm("");
      setStartDate(todayISO());
      setCurrency("CHF");
      onDone();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      className="space-y-4"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderStyle: "dashed" }}
    >
      <CardTitle className="tracking-widest">New loan simulation</CardTitle>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        {/* Row 1: Name, Lender, Currency */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Loan name</label>
            <input name="name" required placeholder="e.g. Home mortgage" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Lender</label>
            <input name="lender" required placeholder="e.g. UBS" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Currency</label>
            <CurrencyInput
              name="currencyCode"
              required
              value={currency}
              onChange={setCurrency}
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>

        {/* Row 2: Principal, Rate, Term, Start date */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Principal ({currency})</label>
            <input
              name="principal"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="500000"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Annual rate (%)</label>
            <input
              name="interestRate"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="1.50"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Term (months)</label>
            <input
              name="termMonths"
              type="number"
              min="1"
              step="1"
              required
              placeholder="300"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Start date</label>
            <input
              name="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Row 3: Asset + Notes */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Link to asset (optional)</label>
            <select name="assetId" className={inputCls}>
              <option value="">— no asset linked —</option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.kind}, {a.currencyCode})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls} style={labelStyle}>Notes (optional)</label>
            <input name="notes" placeholder="Any additional notes" className={inputCls} />
          </div>
        </div>

        {/* Live preview */}
        {preview && (
          <div
            className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-4"
            style={{ backgroundColor: "var(--color-brand-subtle)", borderColor: "var(--color-brand)" }}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-brand)" }}>
                Total interest
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: "var(--color-danger)" }}>
                {formatCurrency(preview.summary.totalInterest, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-brand)" }}>
                Total paid
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                {formatCurrency(preview.summary.totalPaid, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-brand)" }}>
                Payoff date
              </p>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {fmtDate(preview.summary.payoffDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-brand)" }}>
                1st / last payment
              </p>
              <p className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                {firstPayment ? formatCurrency(firstPayment.totalPayment, currency) : "—"}
                {" / "}
                {lastPayment ? formatCurrency(lastPayment.totalPayment, currency) : "—"}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className={submitBtnCls}>
            {submitting ? "Creating…" : "Create simulation"}
          </button>
          <button type="button" onClick={onDone} className={ghostBtnCls}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

// ─── PromoteForm ──────────────────────────────────────────────────────────────

function PromoteForm({
  loan,
  year,
  accounts,
  onDone,
}: {
  loan: LoanSummary;
  year: number;
  accounts: Account[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      fd.set("loanId", loan.id);
      fd.set("year", String(year));
      await promoteToActive(fd);
      onDone();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        Promote to active loan
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Disbursement account (optional)</label>
          <select name="accountId" className={inputCls}>
            <option value="">— not linked —</option>
            {accounts
              .filter((a) => a.currencyCode === loan.currencyCode)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Disbursement date</label>
          <input name="disbursementDate" type="date" defaultValue={todayISO()} className={inputCls} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={submitBtnCls}>
          {submitting ? "Activating…" : "Confirm — activate loan"}
        </button>
        <button type="button" onClick={onDone} className={ghostBtnCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── SimulationCard ───────────────────────────────────────────────────────────

function SimulationCard({
  loan,
  year,
  accounts,
}: {
  loan: LoanSummary;
  year: number;
  accounts: Account[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loanParams: LoanParams = {
    principal: loan.principal,
    annualRatePercent: loan.interestRate,
    termMonths: loan.termMonths,
    startDate: new Date(loan.startDate),
  };

  async function handleDelete() {
    if (!confirm(`Delete simulation "${loan.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const fd = new FormData();
      fd.append("loanId", loan.id);
      fd.append("year", String(year));
      await deleteLoan(fd);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const s = loan.schedule.summary;
  const monthlyFirst = loan.schedule.schedule.find((r) => !r.isExtraAmortization);

  return (
    <Card className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{loan.name}</p>
            <StatusBadge status={loan.status} />
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>{loan.lender}</p>
        </div>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}>
          {loan.currencyCode}
        </span>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Principal</p>
          <p className="font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
            {formatCurrency(loan.principal, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Rate / Term</p>
          <p className="font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {loan.interestRate}% · {loan.termMonths}m
          </p>
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Total interest</p>
          <p className="font-semibold tabular-nums" style={{ color: "var(--color-danger)" }}>
            {formatCurrency(s.totalInterest, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Payoff date</p>
          <p className="font-semibold" style={{ color: "var(--color-text-muted)" }}>{fmtDate(s.payoffDate)}</p>
        </div>
        {monthlyFirst && (
          <div>
            <p style={{ color: "var(--color-text-subtle)" }}>1st payment</p>
            <p className="font-medium tabular-nums" style={{ color: "var(--color-text-muted)" }}>
              {formatCurrency(monthlyFirst.totalPayment, loan.currencyCode)}
            </p>
          </div>
        )}
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Total paid</p>
          <p className="font-medium tabular-nums" style={{ color: "var(--color-text-muted)" }}>
            {formatCurrency(s.totalPaid, loan.currencyCode)}
          </p>
        </div>
        {loan.notes && (
          <div className="sm:col-span-2">
            <p className="italic" style={{ color: "var(--color-text-subtle)" }}>{loan.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
        <button onClick={() => { setShowPromote((v) => !v); setShowEdit(false); }} className={ghostBtnCls}>
          {showPromote ? "Cancel promote" : "✓ Promote to active"}
        </button>
        <button onClick={() => { setShowEdit((v) => !v); setShowPromote(false); }} className={ghostBtnCls}>
          {showEdit ? "Cancel edit" : "Edit"}
        </button>
        <button onClick={() => setExpanded((v) => !v)} className={ghostBtnCls}>
          {expanded ? "Hide schedule" : "Show schedule"}
        </button>
        <button onClick={() => setShowWhatIf((v) => !v)} className={ghostBtnCls}>
          {showWhatIf ? "Hide what-if" : "What-if analysis"}
        </button>
        <button onClick={handleDelete} disabled={deleting} className={dangerBtnCls} style={{ color: "var(--color-danger)" }}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {/* Edit form */}
      {showEdit && (
        <form
          action={async (fd) => { fd.set("loanId", loan.id); fd.set("year", String(year)); await updateSimulation(fd); setShowEdit(false); }}
          className="space-y-3 border-t pt-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Edit simulation
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls} style={labelStyle}>Name</label>
              <input name="name" type="text" required defaultValue={loan.name} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Lender</label>
              <input name="lender" type="text" defaultValue={loan.lender ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Currency</label>
              <CurrencyInput name="currencyCode" required defaultValue={loan.currencyCode} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Principal</label>
              <input name="principal" type="number" min="1" step="0.01" required defaultValue={loan.principal} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Annual rate (%)</label>
              <input name="interestRate" type="number" min="0.01" step="0.01" required defaultValue={loan.interestRate} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Term (months)</label>
              <input name="termMonths" type="number" min="1" step="1" required defaultValue={loan.termMonths} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Start date</label>
              <input name="startDate" type="date" required defaultValue={new Date(loan.startDate).toISOString().split("T")[0]} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls} style={labelStyle}>Notes</label>
              <input name="notes" type="text" defaultValue={loan.notes ?? ""} className={inputCls} />
            </div>
          </div>
          <button type="submit" className={submitBtnCls}>Save changes</button>
        </form>
      )}

      {/* Promote form */}
      {showPromote && (
        <PromoteForm loan={loan} year={year} accounts={accounts} onDone={() => setShowPromote(false)} />
      )}

      {/* Schedule table */}
      {expanded && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium" style={{ color: "var(--color-text-subtle)" }}>
            Full amortization schedule ({s.actualTermMonths} payments)
          </p>
          <ScheduleTable rows={loan.schedule.schedule} currencyCode={loan.currencyCode} />
        </div>
      )}

      {/* What-if panel */}
      {showWhatIf && (
        <WhatIfPanel
          loanParams={loanParams}
          currencyCode={loan.currencyCode}
          outstandingBalance={loan.principal}
          monthsElapsed={0}
          interestRate={loan.interestRate}
          termMonths={loan.termMonths}
        />
      )}
    </Card>
  );
}

// ─── RecordPaymentForm ────────────────────────────────────────────────────────

function RecordPaymentForm({
  loan,
  year,
  accounts,
  onDone,
}: {
  loan: LoanSummary;
  year: number;
  accounts: Account[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from the next scheduled payment
  const regularRows = loan.schedule.schedule.filter((r) => !r.isExtraAmortization);
  const nextRow = regularRows[loan.payments.length] ?? null;

  async function handleSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      fd.set("loanId", loan.id);
      fd.set("year", String(year));
      await recordPayment(fd);
      onDone();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Record payment</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Total amount ({loan.currencyCode})</label>
          <input
            name="totalAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={nextRow ? nextRow.totalPayment.toFixed(2) : ""}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Principal part</label>
          <input
            name="principalAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={nextRow ? nextRow.principalAmort.toFixed(2) : ""}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Interest part</label>
          <input
            name="interestAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={nextRow ? nextRow.interest.toFixed(2) : ""}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Remaining balance after</label>
          <input
            name="remainingBalance"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={nextRow ? nextRow.remainingBalance.toFixed(2) : loan.outstandingBalance.toFixed(2)}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Payment date</label>
          <input name="paymentDate" type="date" required defaultValue={todayISO()} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Account (optional)</label>
          <select name="accountId" className={inputCls}>
            <option value="">— not linked —</option>
            {accounts
              .filter((a) => a.currencyCode === loan.currencyCode)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <input name="notes" placeholder="Notes (optional)" className={inputCls} />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={submitBtnCls}>
          {submitting ? "Saving…" : "Save payment"}
        </button>
        <button type="button" onClick={onDone} className={ghostBtnCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── RecordAmortizationForm ───────────────────────────────────────────────────

function RecordAmortizationForm({
  loan,
  year,
  accounts,
  onDone,
}: {
  loan: LoanSummary;
  year: number;
  accounts: Account[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      fd.set("loanId", loan.id);
      fd.set("year", String(year));
      await recordAmortization(fd);
      onDone();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Record extra amortization</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Amount ({loan.currencyCode})</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Date</label>
          <input name="occurredAt" type="date" required defaultValue={todayISO()} className={inputCls} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className={labelCls} style={labelStyle}>Account (optional)</label>
          <select name="accountId" className={inputCls}>
            <option value="">— not linked —</option>
            {accounts
              .filter((a) => a.currencyCode === loan.currencyCode)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <input name="notes" placeholder="Notes (optional)" className={inputCls} />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={submitBtnCls}>
          {submitting ? "Saving…" : "Save amortization"}
        </button>
        <button type="button" onClick={onDone} className={ghostBtnCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── AssetSection ─────────────────────────────────────────────────────────────

function AssetSection({
  asset,
  loan,
  year,
}: {
  asset: NonNullable<LoanSummary["asset"]>;
  loan: LoanSummary;
  year: number;
}) {
  const [showValForm, setShowValForm] = useState(false);
  const equity = asset.currentValue - loan.outstandingBalance;
  const ltv = asset.currentValue > 0 ? (loan.outstandingBalance / asset.currentValue) * 100 : null;

  return (
    <div className="rounded-lg border p-3 space-y-2"
      style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
            🏠 {asset.name}
          </p>
          <p className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
            {asset.kind} · purchased {fmtDate(asset.purchasedAt)} for{" "}
            {formatCurrency(asset.purchasePrice, asset.currencyCode)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Current value</p>
          <p className="font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
            {asset.currentValue > 0
              ? formatCurrency(asset.currentValue, asset.currencyCode)
              : "—"}
          </p>
          {asset.latestValuation && (
            <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
              as of {fmtDate(asset.latestValuation.valuedAt)}
            </p>
          )}
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Equity</p>
          <p
            className="font-semibold tabular-nums"
            style={{ color: equity >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
          >
            {equity >= 0 ? "+" : ""}
            {formatCurrency(equity, asset.currencyCode)}
          </p>
        </div>
        {ltv !== null && (
          <div>
            <p style={{ color: "var(--color-text-subtle)" }}>LTV ratio</p>
            <p
              className="font-semibold"
              style={{
                color:
                  ltv > 80
                    ? "var(--color-danger)"
                    : ltv > 60
                    ? "var(--color-warning)"
                    : "var(--color-success)",
              }}
            >
              {ltv.toFixed(1)}%
            </p>
          </div>
        )}
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Year-start value</p>
          <p className="font-medium tabular-nums" style={{ color: "var(--color-text-muted)" }}>
            {asset.yearStartValue > 0
              ? formatCurrency(asset.yearStartValue, asset.currencyCode)
              : "—"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowValForm((v) => !v)}
        className={ghostBtnCls}
      >
        {showValForm ? "Cancel" : "Update valuation"}
      </button>
      {showValForm && (
        <RecordAssetValuationForm
          assetId={loan.asset!.id}
          assetName={loan.asset!.name}
          currencyCode={loan.asset!.currencyCode}
          currentValue={loan.asset!.currentValue}
          year={year}
          onDone={() => setShowValForm(false)}
        />
      )}
    </div>
  );
}

// ─── ActiveLoanCard ───────────────────────────────────────────────────────────

function ActiveLoanCard({
  loan,
  year,
  accounts,
  availableAssets,
}: {
  loan: LoanSummary;
  year: number;
  accounts: Account[];
  availableAssets: AvailableAsset[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showAmortForm, setShowAmortForm] = useState(false);
  const [showValForm, setShowValForm] = useState(false);
  const [showLinkAsset, setShowLinkAsset] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [closing, setClosing] = useState(false);

  const remainingMonths = loan.schedule.summary.actualTermMonths;
  const equity = loan.asset ? loan.asset.currentValue - loan.outstandingBalance : null;
  const ltv = loan.asset && loan.asset.currentValue > 0
    ? (loan.outstandingBalance / loan.asset.currentValue) * 100
    : null;

  // For what-if: use outstanding balance as principal, remaining schedule
  const loanParams: LoanParams = {
    principal: loan.outstandingBalance,
    annualRatePercent: loan.interestRate,
    termMonths: remainingMonths,
    startDate: new Date(),
  };

  async function handleClose() {
    if (!confirm(`Close loan "${loan.name}"? This marks it as fully repaid.`)) return;
    setClosing(true);
    try {
      const fd = new FormData();
      fd.append("loanId", loan.id);
      fd.append("year", String(year));
      await closeLoan(fd);
      router.refresh();
    } finally {
      setClosing(false);
    }
  }

  async function handleDemote() {
    if (loan.payments.length > 0 || loan.amortizations.length > 0) {
      alert("Delete all payments and amortizations before demoting to simulation.");
      return;
    }
    if (!confirm(`Demote "${loan.name}" back to simulation? The disbursement transfer will be reversed.`)) return;
    const fd = new FormData();
    fd.append("loanId", loan.id);
    fd.append("year", String(year));
    await demoteToSimulation(fd);
    router.refresh();
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Delete this payment? The cash transfer will also be reversed.")) return;
    const fd = new FormData();
    fd.append("paymentId", paymentId);
    fd.append("year", String(year));
    await deletePayment(fd);
    router.refresh();
  }

  async function handleDeleteAmortization(amortizationId: string) {
    if (!confirm("Delete this amortization? The cash transfer will also be reversed.")) return;
    const fd = new FormData();
    fd.append("amortizationId", amortizationId);
    fd.append("year", String(year));
    await deleteAmortization(fd);
    router.refresh();
  }

  const progressPct = loan.principal > 0
    ? Math.min(100, (loan.principalPaid / loan.principal) * 100)
    : 0;

  // Next 3 months from schedule
  const regularRows = loan.schedule.schedule.filter((r) => !r.isExtraAmortization);
  const nextRows = regularRows.slice(loan.payments.length, loan.payments.length + 3);

  return (
    <Card className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{loan.name}</p>
            <StatusBadge status={loan.status} />
            {loan.asset && (
              <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-subtle)" }}>
                🏠 {loan.asset.name}
              </span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
            {loan.lender} · {loan.interestRate}% · started {fmtDate(loan.startDate)}
          </p>
        </div>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}>
          {loan.currencyCode}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div
          className="flex items-center justify-between text-[10px]"
          style={{ color: "var(--color-text-subtle)" }}
        >
          <span>{progressPct.toFixed(1)}% repaid</span>
          <span>{remainingMonths}m remaining</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-surface-raised)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              backgroundColor: "var(--color-success)",
              width: `${progressPct}%`,
            }}
          />
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Outstanding</p>
          <p className="font-bold tabular-nums" style={{ color: "var(--color-danger)" }}>
            {formatCurrency(loan.outstandingBalance, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Principal paid</p>
          <p className="font-semibold tabular-nums" style={{ color: "var(--color-success)" }}>
            {formatCurrency(loan.principalPaid, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Interest YTD</p>
          <p className="font-semibold tabular-nums" style={{ color: "var(--color-text-muted)" }}>
            {formatCurrency(loan.interestPaidYTD, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Payoff</p>
          <p className="font-medium" style={{ color: "var(--color-text-muted)" }}>
            {fmtDate(loan.schedule.summary.payoffDate)}
          </p>
        </div>
        {equity !== null && (
          <div>
            <p style={{ color: "var(--color-text-subtle)" }}>Equity</p>
            <p
              className="font-semibold tabular-nums"
              style={{ color: equity >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
            >
              {equity >= 0 ? "+" : ""}
              {formatCurrency(equity, loan.currencyCode)}
            </p>
          </div>
        )}
        {ltv !== null && (
          <div>
            <p style={{ color: "var(--color-text-subtle)" }}>LTV</p>
            <p
              className="font-semibold"
              style={{
                color:
                  ltv > 80
                    ? "var(--color-danger)"
                    : ltv > 60
                    ? "var(--color-warning)"
                    : "var(--color-success)",
              }}
            >
              {ltv.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Next 3 months schedule preview */}
      {nextRows.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2"
          style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Upcoming payments
          </p>
          <div className="space-y-1">
            {nextRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="min-w-[80px]" style={{ color: "var(--color-text-subtle)" }}>
                  {fmtShortDate(row.date)}
                </span>
                <span className="font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {formatCurrency(row.totalPayment, loan.currencyCode)}
                </span>
                <span className="hidden sm:inline" style={{ color: "var(--color-text-subtle)" }}>
                  P: {formatCurrency(row.principalAmort, loan.currencyCode)}
                  {" · "}
                  I: {formatCurrency(row.interest, loan.currencyCode)}
                </span>
                <span style={{ color: "var(--color-brand)" }}>
                  → {formatCurrency(row.remainingBalance, loan.currencyCode)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary action: Record Payment */}
      {!showPayForm && (
        <button
          onClick={() => { setShowPayForm(true); setShowAmortForm(false); setShowValForm(false); }}
          className={submitBtnCls}
        >
          Record payment
        </button>
      )}
      {showPayForm && (
        <RecordPaymentForm
          loan={loan}
          year={year}
          accounts={accounts}
          onDone={() => setShowPayForm(false)}
        />
      )}

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-3 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={() => { setShowAmortForm((v) => !v); setShowPayForm(false); setShowValForm(false); }}
          className={ghostBtnCls}
        >
          {showAmortForm ? "Cancel" : "Extra amortization"}
        </button>
        {loan.asset && (
          <button
            onClick={() => { setShowValForm((v) => !v); setShowPayForm(false); setShowAmortForm(false); setShowLinkAsset(false); }}
            className={ghostBtnCls}
          >
            {showValForm ? "Cancel" : "Update asset value"}
          </button>
        )}
        <button
          onClick={() => { setShowLinkAsset((v) => !v); setShowPayForm(false); setShowAmortForm(false); setShowValForm(false); }}
          className={ghostBtnCls}
        >
          {showLinkAsset ? "Cancel" : loan.asset ? "Change asset link" : "Link asset"}
        </button>
        <button onClick={() => setExpanded((v) => !v)} className={ghostBtnCls}>
          {expanded ? "Hide details" : "View full schedule"}
        </button>
        <button onClick={() => setShowWhatIf((v) => !v)} className={ghostBtnCls}>
          {showWhatIf ? "Hide what-if" : "What-if analysis"}
        </button>
        <button onClick={handleClose} disabled={closing} className={dangerBtnCls} style={{ color: "var(--color-danger)" }}>
          {closing ? "Closing…" : "Close loan"}
        </button>
        <button onClick={handleDemote} className={ghostBtnCls}>
          Demote to simulation
        </button>
      </div>

      {/* Extra amortization form */}
      {showAmortForm && (
        <RecordAmortizationForm
          loan={loan}
          year={year}
          accounts={accounts}
          onDone={() => setShowAmortForm(false)}
        />
      )}
      {showValForm && loan.asset && (
        <RecordAssetValuationForm
          assetId={loan.asset.id}
          assetName={loan.asset.name}
          currencyCode={loan.asset.currencyCode}
          currentValue={loan.asset.currentValue}
          year={year}
          onDone={() => setShowValForm(false)}
        />
      )}

      {/* Link asset form */}
      {showLinkAsset && (
        <form
          action={async (fd) => { fd.set("loanId", loan.id); fd.set("year", String(year)); await linkAssetToLoan(fd); setShowLinkAsset(false); }}
          className="space-y-2 border-t pt-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Link asset to this loan
          </p>
          <select name="assetId" className={inputCls}>
            <option value="">— no asset —</option>
            {availableAssets.map((a) => (
              <option key={a.id} value={a.id} selected={loan.asset?.id === a.id}>
                {a.name} ({a.kind} · {a.currencyCode})
              </option>
            ))}
          </select>
          <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
            Linking shows equity (asset value − outstanding balance) on this loan card.
          </p>
          <button type="submit" className={submitBtnCls}>Save link</button>
        </form>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-4 pt-1">
          {/* Asset section */}
          {loan.asset && (
            <AssetSection asset={loan.asset} loan={loan} year={year} />
          )}

          {/* Remaining schedule */}
          <div className="space-y-1">
            <p className="text-[11px] font-medium" style={{ color: "var(--color-text-subtle)" }}>
              Full remaining schedule
            </p>
            <ScheduleTable
              rows={loan.schedule.schedule.slice(loan.payments.length + loan.amortizations.length)}
              currencyCode={loan.currencyCode}
            />
          </div>

          {/* Payment history */}
          {loan.payments.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium" style={{ color: "var(--color-text-subtle)" }}>
                Payment history ({loan.payments.length})
              </p>
              <ul className="space-y-1">
                {[...loan.payments].reverse().map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 border-b pb-1 text-xs"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="min-w-[80px]" style={{ color: "var(--color-text-subtle)" }}>
                      {fmtDate(p.paymentDate)}
                    </span>
                    <span className="font-medium tabular-nums" style={{ color: "var(--color-text)" }}>
                      {formatCurrency(p.totalAmount, loan.currencyCode)}
                    </span>
                    <span className="tabular-nums text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                      P:{formatCurrency(p.principalAmount, loan.currencyCode)}{" "}
                      I:{formatCurrency(p.interestAmount, loan.currencyCode)}
                    </span>
                    <span className="tabular-nums text-[11px]" style={{ color: "var(--color-brand)" }}>
                      → {formatCurrency(p.remainingBalance, loan.currencyCode)}
                    </span>
                    {p.notes && (
                      <span className="max-w-[120px] truncate italic" style={{ color: "var(--color-text-subtle)" }}>
                        {p.notes}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(p.id)}
                      className="ml-auto shrink-0 text-[11px]" style={{ color: "var(--color-danger)" }}
                      title="Delete payment"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extra amortization history */}
          {loan.amortizations.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium" style={{ color: "var(--color-text-subtle)" }}>
                Extra amortizations ({loan.amortizations.length})
              </p>
              <ul className="space-y-1">
                {[...loan.amortizations].reverse().map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 border-b pb-1 text-xs"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="min-w-[80px]" style={{ color: "var(--color-text-subtle)" }}>
                      {fmtDate(a.occurredAt)}
                    </span>
                    <span className="font-semibold tabular-nums" style={{ color: "var(--color-warning)" }}>
                      {formatCurrency(a.amount, loan.currencyCode)}
                    </span>
                    <span style={{ color: "var(--color-text-subtle)" }}>{a.kind}</span>
                    {a.notes && (
                      <span className="max-w-[160px] truncate italic" style={{ color: "var(--color-text-subtle)" }}>
                        {a.notes}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAmortization(a.id)}
                      className="ml-auto shrink-0 text-[11px]" style={{ color: "var(--color-danger)" }}
                      title="Delete amortization"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Asset valuation history */}
          {loan.asset && loan.asset.latestValuation && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium" style={{ color: "var(--color-text-subtle)" }}>
                Latest asset valuation
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span className="font-medium tabular-nums">
                  {formatCurrency(loan.asset.latestValuation.value, loan.asset.currencyCode)}
                </span>{" "}
                as of {fmtDate(loan.asset.latestValuation.valuedAt)}
                {loan.asset.latestValuation.notes && (
                  <span className="ml-1" style={{ color: "var(--color-text-subtle)" }}>
                    · {loan.asset.latestValuation.notes}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* What-if panel */}
      {showWhatIf && (
        <WhatIfPanel
          loanParams={loanParams}
          currencyCode={loan.currencyCode}
          outstandingBalance={loan.outstandingBalance}
          monthsElapsed={loan.payments.length}
          interestRate={loan.interestRate}
          termMonths={remainingMonths}
        />
      )}
    </Card>
  );
}

// ─── LoanList (main export) ───────────────────────────────────────────────────

export function LoanList({ loanData, accounts, availableAssets, year }: LoanListProps) {
  const router = useRouter();
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showNewSim, setShowNewSim] = useState(false);
  const [showSimulations, setShowSimulations] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  // Pending promotion: after createSimulation, we need the new loan's ID.
  // We store the name+disbursement info here, then useEffect watches loanData.loans
  // and promotes as soon as the newly-created simulation appears.
  const [activatingName, setActivatingName] = useState<string | null>(null);
  const pendingPromoRef = useRef<{
    name: string;
    accountId: string;
    disbursementDate: string;
  } | null>(null);

  // Auto-promote effect: fires when loanData.loans changes (i.e., after router.refresh())
  useEffect(() => {
    const pending = pendingPromoRef.current;
    if (!pending) return;

    const sim = loanData.loans.find(
      (l) => l.status === "simulation" && l.name === pending.name
    );
    if (!sim) return;

    // Found the simulation — promote it
    const captured = pending;
    pendingPromoRef.current = null;

    const fd = new FormData();
    fd.set("loanId", sim.id);
    fd.set("year", String(year));
    if (captured.accountId) fd.set("accountId", captured.accountId);
    if (captured.disbursementDate) fd.set("disbursementDate", captured.disbursementDate);

    promoteToActive(fd)
      .then(() => {
        setActivatingName(null);
        router.refresh();
      })
      .catch(() => setActivatingName(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanData.loans]);

  function handleLoanCreated(name: string, accountId: string, disbursementDate: string) {
    setShowAddLoan(false);
    pendingPromoRef.current = { name, accountId, disbursementDate };
    setActivatingName(name);
    router.refresh();
  }

  const simulations = loanData.loans.filter((l) => l.status === "simulation");
  const activeLoans = loanData.loans.filter((l) => l.status === "active");
  const closedLoans = loanData.loans.filter((l) => l.status === "closed");

  return (
    <div className="space-y-8">

      {/* ── Active Loans (primary section) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Active Loans {activeLoans.length > 0 && `(${activeLoans.length})`}
          </h2>
          {!showAddLoan && !activatingName && (
            <button onClick={() => setShowAddLoan(true)} className="btn-primary gap-2 text-xs">
              Add Loan
            </button>
          )}
        </div>

        {/* Add Loan form */}
        {showAddLoan && (
          <AddLoanForm
            year={year}
            accounts={accounts}
            availableAssets={availableAssets}
            onCreated={handleLoanCreated}
            onCancel={() => setShowAddLoan(false)}
          />
        )}

        {/* Activating banner */}
        {activatingName && (
          <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--color-success-subtle)", borderColor: "var(--color-success)" }}>
            <span className="inline-block h-3 w-3 animate-pulse rounded-full" style={{ backgroundColor: "var(--color-success)" }} />
            <p className="text-sm" style={{ color: "var(--color-success)" }}>
              Activating <span className="font-medium">{activatingName}</span>…
            </p>
          </div>
        )}

        {/* Active loan cards */}
        {activeLoans.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeLoans.map((loan) => (
              <ActiveLoanCard key={loan.id} loan={loan} year={year} accounts={accounts} availableAssets={availableAssets} />
            ))}
          </div>
        ) : (
          !showAddLoan && !activatingName && (
            <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                No active loans yet.
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-subtle)" }}>
                Add your first loan to start tracking payments and balance.
              </p>
            </div>
          )
        )}
      </section>

      {/* ── Simulations (secondary section, collapsible) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowSimulations((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}
          >
            <span>{showSimulations ? "▼" : "▶"}</span>
            Simulations {simulations.length > 0 && `(${simulations.length})`}
          </button>
          {showSimulations && !showNewSim && (
            <button
              onClick={() => setShowNewSim(true)}
              className="btn-ghost text-xs"
            >
              + New Simulation
            </button>
          )}
        </div>

        {showSimulations && (
          <>
            {showNewSim && (
              <NewSimulationForm
                year={year}
                availableAssets={availableAssets}
                onDone={() => setShowNewSim(false)}
              />
            )}

            {simulations.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {simulations.map((loan) => (
                  <SimulationCard key={loan.id} loan={loan} year={year} accounts={accounts} />
                ))}
              </div>
            ) : (
              !showNewSim && (
                <p className="py-2 text-xs" style={{ color: "var(--color-text-subtle)" }}>
                  No simulations. Use simulations to model loans before committing.
                </p>
              )
            )}
          </>
        )}
      </section>

      {/* ── Closed Loans (collapsed by default) ── */}
      {closedLoans.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-subtle)" }}
          >
            <span>{showClosed ? "▼" : "▶"}</span>
            Closed loans ({closedLoans.length})
          </button>
          {showClosed && (
            <div className="rounded-xl border divide-y" style={{ borderColor: "var(--color-border)" }}>
              {closedLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{loan.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                      {loan.lender} · {formatCurrency(loan.principal, loan.currencyCode)} ·{" "}
                      {loan.interestRate}% · started {fmtDate(loan.startDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="closed" />
                    <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                      {loan.payments.length} payments · interest paid{" "}
                      {formatCurrency(loan.interestPaidTotal, loan.currencyCode)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
