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
  AssetSummary,
} from "@/lib/loan-computations";
import {
  createSimulation,
  updateSimulation,
  promoteToActive,
  recordPayment,
  recordAmortization,
  recordAssetValuation,
  createAsset,
  deleteAsset,
  linkAssetToLoan,
  closeLoan,
  deleteLoan,
  deletePayment,
  deleteAmortization,
  demoteToSimulation,
} from "./loans.actions";

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

const inputCls =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50";

const labelCls = "block text-[11px] font-medium text-zinc-700 dark:text-zinc-300";

const submitBtnCls =
  "inline-flex items-center rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 disabled:opacity-50";

const ghostBtnCls =
  "text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 underline";

const dangerBtnCls =
  "text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline";

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "simulation" | "active" | "closed" }) {
  const cls =
    status === "simulation"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      : status === "active"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${cls}`}
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
    <div className="overflow-auto max-h-96 rounded-lg border border-zinc-100 dark:border-zinc-800">
      <table className="w-full text-[11px] tabular-nums">
        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10">
          <tr className="text-zinc-500 dark:text-zinc-400">
            <th className="px-2 py-1.5 text-left font-medium">#</th>
            <th className="px-2 py-1.5 text-left font-medium">Date</th>
            <th className="px-2 py-1.5 text-right font-medium">Principal</th>
            <th className="px-2 py-1.5 text-right font-medium">Interest</th>
            <th className="px-2 py-1.5 text-right font-medium">Total</th>
            <th className="px-2 py-1.5 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-t border-zinc-100 dark:border-zinc-800 ${
                row.isExtraAmortization
                  ? "bg-amber-50 dark:bg-amber-900/10"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <td className="px-2 py-1 text-zinc-400">
                {row.isExtraAmortization ? "⚡" : row.month}
              </td>
              <td className="px-2 py-1 text-zinc-600 dark:text-zinc-300">
                {fmtShortDate(row.date)}
              </td>
              <td className="px-2 py-1 text-right text-zinc-700 dark:text-zinc-300">
                {formatCurrency(row.principalAmort, currencyCode)}
              </td>
              <td className="px-2 py-1 text-right text-red-500 dark:text-red-400">
                {row.interest > 0 ? formatCurrency(row.interest, currencyCode) : "—"}
              </td>
              <td className="px-2 py-1 text-right font-medium text-zinc-800 dark:text-zinc-200">
                {formatCurrency(row.totalPayment, currencyCode)}
              </td>
              <td className="px-2 py-1 text-right text-teal-600 dark:text-teal-400">
                {formatCurrency(row.remainingBalance, currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        What-if analysis
      </p>

      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              tab === t.id
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab inputs */}
      {tab === "extra" && (
        <div className="space-y-1">
          <label className={labelCls}>Extra monthly payment ({currencyCode})</label>
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
            <label className={labelCls}>Lump sum amount ({currencyCode})</label>
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
            <label className={labelCls}>At month</label>
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
            <label className={labelCls}>New rate (%/year)</label>
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
            <label className={labelCls}>New term (months)</label>
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
          <div className="rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase text-zinc-400 dark:text-zinc-500">
              Base scenario
            </p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Interest:{" "}
              <span className="font-medium tabular-nums text-red-500 dark:text-red-400">
                {formatCurrency(comparison.base.summary.totalInterest, currencyCode)}
              </span>
            </p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Payoff:{" "}
              <span className="font-medium">{fmtDate(comparison.base.summary.payoffDate)}</span>
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {comparison.base.summary.actualTermMonths} months
            </p>
          </div>
          <div className="rounded-lg bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-emerald-800 p-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase text-emerald-500 dark:text-emerald-400">
              Scenario
            </p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Interest:{" "}
              <span className="font-medium tabular-nums text-red-500 dark:text-red-400">
                {formatCurrency(comparison.scenario.summary.totalInterest, currencyCode)}
              </span>
            </p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Payoff:{" "}
              <span className="font-medium">
                {fmtDate(comparison.scenario.summary.payoffDate)}
              </span>
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {comparison.scenario.summary.actualTermMonths} months
            </p>
          </div>
          {(comparison.interestSaved > 0 || comparison.monthsSaved > 0) && (
            <div className="col-span-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
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
            <div className="col-span-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2">
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
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
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add Active Loan</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Enter your existing loan details. The loan will be immediately tracked as active.
      </p>

      <form action={handleSubmit} className="space-y-4">
        {/* Row 1: Name, Lender, Currency */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className={labelCls}>Loan name</label>
            <input name="name" required placeholder="e.g. Home mortgage" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Lender (optional)</label>
            <input name="lender" placeholder="e.g. UBS" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Currency</label>
            <input
              name="currencyCode"
              required
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="CHF"
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>

        {/* Row 2: Principal, Rate, Term, Start date */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className={labelCls}>Principal ({currency})</label>
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
            <label className={labelCls}>Annual rate (%)</label>
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
            <label className={labelCls}>Term (months)</label>
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
            <label className={labelCls}>Start date</label>
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
            <label className={labelCls}>Link to asset (optional)</label>
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
            <label className={labelCls}>Notes (optional)</label>
            <input name="notes" placeholder="Any additional notes" className={inputCls} />
          </div>
        </div>

        {/* Row 4: Disbursement account + date (optional) */}
        <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 space-y-3">
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Bank disbursement (optional)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelCls}>Linked account</label>
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
              <label className={labelCls}>Disbursement date</label>
              <input name="disbursementDate" type="date" defaultValue={todayISO()} className={inputCls} />
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
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
    </div>
  );
}

// ─── NewSimulationForm ────────────────────────────────────────────────────────

function NewSimulationForm({
  year,
  accounts,
  availableAssets,
  onDone,
}: {
  year: number;
  accounts: Account[];
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
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        New loan simulation
      </h2>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        {/* Row 1: Name, Lender, Currency */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className={labelCls}>Loan name</label>
            <input name="name" required placeholder="e.g. Home mortgage" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Lender</label>
            <input name="lender" required placeholder="e.g. UBS" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Currency</label>
            <input
              name="currencyCode"
              required
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="CHF"
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>

        {/* Row 2: Principal, Rate, Term, Start date */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className={labelCls}>Principal ({currency})</label>
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
            <label className={labelCls}>Annual rate (%)</label>
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
            <label className={labelCls}>Term (months)</label>
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
            <label className={labelCls}>Start date</label>
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
            <label className={labelCls}>Link to asset (optional)</label>
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
            <label className={labelCls}>Notes (optional)</label>
            <input name="notes" placeholder="Any additional notes" className={inputCls} />
          </div>
        </div>

        {/* Live preview */}
        {preview && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-500 dark:text-blue-400">
                Total interest
              </p>
              <p className="text-sm font-bold tabular-nums text-red-500 dark:text-red-400">
                {formatCurrency(preview.summary.totalInterest, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-500 dark:text-blue-400">
                Total paid
              </p>
              <p className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                {formatCurrency(preview.summary.totalPaid, currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-500 dark:text-blue-400">
                Payoff date
              </p>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {fmtDate(preview.summary.payoffDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-blue-500 dark:text-blue-400">
                1st / last payment
              </p>
              <p className="text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
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
    </div>
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
    <form action={handleSubmit} className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Promote to active loan
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Disbursement account (optional)</label>
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
          <label className={labelCls}>Disbursement date</label>
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
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{loan.name}</p>
            <StatusBadge status={loan.status} />
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{loan.lender}</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
          {loan.currencyCode}
        </span>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Principal</p>
          <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrency(loan.principal, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Rate / Term</p>
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            {loan.interestRate}% · {loan.termMonths}m
          </p>
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Total interest</p>
          <p className="font-semibold tabular-nums text-red-500 dark:text-red-400">
            {formatCurrency(s.totalInterest, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Payoff date</p>
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">{fmtDate(s.payoffDate)}</p>
        </div>
        {monthlyFirst && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">1st payment</p>
            <p className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
              {formatCurrency(monthlyFirst.totalPayment, loan.currencyCode)}
            </p>
          </div>
        )}
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Total paid</p>
          <p className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
            {formatCurrency(s.totalPaid, loan.currencyCode)}
          </p>
        </div>
        {loan.notes && (
          <div className="sm:col-span-2">
            <p className="text-zinc-400 dark:text-zinc-500 italic">{loan.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-2">
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
        <button onClick={handleDelete} disabled={deleting} className={dangerBtnCls}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {/* Edit form */}
      {showEdit && (
        <form
          action={async (fd) => { fd.set("loanId", loan.id); fd.set("year", String(year)); await updateSimulation(fd); setShowEdit(false); }}
          className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Edit simulation</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Name</label>
              <input name="name" type="text" required defaultValue={loan.name} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Lender</label>
              <input name="lender" type="text" defaultValue={loan.lender ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <input name="currencyCode" type="text" required defaultValue={loan.currencyCode} maxLength={3} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Principal</label>
              <input name="principal" type="number" min="1" step="0.01" required defaultValue={loan.principal} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Annual rate (%)</label>
              <input name="interestRate" type="number" min="0.01" step="0.01" required defaultValue={loan.interestRate} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Term (months)</label>
              <input name="termMonths" type="number" min="1" step="1" required defaultValue={loan.termMonths} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Start date</label>
              <input name="startDate" type="date" required defaultValue={new Date(loan.startDate).toISOString().split("T")[0]} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
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
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
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
    </div>
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
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Record payment</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Total amount ({loan.currencyCode})</label>
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
          <label className={labelCls}>Principal part</label>
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
          <label className={labelCls}>Interest part</label>
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
          <label className={labelCls}>Remaining balance after</label>
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
          <label className={labelCls}>Payment date</label>
          <input name="paymentDate" type="date" required defaultValue={todayISO()} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Account (optional)</label>
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
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Record extra amortization</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Amount ({loan.currencyCode})</label>
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
          <label className={labelCls}>Date</label>
          <input name="occurredAt" type="date" required defaultValue={todayISO()} className={inputCls} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className={labelCls}>Account (optional)</label>
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

// ─── RecordAssetValuationForm ─────────────────────────────────────────────────

function RecordAssetValuationForm({
  loan,
  year,
  onDone,
}: {
  loan: LoanSummary;
  year: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  if (!loan.asset) return null;

  async function handleSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      fd.set("assetId", loan.asset!.id);
      fd.set("year", String(year));
      await recordAssetValuation(fd);
      onDone();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Record valuation for {loan.asset.name}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Market value ({loan.asset.currencyCode})</label>
          <input
            name="value"
            type="number"
            step="1000"
            min="0"
            required
            defaultValue={loan.asset.currentValue > 0 ? loan.asset.currentValue.toFixed(0) : ""}
            placeholder="0"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Valuation date</label>
          <input name="valuedAt" type="date" required defaultValue={todayISO()} className={inputCls} />
        </div>
      </div>
      <input name="notes" placeholder="Source / notes (optional)" className={inputCls} />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={submitBtnCls}>
          {submitting ? "Saving…" : "Save valuation"}
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
    <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            🏠 {asset.name}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {asset.kind} · purchased {fmtDate(asset.purchasedAt)} for{" "}
            {formatCurrency(asset.purchasePrice, asset.currencyCode)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Current value</p>
          <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {asset.currentValue > 0
              ? formatCurrency(asset.currentValue, asset.currencyCode)
              : "—"}
          </p>
          {asset.latestValuation && (
            <p className="text-[10px] text-zinc-400">
              as of {fmtDate(asset.latestValuation.valuedAt)}
            </p>
          )}
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Equity</p>
          <p
            className={`font-semibold tabular-nums ${
              equity >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {equity >= 0 ? "+" : ""}
            {formatCurrency(equity, asset.currencyCode)}
          </p>
        </div>
        {ltv !== null && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">LTV ratio</p>
            <p
              className={`font-semibold ${
                ltv > 80
                  ? "text-red-500 dark:text-red-400"
                  : ltv > 60
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {ltv.toFixed(1)}%
            </p>
          </div>
        )}
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Year-start value</p>
          <p className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
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
        <RecordAssetValuationForm loan={loan} year={year} onDone={() => setShowValForm(false)} />
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
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{loan.name}</p>
            <StatusBadge status={loan.status} />
            {loan.asset && (
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                🏠 {loan.asset.name}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {loan.lender} · {loan.interestRate}% · started {fmtDate(loan.startDate)}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
          {loan.currencyCode}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
          <span>{progressPct.toFixed(1)}% repaid</span>
          <span>{remainingMonths}m remaining</span>
        </div>
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Outstanding</p>
          <p className="font-bold tabular-nums text-red-500 dark:text-red-400">
            {formatCurrency(loan.outstandingBalance, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Principal paid</p>
          <p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(loan.principalPaid, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Interest YTD</p>
          <p className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
            {formatCurrency(loan.interestPaidYTD, loan.currencyCode)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Payoff</p>
          <p className="font-medium text-zinc-600 dark:text-zinc-400">
            {fmtDate(loan.schedule.summary.payoffDate)}
          </p>
        </div>
        {equity !== null && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">Equity</p>
            <p
              className={`font-semibold tabular-nums ${
                equity >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {equity >= 0 ? "+" : ""}
              {formatCurrency(equity, loan.currencyCode)}
            </p>
          </div>
        )}
        {ltv !== null && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">LTV</p>
            <p
              className={`font-semibold ${
                ltv > 80
                  ? "text-red-500 dark:text-red-400"
                  : ltv > 60
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {ltv.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Next 3 months schedule preview */}
      {nextRows.length > 0 && (
        <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Upcoming payments
          </p>
          <div className="space-y-1">
            {nextRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="text-zinc-500 dark:text-zinc-400 min-w-[80px]">
                  {fmtShortDate(row.date)}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {formatCurrency(row.totalPayment, loan.currencyCode)}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                  P: {formatCurrency(row.principalAmort, loan.currencyCode)}
                  {" · "}
                  I: {formatCurrency(row.interest, loan.currencyCode)}
                </span>
                <span className="text-teal-600 dark:text-teal-400">
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
      <div className="flex flex-wrap gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-2">
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
        <button onClick={handleClose} disabled={closing} className={dangerBtnCls}>
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
        <RecordAssetValuationForm loan={loan} year={year} onDone={() => setShowValForm(false)} />
      )}

      {/* Link asset form */}
      {showLinkAsset && (
        <form
          action={async (fd) => { fd.set("loanId", loan.id); fd.set("year", String(year)); await linkAssetToLoan(fd); setShowLinkAsset(false); }}
          className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
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
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
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
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
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
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Payment history ({loan.payments.length})
              </p>
              <ul className="space-y-1">
                {[...loan.payments].reverse().map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-xs border-b border-zinc-50 dark:border-zinc-900 pb-1">
                    <span className="text-zinc-400 dark:text-zinc-500 min-w-[80px]">
                      {fmtDate(p.paymentDate)}
                    </span>
                    <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                      {formatCurrency(p.totalAmount, loan.currencyCode)}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500 tabular-nums text-[11px]">
                      P:{formatCurrency(p.principalAmount, loan.currencyCode)}{" "}
                      I:{formatCurrency(p.interestAmount, loan.currencyCode)}
                    </span>
                    <span className="text-teal-600 dark:text-teal-400 tabular-nums text-[11px]">
                      → {formatCurrency(p.remainingBalance, loan.currencyCode)}
                    </span>
                    {p.notes && (
                      <span className="text-zinc-400 dark:text-zinc-500 italic truncate max-w-[120px]">
                        {p.notes}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(p.id)}
                      className="ml-auto text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 text-[11px] shrink-0"
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
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Extra amortizations ({loan.amortizations.length})
              </p>
              <ul className="space-y-1">
                {[...loan.amortizations].reverse().map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs border-b border-zinc-50 dark:border-zinc-900 pb-1">
                    <span className="text-zinc-400 dark:text-zinc-500 min-w-[80px]">
                      {fmtDate(a.occurredAt)}
                    </span>
                    <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCurrency(a.amount, loan.currencyCode)}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500">{a.kind}</span>
                    {a.notes && (
                      <span className="text-zinc-400 dark:text-zinc-500 italic truncate max-w-[160px]">
                        {a.notes}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAmortization(a.id)}
                      className="ml-auto text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 text-[11px] shrink-0"
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
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Latest asset valuation
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                <span className="font-medium tabular-nums">
                  {formatCurrency(loan.asset.latestValuation.value, loan.asset.currencyCode)}
                </span>{" "}
                as of {fmtDate(loan.asset.latestValuation.valuedAt)}
                {loan.asset.latestValuation.notes && (
                  <span className="text-zinc-400 dark:text-zinc-500 ml-1">
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
    </div>
  );
}

// ─── StandaloneAssetCard ──────────────────────────────────────────────────────

function StandaloneAssetCard({ asset, year }: { asset: AssetSummary; year: number }) {
  const [showValForm, setShowValForm] = useState(false);

  async function handleValuation(fd: FormData) {
    fd.set("assetId", asset.id);
    fd.set("year", String(year));
    await recordAssetValuation(fd);
    setShowValForm(false);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {asset.kind === "real_estate" ? "🏠" : asset.kind === "vehicle" ? "🚗" : "📦"}{" "}
            {asset.name}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {asset.kind.replace("_", " ")} · {asset.currencyCode} · purchased{" "}
            {fmtDate(asset.purchasedAt)} for {formatCurrency(asset.purchasePrice, asset.currencyCode)}
          </p>
        </div>
        <form action={async (fd) => { fd.set("assetId", asset.id); fd.set("year", String(year)); await deleteAsset(fd); }}>
          <button
            type="submit"
            onClick={(e) => { if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) e.preventDefault(); }}
            className="text-[11px] text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded"
          >
            Delete
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Current value</p>
          <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {asset.currentValue > 0
              ? formatCurrency(asset.currentValue, asset.currencyCode)
              : "—"}
          </p>
          {asset.latestValuation && (
            <p className="text-[10px] text-zinc-400 mt-0.5">
              as of {fmtDate(asset.latestValuation.valuedAt)}
            </p>
          )}
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Year-start value</p>
          <p className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
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
        <form action={handleValuation} className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Value ({asset.currencyCode})</label>
              <input name="value" type="number" min="0" step="0.01" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Valued on</label>
              <input name="valuedAt" type="date" defaultValue={todayISO()} required className={inputCls} />
            </div>
          </div>
          <input name="notes" type="text" placeholder="Notes (optional)" className={inputCls} />
          <button type="submit" className={submitBtnCls}>Save valuation</button>
        </form>
      )}
    </div>
  );
}

// ─── AssetsSection ────────────────────────────────────────────────────────────

function AssetsSection({ assets, year }: { assets: AssetSummary[]; year: number }) {
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(fd: FormData) {
    fd.set("year", String(year));
    await createAsset(fd);
    setShowForm(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Assets {assets.length > 0 && `(${assets.length})`}
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs border border-zinc-300 dark:border-zinc-700 rounded-full px-3 py-1.5 font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition"
          >
            + Add Asset
          </button>
        )}
      </div>

      {showForm && (
        <form
          action={handleCreate}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">New Asset</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Name</label>
              <input name="name" type="text" required placeholder="My Apartment" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Kind</label>
              <select name="kind" required className={inputCls}>
                <option value="real_estate">Real estate</option>
                <option value="vehicle">Vehicle</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <input name="currencyCode" type="text" required defaultValue="BRL" maxLength={3} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Purchase price</label>
              <input name="purchasePrice" type="number" min="0" step="0.01" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Purchase date</label>
              <input name="purchasedAt" type="date" required defaultValue={todayISO()} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes (optional)</label>
              <input name="notes" type="text" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={submitBtnCls}>Create asset</button>
            <button type="button" onClick={() => setShowForm(false)} className={ghostBtnCls}>Cancel</button>
          </div>
        </form>
      )}

      {assets.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {assets.map((asset) => (
            <StandaloneAssetCard key={asset.id} asset={asset} year={year} />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No assets yet.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Add properties, vehicles, or other assets to track their value over time.
            </p>
          </div>
        )
      )}
    </section>
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
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Active Loans {activeLoans.length > 0 && `(${activeLoans.length})`}
          </h2>
          {!showAddLoan && !activatingName && (
            <button
              onClick={() => setShowAddLoan(true)}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              + Add Loan
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
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 px-4 py-3 flex items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
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
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No active loans yet.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
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
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <span>{showSimulations ? "▼" : "▶"}</span>
            Simulations {simulations.length > 0 && `(${simulations.length})`}
          </button>
          {showSimulations && !showNewSim && (
            <button
              onClick={() => setShowNewSim(true)}
              className="text-xs border border-zinc-300 dark:border-zinc-700 rounded-full px-3 py-1.5 font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition"
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
                accounts={accounts}
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
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">
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
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <span>{showClosed ? "▼" : "▶"}</span>
            Closed loans ({closedLoans.length})
          </button>
          {showClosed && (
            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {closedLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{loan.name}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {loan.lender} · {formatCurrency(loan.principal, loan.currencyCode)} ·{" "}
                      {loan.interestRate}% · started {fmtDate(loan.startDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="closed" />
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
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

      {/* ── Assets (standalone, always visible) ── */}
      <AssetsSection assets={loanData.allAssets} year={year} />
    </div>
  );
}
