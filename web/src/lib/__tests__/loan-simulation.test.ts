import { describe, it, expect } from "vitest";
import {
  simulateSAC,
  simulateExtraMonthly,
  simulateLumpSum,
  simulateRefinance,
  type LoanParams,
} from "../loan-simulation";

// Helper: round to 2 decimal places for financial comparisons
const r2 = (n: number) => Math.round(n * 100) / 100;

const START_DATE = new Date("2024-01-01T00:00:00Z");

// ── SAC schedule correctness ─────────────────────────────────────────────────

describe("simulateSAC — basic schedule", () => {
  it("produces the correct number of installments", () => {
    const result = simulateSAC({ principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE });
    const regular = result.schedule.filter((r) => !r.isExtraAmortization);
    expect(regular).toHaveLength(120);
  });

  it("has fixed principal installment each month", () => {
    const result = simulateSAC({ principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE });
    const regular = result.schedule.filter((r) => !r.isExtraAmortization);
    const expectedPrincipal = 120_000 / 120; // 1000 per month
    for (const row of regular) {
      expect(r2(row.principalAmort)).toBeCloseTo(expectedPrincipal, 2);
    }
  });

  it("interest decreases monotonically", () => {
    const result = simulateSAC({ principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE });
    const regular = result.schedule.filter((r) => !r.isExtraAmortization);
    for (let i = 1; i < regular.length; i++) {
      expect(regular[i].interest).toBeLessThanOrEqual(regular[i - 1].interest);
    }
  });

  it("first month interest = principal × monthlyRate", () => {
    const result = simulateSAC({ principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE });
    const firstRow = result.schedule[0];
    const expectedInterest = 120_000 * (6 / 12 / 100); // 600
    expect(r2(firstRow.interest)).toBeCloseTo(expectedInterest, 2);
  });

  it("remaining balance reaches ~0 at the end", () => {
    const result = simulateSAC({ principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE });
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.remainingBalance).toBeCloseTo(0, 1);
  });

  it("totalPaid = totalInterest + principal", () => {
    const result = simulateSAC({ principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE });
    expect(result.summary.totalPaid).toBeCloseTo(
      result.summary.totalInterest + 120_000,
      1
    );
  });

  it("works with zero interest rate (pure principal)", () => {
    const result = simulateSAC({ principal: 12_000, annualRatePercent: 0, termMonths: 12, startDate: START_DATE });
    const regular = result.schedule.filter((r) => !r.isExtraAmortization);
    expect(regular).toHaveLength(12);
    expect(r2(result.summary.totalInterest)).toBe(0);
    expect(r2(result.summary.totalPaid)).toBeCloseTo(12_000, 1);
  });

  it("assigns correct calendar dates (monthly)", () => {
    const result = simulateSAC({ principal: 12_000, annualRatePercent: 6, termMonths: 3, startDate: START_DATE });
    const regular = result.schedule.filter((r) => !r.isExtraAmortization);
    expect(regular[0].date.getUTCMonth()).toBe(0); // January
    expect(regular[1].date.getUTCMonth()).toBe(1); // February
    expect(regular[2].date.getUTCMonth()).toBe(2); // March
  });
});

// ── Extra amortization (a_prazo — term reduction) ────────────────────────────

