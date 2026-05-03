import { db } from "@/db/client";
import {
  investmentPositions,
  investmentValuations,
  investmentFlows,
} from "@/db/schema";
import { and, asc, desc, eq, gte, lte, sum } from "drizzle-orm";

export type InvestmentKind = "invest" | "pension" | "crypto";

export type PositionFlow = {
  id: string;
  flowKind: "deposit" | "withdrawal" | "dividend";
  amount: number;
  occurredAt: Date;
  notes: string | null;
};

export type PositionValuation = {
  id: string;
  amount: number;
  asOf: Date;
  notes: string | null;
};

export type PositionSummary = {
  id: string;
  name: string;
  currencyCode: string;
  kind: InvestmentKind;
  institution: string | null;
  /** Latest market valuation entered, or null if none beyond year-start */
  latestValuation: PositionValuation | null;
  /** Opening valuation at the start of the year (seeded or last entry before year) */
  yearStartValuation: PositionValuation | null;
  /** All valuations in chronological order (for history display) */
  valuationHistory: PositionValuation[];
  /** Cash events within this year */
  ytdFlows: PositionFlow[];

  // ── Derived ──────────────────────────────────────────────────────────────
  yearStartValue: number;
  latestValue: number;
  /** Net cash put in: sum(deposits) − sum(withdrawals) YTD */
  netDepositsYTD: number;
  /** Cash dividends paid out YTD */
  dividendsYTD: number;
  /**
   * Total return = (latestValue − yearStartValue) + dividendsYTD
   * Adds back cash dividends that left the position so they're counted in returns.
   */
  totalReturn: number;
  /**
   * Market return = totalReturn − netDepositsYTD
   * Isolates pure price appreciation from external cash contributions.
   */
  marketReturn: number;
  /** totalReturn / yearStartValue × 100, or null when yearStartValue = 0 */
  totalReturnPct: number | null;
  /** marketReturn / yearStartValue × 100, or null when yearStartValue = 0 */
  marketReturnPct: number | null;
  /** True if latest valuation is from a prior year (position not yet updated this year) */
  isStale: boolean;
};

export type PortfolioData = {
  positions: PositionSummary[];
  /** Positions grouped by kind */
  byKind: Record<InvestmentKind, PositionSummary[]>;
  /** Latest total market value by currency across all positions */
  totalValueByCurrency: Record<string, number>;
  /** Year-start total value by currency */
  yearStartValueByCurrency: Record<string, number>;
  /** Total YTD return by currency */
  totalReturnByCurrency: Record<string, number>;
  /** Net deposits (contributions minus withdrawals) YTD by currency */
  netDepositsYTDByCurrency: Record<string, number>;
};

