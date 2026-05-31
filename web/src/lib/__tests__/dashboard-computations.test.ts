import { describe, it, expect, vi } from "vitest";

// Mock DB so the module can be imported without a real Postgres connection
vi.mock("@/db/client", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({}));

import {
  addTo,
  calculateNetBalance,
  calculateTransferImpacts,
  calculateSavingsData,
  type CurrencyTotals,
} from "../dashboard-computations";

// ─── addTo ─────────────────────────────────────────────────────────────────────

describe("addTo", () => {
  it("initialises a new currency key", () => {
    const totals: CurrencyTotals = {};
    addTo(totals, "USD", 100);
    expect(totals["USD"]).toBe(100);
  });

  it("accumulates multiple additions", () => {
    const totals: CurrencyTotals = {};
    addTo(totals, "USD", 100);
    addTo(totals, "USD", 50);
    expect(totals["USD"]).toBe(150);
  });

  it("handles negative amounts", () => {
    const totals: CurrencyTotals = {};
    addTo(totals, "EUR", 200);
    addTo(totals, "EUR", -50);
    expect(totals["EUR"]).toBe(150);
  });

  it("tracks multiple currencies independently", () => {
    const totals: CurrencyTotals = {};
    addTo(totals, "USD", 100);
    addTo(totals, "EUR", 200);
    addTo(totals, "BRL", 500);
    expect(totals["USD"]).toBe(100);
    expect(totals["EUR"]).toBe(200);
    expect(totals["BRL"]).toBe(500);
  });
});

// ─── calculateNetBalance ───────────────────────────────────────────────────────

describe("calculateNetBalance", () => {
  it("computes income minus expenses per currency", () => {
    const income: CurrencyTotals = { USD: 3000 };
    const expenses: CurrencyTotals = { USD: 2000 };
    const net = calculateNetBalance(income, expenses);
    expect(net["USD"]).toBe(1000);
  });

  it("handles currencies only in income", () => {
    const income: CurrencyTotals = { EUR: 1500 };
    const expenses: CurrencyTotals = {};
    const net = calculateNetBalance(income, expenses);
    expect(net["EUR"]).toBe(1500);
  });

  it("handles currencies only in expenses", () => {
    const income: CurrencyTotals = {};
    const expenses: CurrencyTotals = { BRL: 800 };
    const net = calculateNetBalance(income, expenses);
    expect(net["BRL"]).toBe(-800);
  });

  it("excludes currencies where net is zero", () => {
    const income: CurrencyTotals = { USD: 1000 };
    const expenses: CurrencyTotals = { USD: 1000 };
    const net = calculateNetBalance(income, expenses);
    expect("USD" in net).toBe(false);
  });

  it("handles multi-currency", () => {
    const income: CurrencyTotals = { USD: 3000, EUR: 2000 };
    const expenses: CurrencyTotals = { USD: 2500, EUR: 1800 };
    const net = calculateNetBalance(income, expenses);
    expect(net["USD"]).toBe(500);
    expect(net["EUR"]).toBe(200);
  });
});

// ─── calculateTransferImpacts ──────────────────────────────────────────────────

type Transfer = Parameters<typeof calculateTransferImpacts>[0][number];

function makeTransfer(overrides: Partial<Transfer>): Transfer {
  return {
    id: "t1",
    sourceCurrencyCode: overrides.sourceCurrencyCode ?? "USD",
    targetCurrencyCode: overrides.targetCurrencyCode ?? "EUR",
    sourceAmount: overrides.sourceAmount ?? "1000",
    targetAmount: overrides.targetAmount ?? "900",
    feeAmount: overrides.feeAmount ?? null,
    taxAmount: overrides.taxAmount ?? null,
    effectiveFxRate: overrides.effectiveFxRate ?? null,
    occurredAt: overrides.occurredAt ?? new Date(),
  };
}

