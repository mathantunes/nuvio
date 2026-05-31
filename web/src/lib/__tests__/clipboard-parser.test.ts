import { describe, it, expect } from "vitest";
import { detectDelimiter, parseClipboard } from "../clipboard-parser";

describe("detectDelimiter", () => {
  it("detects tab delimiter", () => {
    expect(detectDelimiter("Rent\t1000\t1000")).toBe("\t");
  });

  it("detects semicolon delimiter", () => {
    expect(detectDelimiter("Rent;1000;1000")).toBe(";");
  });

  it("defaults to comma", () => {
    expect(detectDelimiter("Rent,1000,1000")).toBe(",");
  });

  it("prefers tab over comma if both present", () => {
    expect(detectDelimiter("Rent,Value\t1000")).toBe("\t");
  });
});

describe("parseClipboard", () => {
  const BASE = "USD";
  const KIND = "expense" as const;

  it("parses a simple comma-delimited row", () => {
    const text = "Rent,1000,,,,,,,,,,";
    const { rows, skipped } = parseClipboard(text, BASE, KIND);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryName).toBe("Rent");
    expect(rows[0].currencyCode).toBe("USD");
    expect(rows[0].kind).toBe("expense");
    expect(rows[0].amounts).toContainEqual({ month: 1, amount: 1000 });
    expect(skipped).toHaveLength(0);
  });

  it("parses tab-delimited input", () => {
    const text = "Salary\t3000\t3000";
    const { rows } = parseClipboard(text, BASE, "income");
    expect(rows).toHaveLength(1);
    expect(rows[0].amounts).toEqual([
      { month: 1, amount: 3000 },
      { month: 2, amount: 3000 },
    ]);
  });

  it("strips trailing currency codes from cells", () => {
    const text = "Groceries,150.5 CHF,200 CHF";
    const { rows, skipped } = parseClipboard(text, "CHF", KIND);
    expect(skipped).toHaveLength(0);
    expect(rows[0].amounts).toEqual([
      { month: 1, amount: 150.5 },
      { month: 2, amount: 200 },
    ]);
  });

  it("replaces comma decimal separator", () => {
    const text = "Utilities;8,94;10,50";
    const { rows } = parseClipboard(text, BASE, KIND);
    expect(rows[0].amounts).toEqual([
      { month: 1, amount: 8.94 },
      { month: 2, amount: 10.5 },
    ]);
  });

  it("skips rows whose first cell starts with a digit", () => {
    const text = "123totals,1000,2000";
    const { rows, skipped } = parseClipboard(text, BASE, KIND);
    expect(rows).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/category name/i);
  });

  it("skips rows with no valid amounts", () => {
    const text = "EmptyRow,,,,";
    const { rows, skipped } = parseClipboard(text, BASE, KIND);
    expect(rows).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/no valid amounts/i);
  });

  it("skips zero amounts", () => {
    const text = "Rent,0,1000";
    const { rows } = parseClipboard(text, BASE, KIND);
    expect(rows[0].amounts).toEqual([{ month: 2, amount: 1000 }]);
  });

  it("skips blank lines silently", () => {
    const text = "Rent,1000\n\nGroceries,500";
    const { rows, skipped } = parseClipboard(text, BASE, KIND);
    expect(rows).toHaveLength(2);
    expect(skipped).toHaveLength(0);
  });

  it("handles up to 12 months", () => {
    const amounts = Array.from({ length: 12 }, () => "100").join(",");
    const { rows } = parseClipboard(`Rent,${amounts}`, BASE, KIND);
    expect(rows[0].amounts).toHaveLength(12);
    expect(rows[0].amounts[11]).toEqual({ month: 12, amount: 100 });
  });

  it("assigns unique keys to each row", () => {
    const text = "Rent,1000\nGroceries,500";
    const { rows } = parseClipboard(text, BASE, KIND);
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("multi-row mixed valid and skipped", () => {
    const text = [
      "Salary,3000",
      "1header,100",
      "NoAmounts,,",
      "Bills,200",
    ].join("\n");
    const { rows, skipped } = parseClipboard(text, BASE, KIND);
    expect(rows).toHaveLength(2);
    expect(skipped).toHaveLength(2);
  });
});