export async function fetchPortfolioData(
  userId: string,
  year: number
): Promise<PortfolioData> {
  const yearStart = new Date(Date.UTC(year, 0, 1));       // Jan 1 00:00 UTC
  const yearEnd   = new Date(Date.UTC(year + 1, 0, 1));  // Jan 1 next year 00:00 UTC

  // All active positions for this user
  const positions = await db
    .select()
    .from(investmentPositions)
    .where(
      and(
        eq(investmentPositions.userId, userId),
        eq(investmentPositions.isActive, true)
      )
    )
    .orderBy(investmentPositions.kind, investmentPositions.name);

  // All valuations for these positions
  const positionIds = positions.map((p) => p.id);
  if (positionIds.length === 0) {
    return { positions: [], byKind: { invest: [], pension: [], crypto: [] }, totalValueByCurrency: {}, yearStartValueByCurrency: {}, totalReturnByCurrency: {}, netDepositsYTDByCurrency: {} };
  }

  // Fetch all valuations at once (sorted oldest→newest for history)
  const allValuations = await db
    .select()
    .from(investmentValuations)
    .where(eq(investmentValuations.userId, userId))
    .orderBy(asc(investmentValuations.asOf));

  // Fetch all flows within the year at once
  const allFlows = await db
    .select()
    .from(investmentFlows)
    .where(
      and(
        eq(investmentFlows.userId, userId),
        gte(investmentFlows.occurredAt, yearStart),
        lte(investmentFlows.occurredAt, yearEnd)
      )
    )
    .orderBy(asc(investmentFlows.occurredAt));

  // Group by positionId for O(1) access
  const valuationsByPosition = new Map<string, typeof allValuations>();
  const flowsByPosition = new Map<string, typeof allFlows>();
  for (const pos of positions) {
    valuationsByPosition.set(pos.id, allValuations.filter((v) => v.positionId === pos.id));
    flowsByPosition.set(pos.id, allFlows.filter((f) => f.positionId === pos.id));
  }

  const summaries: PositionSummary[] = positions.map((pos) => {
    const valuations = valuationsByPosition.get(pos.id) ?? [];
    const flows = flowsByPosition.get(pos.id) ?? [];

    // Year-start: latest valuation with as_of <= yearStart
    const yearStartVal = [...valuations]
      .reverse()
      .find((v) => v.asOf <= yearStart) ?? null;

    // Latest: most recent valuation overall
    const latestVal = valuations.length > 0 ? valuations[valuations.length - 1] : null;

    const yearStartValue = Number(yearStartVal?.amount ?? 0);
    const latestValue    = Number(latestVal?.amount ?? 0);

    const deposits    = flows.filter((f) => f.flowKind === "deposit").reduce((s, f) => s + Number(f.amount), 0);
    const withdrawals = flows.filter((f) => f.flowKind === "withdrawal").reduce((s, f) => s + Number(f.amount), 0);
    const dividends   = flows.filter((f) => f.flowKind === "dividend").reduce((s, f) => s + Number(f.amount), 0);

    const netDepositsYTD = deposits - withdrawals;
    const totalReturn    = (latestValue - yearStartValue) + dividends;
    const marketReturn   = totalReturn - netDepositsYTD;

    const totalReturnPct  = yearStartValue !== 0 ? (totalReturn  / yearStartValue) * 100 : null;
    const marketReturnPct = yearStartValue !== 0 ? (marketReturn / yearStartValue) * 100 : null;

    // Stale = latest valuation is before this year started
    const isStale = latestVal !== null && latestVal.asOf < yearStart;

    return {
      id: pos.id,
      name: pos.name,
      currencyCode: pos.currencyCode,
      kind: pos.kind as InvestmentKind,
      institution: pos.institution,
      latestValuation: latestVal
        ? { id: latestVal.id, amount: Number(latestVal.amount), asOf: latestVal.asOf, notes: latestVal.notes }
        : null,
      yearStartValuation: yearStartVal
        ? { id: yearStartVal.id, amount: Number(yearStartVal.amount), asOf: yearStartVal.asOf, notes: yearStartVal.notes }
        : null,
      valuationHistory: valuations.map((v) => ({
        id: v.id,
        amount: Number(v.amount),
        asOf: v.asOf,
        notes: v.notes,
      })),
      ytdFlows: flows.map((f) => ({
        id: f.id,
        flowKind: f.flowKind as PositionFlow["flowKind"],
        amount: Number(f.amount),
        occurredAt: f.occurredAt,
        notes: f.notes,
      })),
      yearStartValue,
      latestValue,
      netDepositsYTD,
      dividendsYTD: dividends,
      totalReturn,
      marketReturn,
      totalReturnPct,
      marketReturnPct,
      isStale,
    };
  });

  // Aggregate per-currency totals
  const totalValueByCurrency:     Record<string, number> = {};
  const yearStartValueByCurrency: Record<string, number> = {};
  const totalReturnByCurrency:    Record<string, number> = {};
  const netDepositsYTDByCurrency: Record<string, number> = {};

  for (const s of summaries) {
    totalValueByCurrency[s.currencyCode]     = (totalValueByCurrency[s.currencyCode]     ?? 0) + s.latestValue;
    yearStartValueByCurrency[s.currencyCode] = (yearStartValueByCurrency[s.currencyCode] ?? 0) + s.yearStartValue;
    // Use marketReturn (true economic return) for currency-level aggregation
    totalReturnByCurrency[s.currencyCode]    = (totalReturnByCurrency[s.currencyCode]    ?? 0) + s.marketReturn;
    netDepositsYTDByCurrency[s.currencyCode] = (netDepositsYTDByCurrency[s.currencyCode] ?? 0) + s.netDepositsYTD;
  }

  const byKind: Record<InvestmentKind, PositionSummary[]> = {
    invest:  summaries.filter((s) => s.kind === "invest"),
    pension: summaries.filter((s) => s.kind === "pension"),
    crypto:  summaries.filter((s) => s.kind === "crypto"),
  };

  return {
    positions: summaries,
    byKind,
    totalValueByCurrency,
    yearStartValueByCurrency,
    totalReturnByCurrency,
    netDepositsYTDByCurrency,
  };
}
