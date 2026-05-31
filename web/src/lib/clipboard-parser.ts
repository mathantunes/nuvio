export type ParsedClipboardRow = {
  key: string;
  categoryName: string;
  kind: "income" | "expense";
  currencyCode: string;
  amounts: { month: number; amount: number }[];
};

export type SkippedClipboardRow = {
  raw: string;
  reason: string;
};

export type ParseClipboardResult = {
  rows: ParsedClipboardRow[];
  skipped: SkippedClipboardRow[];
};

export function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] ?? "";
  if (firstLine.includes("\t")) return "\t";
  if (firstLine.includes(";")) return ";";
  return ",";
}

export function parseClipboard(
  text: string,
  baseCurrency: string,
  defaultKind: "income" | "expense"
): ParseClipboardResult {
  const delimiter = detectDelimiter(text);
  const lines = text.trim().split("\n").map((l) => l.trimEnd());
  const rows: ParsedClipboardRow[] = [];
  const skipped: SkippedClipboardRow[] = [];

  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const cells = line.split(delimiter);
    const categoryName = cells[0]?.trim() ?? "";

    if (!categoryName || /^\d/.test(categoryName)) {
      skipped.push({ raw: line, reason: "First cell is not a category name" });
      return;
    }

    const amounts: { month: number; amount: number }[] = [];
    for (let col = 1; col <= 12; col++) {
      // Strip trailing currency codes/symbols (e.g. "8.94 CHF" → "8.94")
      const raw = (cells[col]?.trim().replace(/[A-Z]{3}$/, "").trim().replace(",", ".")) ?? "";
      if (!raw) continue;
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) {
        amounts.push({ month: col, amount: val });
      }
    }

    if (amounts.length === 0) {
      skipped.push({ raw: line, reason: "No valid amounts found" });
      return;
    }

    rows.push({
      key: `row-${i}`,
      categoryName,
      kind: defaultKind,
      currencyCode: baseCurrency,
      amounts,
    });
  });

  return { rows, skipped };
}
