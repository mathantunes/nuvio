/**
 * SAC (Sistema de Amortização Constante) loan simulation engine.
 * All functions are pure — no DB access. Safe to call from client components.
 *
 * SAC rules:
 *  - Fixed principal installment = principal / termMonths
 *  - Monthly interest = outstandingBalance × (annualRate / 12 / 100)
 *  - Total payment = principal_installment + interest (decreases over time)
 *  - Extra amortizations (kind='a_prazo') reduce the remaining term,
 *    keeping the fixed principal installment unchanged.
 */

export interface ExtraAmortization {
  /** 1-based month index at which this extra amortization occurs (before that month's regular payment) */
  atMonth: number;
  amount: number;
}

export interface PaymentRow {
  /** 1-based installment number */
  month: number;
  /** Calendar date of this payment */
  date: Date;
  /** Fixed principal component of this installment */
  principalAmort: number;
  /** Interest component (decreases over time) */
  interest: number;
  /** Total payment = principalAmort + interest */
  totalPayment: number;
  /** Remaining balance after this payment */
  remainingBalance: number;
  /** True if this row was triggered by an extra amortization (not a regular installment) */
  isExtraAmortization?: boolean;
}

export interface ScheduleSummary {
  /** Actual number of installments (may be less than termMonths due to extra amortizations) */
  actualTermMonths: number;
  totalInterest: number;
  totalPaid: number;
  payoffDate: Date;
}

export interface SimulationResult {
  schedule: PaymentRow[];
  summary: ScheduleSummary;
}

export interface LoanParams {
  principal: number;
  /** Annual interest rate as a percentage, e.g. 1.5 for 1.5% */
  annualRatePercent: number;
  termMonths: number;
  /** First payment date */
  startDate: Date;
}

/**
 * Adds months to a date, returning the same day-of-month in the target month.
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Computes a SAC amortization schedule.
 *
 * Extra amortizations are applied before the regular installment on the given month.
 * Each extra amortization reduces the remaining term proportionally (a_prazo):
 *   newRemainingTerm = floor(remainingBalance / fixedPrincipalInstallment)
 */
export function simulateSAC(
  params: LoanParams,
  extraAmortizations: ExtraAmortization[] = []
): SimulationResult {
  const { principal, annualRatePercent, termMonths, startDate } = params;
  const monthlyRate = annualRatePercent / 12 / 100;
  const fixedPrincipalInstallment = principal / termMonths;

  const extraByMonth = new Map<number, number>();
  for (const ea of extraAmortizations) {
    extraByMonth.set(ea.atMonth, (extraByMonth.get(ea.atMonth) ?? 0) + ea.amount);
  }

  const schedule: PaymentRow[] = [];
  let remaining = principal;
  // monthIdx: calendar month counter (1-based). Each iteration = one calendar month.
  // A calendar month can produce both an extra-amortization row AND a regular row.
  let monthIdx = 0;
  const maxMonths = termMonths * 2 + extraAmortizations.length + 10;

  while (remaining > 0.005 && monthIdx < maxMonths) {
    monthIdx++;
    const paymentDate = addMonths(startDate, monthIdx - 1);

    // Apply extra amortization for this month (before the regular installment)
    const extra = extraByMonth.get(monthIdx) ?? 0;
    if (extra > 0) {
      const extraApplied = Math.min(extra, remaining);
      remaining = Math.max(0, remaining - extraApplied);
      schedule.push({
        month: monthIdx,
        date: paymentDate,
        principalAmort: extraApplied,
        interest: 0,
        totalPayment: extraApplied,
        remainingBalance: remaining,
        isExtraAmortization: true,
      });
      // Fully paid off by extra amortization — no regular payment needed
      if (remaining <= 0.005) break;
    }

    // Regular SAC installment for this month
    const interest = remaining * monthlyRate;
    const principalAmort = Math.min(fixedPrincipalInstallment, remaining);
    remaining = Math.max(0, remaining - principalAmort);

    schedule.push({
      month: monthIdx,
      date: paymentDate,
      principalAmort,
      interest,
      totalPayment: principalAmort + interest,
      remainingBalance: remaining,
    });
  }

  const regularRows = schedule.filter((r) => !r.isExtraAmortization);
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const totalPaid = schedule.reduce((s, r) => s + r.totalPayment, 0);
  const lastRow = schedule[schedule.length - 1];

  return {
    schedule,
    summary: {
      actualTermMonths: regularRows.length,
      totalInterest,
      totalPaid,
      payoffDate: lastRow?.date ?? startDate,
    },
  };
}

export interface WhatIfComparison {
  base: SimulationResult;
  scenario: SimulationResult;
  interestSaved: number;
  monthsSaved: number;
}

/**
 * What-if: add a fixed extra monthly payment applied as a_prazo amortization each month.
 */
export function simulateExtraMonthly(
  params: LoanParams,
  extraPerMonth: number
): WhatIfComparison {
  const base = simulateSAC(params);
  if (extraPerMonth <= 0) {
    return { base, scenario: base, interestSaved: 0, monthsSaved: 0 };
  }
  // Apply extra amortization to every month up to the original term
  const extras: ExtraAmortization[] = Array.from({ length: params.termMonths }, (_, i) => ({
    atMonth: i + 1,
    amount: extraPerMonth,
  }));
  const scenario = simulateSAC(params, extras);
  return {
    base,
    scenario,
    interestSaved: base.summary.totalInterest - scenario.summary.totalInterest,
    monthsSaved: base.summary.actualTermMonths - scenario.summary.actualTermMonths,
  };
}

/**
 * What-if: apply a one-time lump-sum extra amortization at a specific month.
 */
export function simulateLumpSum(
  params: LoanParams,
  amount: number,
  atMonth: number
): WhatIfComparison {
  const base = simulateSAC(params);
  const scenario = simulateSAC(params, [{ atMonth, amount }]);
  return {
    base,
    scenario,
    interestSaved: base.summary.totalInterest - scenario.summary.totalInterest,
    monthsSaved: base.summary.actualTermMonths - scenario.summary.actualTermMonths,
  };
}

/**
 * What-if: refinance at a new rate and/or term, starting from the current outstanding balance.
 * outstandingBalance and monthsElapsed represent the point at which refinancing occurs.
 */
export function simulateRefinance(
  params: LoanParams,
  outstandingBalance: number,
  monthsElapsed: number,
  newAnnualRatePercent: number,
  newTermMonths: number
): WhatIfComparison {
  const base = simulateSAC(params);
  const newStartDate = addMonths(params.startDate, monthsElapsed);
  const refinancedParams: LoanParams = {
    principal: outstandingBalance,
    annualRatePercent: newAnnualRatePercent,
    termMonths: newTermMonths,
    startDate: newStartDate,
  };
  const scenario = simulateSAC(refinancedParams);

  // Cost to compare: interest remaining in base vs total interest in scenario
  const baseRemainingInterest = base.schedule
    .slice(monthsElapsed)
    .reduce((s, r) => s + r.interest, 0);

  return {
    base,
    scenario,
    interestSaved: baseRemainingInterest - scenario.summary.totalInterest,
    monthsSaved:
      base.summary.actualTermMonths - monthsElapsed - scenario.summary.actualTermMonths,
  };
}