describe("calculateTransferImpacts", () => {
  it("subtracts source amount from source currency", () => {
    const { transferImpacts } = calculateTransferImpacts([
      makeTransfer({ sourceAmount: "1000", targetAmount: "900" }),
    ]);
    expect(transferImpacts["USD"]).toBe(-1000);
  });

  it("adds target amount to target currency", () => {
    const { transferImpacts } = calculateTransferImpacts([
      makeTransfer({ sourceAmount: "1000", targetAmount: "900" }),
    ]);
    expect(transferImpacts["EUR"]).toBe(900);
  });

  it("includes fees in source currency deduction", () => {
    const { transferImpacts, totalFees } = calculateTransferImpacts([
      makeTransfer({ sourceAmount: "1000", targetAmount: "900", feeAmount: "10" }),
    ]);
    // Source: -(1000 + 10) = -1010
    expect(transferImpacts["USD"]).toBe(-1010);
    expect(totalFees["USD"]).toBe(10);
  });

  it("includes taxes in source currency deduction", () => {
    const { transferImpacts, totalFees } = calculateTransferImpacts([
      makeTransfer({ sourceAmount: "1000", targetAmount: "900", taxAmount: "5" }),
    ]);
    expect(transferImpacts["USD"]).toBe(-1005);
    expect(totalFees["USD"]).toBe(5);
  });

  it("accumulates fees + taxes together", () => {
    const { totalFees } = calculateTransferImpacts([
      makeTransfer({ feeAmount: "10", taxAmount: "5" }),
    ]);
    expect(totalFees["USD"]).toBe(15);
  });

  it("accumulates multiple transfers in the same currency pair", () => {
    const { transferImpacts } = calculateTransferImpacts([
      makeTransfer({ sourceAmount: "1000", targetAmount: "900" }),
      makeTransfer({ sourceAmount: "500", targetAmount: "450" }),
    ]);
    expect(transferImpacts["USD"]).toBe(-1500);
    expect(transferImpacts["EUR"]).toBe(1350);
  });

  it("handles multi-currency transfers independently", () => {
    const { transferImpacts } = calculateTransferImpacts([
      makeTransfer({ sourceCurrencyCode: "USD", targetCurrencyCode: "EUR", sourceAmount: "1000", targetAmount: "900" }),
      makeTransfer({ sourceCurrencyCode: "EUR", targetCurrencyCode: "BRL", sourceAmount: "200", targetAmount: "1100" }),
    ]);
    expect(transferImpacts["USD"]).toBe(-1000);
    expect(transferImpacts["EUR"]).toBeCloseTo(900 - 200);
    expect(transferImpacts["BRL"]).toBe(1100);
  });

  it("returns empty objects for no transfers", () => {
    const { transferImpacts, totalFees } = calculateTransferImpacts([]);
    expect(Object.keys(transferImpacts)).toHaveLength(0);
    expect(Object.keys(totalFees)).toHaveLength(0);
  });
});

// ─── calculateSavingsData ──────────────────────────────────────────────────────

describe("calculateSavingsData", () => {
  it("combines starting balance + net income + transfer impacts", () => {
    const result = calculateSavingsData(
      "USD",
      "5000",
      { USD: 2000 },
      { USD: -500 },
    );
    expect(result.finalBalance).toBe(6500); // 5000+2000-500
  });

  it("handles null starting balance as 0", () => {
    const result = calculateSavingsData("USD", null, { USD: 1000 }, {});
    expect(result.startingBalance).toBe(0);
    expect(result.finalBalance).toBe(1000);
  });

  it("includes instrument transfer impact", () => {
    const result = calculateSavingsData("USD", "1000", { USD: 500 }, {}, { USD: 200 });
    expect(result.finalBalance).toBe(1700);
    expect(result.instrumentTransferImpact).toBe(200);
  });

  it("defaults instrument transfer impact to 0 when not provided", () => {
    const result = calculateSavingsData("USD", "0", {}, {});
    expect(result.instrumentTransferImpact).toBe(0);
  });

  it("returns correct breakdown fields", () => {
    const result = calculateSavingsData("EUR", "2000", { EUR: 1500 }, { EUR: -300 });
    expect(result.startingBalance).toBe(2000);
    expect(result.netIncome).toBe(1500);
    expect(result.transferImpact).toBe(-300);
  });
});