describe("simulateSAC — extra amortizations (a_prazo)", () => {
  const params: LoanParams = { principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE };

  it("reduces the term when an extra amortization is applied", () => {
    const base = simulateSAC(params);
    const withExtra = simulateSAC(params, [{ atMonth: 1, amount: 12_000 }]);
    expect(withExtra.summary.actualTermMonths).toBeLessThan(base.summary.actualTermMonths);
  });

  it("does not change the fixed principal installment after extra amortization", () => {
    const withExtra = simulateSAC(params, [{ atMonth: 6, amount: 10_000 }]);
    const regular = withExtra.schedule.filter((r) => !r.isExtraAmortization);
    const expectedPrincipal = 120_000 / 120;
    // All regular installments should still have the same principal
    for (const row of regular) {
      expect(r2(row.principalAmort)).toBeCloseTo(expectedPrincipal, 1);
    }
  });

  it("extra amortization rows are flagged", () => {
    const result = simulateSAC(params, [{ atMonth: 3, amount: 5_000 }]);
    const extras = result.schedule.filter((r) => r.isExtraAmortization);
    expect(extras).toHaveLength(1);
    expect(r2(extras[0].principalAmort)).toBeCloseTo(5_000, 1);
    expect(extras[0].interest).toBe(0);
  });

  it("balance reaches 0 correctly with extra amortization", () => {
    const result = simulateSAC(params, [{ atMonth: 1, amount: 12_000 }]);
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.remainingBalance).toBeCloseTo(0, 1);
  });

  it("total paid = principal + total interest regardless of extra amortizations", () => {
    const result = simulateSAC(params, [{ atMonth: 12, amount: 24_000 }]);
    expect(result.summary.totalPaid).toBeCloseTo(
      result.summary.totalInterest + 120_000,
      1
    );
  });

  it("extra amortization larger than remaining balance caps at remaining balance", () => {
    // Apply massive extra amortization that exceeds remaining balance — loan fully paid by extra
    const result = simulateSAC(params, [{ atMonth: 1, amount: 999_999 }]);
    expect(result.schedule).toHaveLength(1); // only the extra amort row
    expect(result.schedule[0].isExtraAmortization).toBe(true);
    expect(result.schedule[0].remainingBalance).toBeCloseTo(0, 1);
    expect(result.summary.actualTermMonths).toBe(0); // no regular installments
  });
});

// ── What-if: extra monthly payment ──────────────────────────────────────────

describe("simulateExtraMonthly", () => {
  const params: LoanParams = { principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE };

  it("saves interest and reduces term", () => {
    const result = simulateExtraMonthly(params, 500);
    expect(result.interestSaved).toBeGreaterThan(0);
    expect(result.monthsSaved).toBeGreaterThan(0);
  });

  it("more extra payment = more savings", () => {
    const low = simulateExtraMonthly(params, 200);
    const high = simulateExtraMonthly(params, 1_000);
    expect(high.interestSaved).toBeGreaterThan(low.interestSaved);
    expect(high.monthsSaved).toBeGreaterThan(low.monthsSaved);
  });

  it("zero extra payment matches base schedule exactly", () => {
    const result = simulateExtraMonthly(params, 0);
    expect(result.interestSaved).toBeCloseTo(0, 1);
    expect(result.monthsSaved).toBe(0);
  });
});

// ── What-if: lump sum ────────────────────────────────────────────────────────

describe("simulateLumpSum", () => {
  const params: LoanParams = { principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE };

  it("saves interest and reduces term", () => {
    const result = simulateLumpSum(params, 20_000, 12);
    expect(result.interestSaved).toBeGreaterThan(0);
    expect(result.monthsSaved).toBeGreaterThan(0);
  });

  it("earlier lump sum saves more interest than later", () => {
    const early = simulateLumpSum(params, 20_000, 6);
    const late = simulateLumpSum(params, 20_000, 60);
    expect(early.interestSaved).toBeGreaterThan(late.interestSaved);
  });
});

// ── What-if: refinance ───────────────────────────────────────────────────────

describe("simulateRefinance", () => {
  const params: LoanParams = { principal: 120_000, annualRatePercent: 6, termMonths: 120, startDate: START_DATE };

  it("lower rate saves interest", () => {
    const result = simulateRefinance(params, 100_000, 12, 4, 108);
    expect(result.interestSaved).toBeGreaterThan(0);
  });

  it("higher rate costs more interest", () => {
    const result = simulateRefinance(params, 100_000, 12, 8, 108);
    expect(result.interestSaved).toBeLessThan(0);
  });
});
