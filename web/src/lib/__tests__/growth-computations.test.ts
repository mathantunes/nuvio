/**
 * Unit tests for calculateGrowthAnalytics — specifically verifying that
 * instrument_transfers are correctly included in cash balance computations
 * and do not cause double-counting with portfolio valuations.
 */
import { describe, it, expect } from "vitest";
import { calculateGrowthAnalytics } from "../growth-computations";

// Minimal month data: 12 months with no income/expenses
const emptyMonthlyData = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  name: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  plannedIncome: {},
  actualIncome: {},
  plannedExpenses: {},
  actualExpenses: {},
}));

const noTransfers: never[] = [];

describe("calculateGrowthAnalytics — instrument transfer impacts", () => {
  it("no instrument transfers → cash balance unchanged (baseline)", () => {
    const result = calculateGrowthAnalytics(
      [{ amount: "10000", currencyCode: "CHF" }],
      {},          // yearNetActual
      {},          // transferImpacts
      {},          // totalFees
      noTransfers, // yearTransfers
      emptyMonthlyData,
      {},          // portfolioYearStart
      {},          // portfolioLatest
      {},          // portfolioTotalReturn
      {},          // instrumentTransferImpacts (none)
      [],          // yearInstrumentTransfers (none)
    );

    const chf = result.byCurrency.find((c) => c.currency === "CHF")!;
    expect(chf.startingBalance).toBe(10000);
    expect(chf.currentBalance).toBe(10000);
    expect(chf.instrumentTransferImpact).toBe(0);
  });

  it("portfolio withdrawal → cash increases", () => {
    // Net withdrawal of 5962 CHF from portfolio into cash account
    const result = calculateGrowthAnalytics(
      [{ amount: "10000", currencyCode: "CHF" }],
      {},
      {},
      {},
      noTransfers,
      emptyMonthlyData,
      {},
      {},
      {},
      { CHF: 5962 }, // from_instrument: cash gained
      [{ accountId: "acc1", direction: "from_instrument", amount: "5962", currencyCode: "CHF", occurredAt: new Date("2026-03-06") }],
    );

    const chf = result.byCurrency.find((c) => c.currency === "CHF")!;
    expect(chf.startingBalance).toBe(10000);
    expect(chf.currentBalance).toBe(15962);
    expect(chf.instrumentTransferImpact).toBe(5962);
  });

  it("portfolio deposit → cash decreases", () => {
    const result = calculateGrowthAnalytics(
      [{ amount: "10000", currencyCode: "CHF" }],
      {},
      {},
      {},
      noTransfers,
      emptyMonthlyData,
      {},
      {},
      {},
      { CHF: -2000 }, // to_instrument: cash lost
      [{ accountId: "acc1", direction: "to_instrument", amount: "2000", currencyCode: "CHF", occurredAt: new Date("2026-01-05") }],
    );

    const chf = result.byCurrency.find((c) => c.currency === "CHF")!;
    expect(chf.startingBalance).toBe(10000);
    expect(chf.currentBalance).toBe(8000);
    expect(chf.instrumentTransferImpact).toBe(-2000);
  });

  it("multiple transfers in both directions → net applied correctly", () => {
    // Two deposits (1777 + 405 + 1024 = 3206) and three withdrawals (960 + 6262 + 1946 = 9168)
    // Net = 9168 - 3206 = 5962 CHF gained (from_instrument outweighs to_instrument)
    const instrumentTransferImpacts = { CHF: 9168 - 3206 }; // 5962
    const yearInstrumentTransfers = [
      { accountId: "acc1", direction: "to_instrument",   amount: "1777", currencyCode: "CHF", occurredAt: new Date("2026-01-05") },
      { accountId: "acc1", direction: "to_instrument",   amount: "405",  currencyCode: "CHF", occurredAt: new Date("2026-01-06") },
      { accountId: "acc1", direction: "from_instrument", amount: "960",  currencyCode: "CHF", occurredAt: new Date("2026-01-29") },
      { accountId: "acc1", direction: "from_instrument", amount: "6262", currencyCode: "CHF", occurredAt: new Date("2026-03-06") },
      { accountId: "acc1", direction: "to_instrument",   amount: "1024", currencyCode: "CHF", occurredAt: new Date("2026-03-09") },
      { accountId: "acc1", direction: "from_instrument", amount: "1946", currencyCode: "CHF", occurredAt: new Date("2026-03-31") },
    ];

    const result = calculateGrowthAnalytics(
      [{ amount: "10000", currencyCode: "CHF" }],
      {},
      {},
      {},
      noTransfers,
      emptyMonthlyData,
      {},
      {},
      {},
      instrumentTransferImpacts,
      yearInstrumentTransfers,
    );

    const chf = result.byCurrency.find((c) => c.currency === "CHF")!;
    expect(chf.instrumentTransferImpact).toBe(5962);
    expect(chf.currentBalance).toBe(15962);
  });

  it("transfers in a different currency do not affect CHF cash", () => {
    const result = calculateGrowthAnalytics(
      [{ amount: "10000", currencyCode: "CHF" }],
      {},
      {},
      {},
      noTransfers,
      emptyMonthlyData,
      {},
      {},
      {},
      { USD: 500 }, // USD transfer — should not affect CHF
      [{ accountId: "acc2", direction: "from_instrument", amount: "500", currencyCode: "USD", occurredAt: new Date("2026-02-01") }],
    );

    const chf = result.byCurrency.find((c) => c.currency === "CHF")!;
    expect(chf.instrumentTransferImpact).toBe(0);
    expect(chf.currentBalance).toBe(10000);
  });

  it("no double-counting: cash + portfolio = correct wealth", () => {
    // Start: 10000 CHF cash + 12000 CHF portfolio = 22000 total wealth
    // Portfolio withdrawal of 5962 to cash:
    //   Cash becomes: 10000 + 5962 = 15962
    //   Portfolio becomes: 12000 - 5962 + some market gain, say 15000 latest
    // Wealth = 15962 (cash) + 15000 (portfolio) = 30962 — no double-counting
    const portfolioYearStart = { CHF: 12000 };
    const portfolioLatest    = { CHF: 15000 };
    const portfolioReturn    = { CHF: 15000 - 12000 }; // 3000

    const result = calculateGrowthAnalytics(
      [{ amount: "10000", currencyCode: "CHF" }],
      {},
      {},
      {},
      noTransfers,
      emptyMonthlyData,
      portfolioYearStart,
      portfolioLatest,
      portfolioReturn,
      { CHF: 5962 },
      [{ accountId: "acc1", direction: "from_instrument", amount: "5962", currencyCode: "CHF", occurredAt: new Date("2026-03-06") }],
    );

    const chf = result.byCurrency.find((c) => c.currency === "CHF")!;
    expect(chf.currentBalance).toBe(15962);          // cash
    expect(chf.portfolioCurrentValue).toBe(15000);   // portfolio (its own latest valuation)
    expect(chf.wealthCurrentBalance).toBe(30962);    // total — no double-counting
  });

  it("monthly breakdown reflects instrument transfer in the correct month", () => {
    // Withdrawal of 6262 on 2026-03-06 → should appear in month 3 breakdown
    const result = calculateGrowthAnalytics(
      [{ amount: "10000", currencyCode: "CHF" }],
      {},
      {},
      {},
      noTransfers,
      emptyMonthlyData,
      {},
      {},
      {},
      { CHF: 6262 },
      [{ accountId: "acc1", direction: "from_instrument", amount: "6262", currencyCode: "CHF", occurredAt: new Date("2026-03-06") }],
    );

    const chf = result.byCurrency.find((c) => c.currency === "CHF")!;
    const march = chf.monthlyBreakdown.find((m) => m.month === 3)!;
    expect(march.instrumentTransferImpact).toBe(6262);
    // Months before March should have no impact
    const jan = chf.monthlyBreakdown.find((m) => m.month === 1)!;
    expect(jan.instrumentTransferImpact).toBe(0);
  });
});
