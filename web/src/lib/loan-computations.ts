import { db } from "@/db/client";
import { loans, loanPayments, loanAmortizations, assets, assetValuations } from "@/db/schema";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import { simulateSAC, type ExtraAmortization, type SimulationResult } from "./loan-simulation";

export type LoanStatus = "simulation" | "active" | "closed";

export type LoanAmortizationRecord = {
  id: string;
  amount: number;
  kind: string;
  occurredAt: Date;
  notes: string | null;
};

export type LoanPaymentRecord = {
  id: string;
  paymentDate: Date;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  notes: string | null;
};

export type AssetValuationRecord = {
  id: string;
  value: number;
  currencyCode: string;
  valuedAt: Date;
  notes: string | null;
};

export type AssetSummary = {
  id: string;
  name: string;
  kind: string;
  currencyCode: string;
  purchasePrice: number;
  purchasedAt: Date;
  latestValuation: AssetValuationRecord | null;
  yearStartValuation: AssetValuationRecord | null;
  currentValue: number;
  yearStartValue: number;
};

export type LoanSummary = {
  id: string;
  name: string;
  lender: string;
  principal: number;
  currencyCode: string;
  interestRate: number;
  termMonths: number;
  startDate: Date;
  status: LoanStatus;
  notes: string | null;
  asset: AssetSummary | null;
  // Recorded events
  payments: LoanPaymentRecord[];
  amortizations: LoanAmortizationRecord[];
  // Computed
  outstandingBalance: number;
  principalPaid: number;
  interestPaidYTD: number;
  interestPaidTotal: number;
  /** Runtime-computed schedule from current outstanding balance */
  schedule: SimulationResult;
};

export type LoanData = {
  loans: LoanSummary[];
  /** All active assets for the user (regardless of loan linkage) */
  allAssets: AssetSummary[];
  /** Outstanding balance per currency (active loans only — simulations excluded) */
  outstandingBalanceByCurrency: Record<string, number>;
  /** Latest asset value per currency (active loans only) */
  assetValueByCurrency: Record<string, number>;
  /** Outstanding balance as of Jan 1 of the year (active loans only) */
  yearStartOutstandingByCurrency: Record<string, number>;
  /** Asset value as of Jan 1 of the year (active loans only) */
  yearStartAssetValueByCurrency: Record<string, number>;
};

function addTo(map: Record<string, number>, currency: string, amount: number) {
  map[currency] = (map[currency] ?? 0) + amount;
}

export async function fetchLoanData(userId: string, year: number): Promise<LoanData> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const [allLoans, allPayments, allAmortizations, allAssets, allAssetValuations] =
    await Promise.all([
      db.select().from(loans).where(eq(loans.userId, userId)).orderBy(asc(loans.createdAt)),
      db.select().from(loanPayments).where(eq(loanPayments.userId, userId)).orderBy(asc(loanPayments.paymentDate)),
      db.select().from(loanAmortizations).where(eq(loanAmortizations.userId, userId)).orderBy(asc(loanAmortizations.occurredAt)),
      db.select().from(assets).where(and(eq(assets.userId, userId), eq(assets.isActive, true))),
      db.select().from(assetValuations).where(eq(assetValuations.userId, userId)).orderBy(asc(assetValuations.valuedAt)),
    ]);

  const outstandingBalanceByCurrency: Record<string, number> = {};
  const assetValueByCurrency: Record<string, number> = {};
  const yearStartOutstandingByCurrency: Record<string, number> = {};
  const yearStartAssetValueByCurrency: Record<string, number> = {};

  const loanSummaries: LoanSummary[] = allLoans.map((loan) => {
    const loanPaymentsList: LoanPaymentRecord[] = allPayments
      .filter((p) => p.loanId === loan.id)
      .map((p) => ({
        id: p.id,
        paymentDate: p.paymentDate,
        totalAmount: Number(p.totalAmount),
        principalAmount: Number(p.principalAmount),
        interestAmount: Number(p.interestAmount),
        remainingBalance: Number(p.remainingBalance),
        notes: p.notes,
      }));

    const loanAmortizationsList: LoanAmortizationRecord[] = allAmortizations
      .filter((a) => a.loanId === loan.id)
      .map((a) => ({
        id: a.id,
        amount: Number(a.amount),
        kind: a.kind,
        occurredAt: a.occurredAt,
        notes: a.notes,
      }));

    const principalPaid = loanPaymentsList.reduce((s, p) => s + p.principalAmount, 0);
    const amortizationsPaid = loanAmortizationsList.reduce((s, a) => s + a.amount, 0);
    const outstandingBalance = Math.max(0, Number(loan.principal) - principalPaid - amortizationsPaid);

    const interestPaidTotal = loanPaymentsList.reduce((s, p) => s + p.interestAmount, 0);
    const interestPaidYTD = loanPaymentsList
      .filter((p) => p.paymentDate >= yearStart && p.paymentDate <= yearEnd)
      .reduce((s, p) => s + p.interestAmount, 0);

    // Compute outstanding balance as of Jan 1 (year-start)
    // If the loan's start date is after year start, it didn't exist yet → balance was 0
    const loanStartedAfterYearStart = new Date(loan.startDate) > yearStart;
    const paymentsBeforeYear = loanPaymentsList.filter((p) => p.paymentDate < yearStart);
    const amortizationsBeforeYear = loanAmortizationsList.filter((a) => a.occurredAt < yearStart);
    const principalPaidBeforeYear = paymentsBeforeYear.reduce((s, p) => s + p.principalAmount, 0);
    const amortizationsPaidBeforeYear = amortizationsBeforeYear.reduce((s, a) => s + a.amount, 0);
    const yearStartOutstanding = loanStartedAfterYearStart
      ? 0
      : Math.max(0, Number(loan.principal) - principalPaidBeforeYear - amortizationsPaidBeforeYear);

    // Build runtime schedule from current outstanding balance + remaining term
    const regularPaidMonths = loanPaymentsList.length;
    const remainingTerm = Math.max(0, loan.termMonths - regularPaidMonths);
    const extraAmorts: ExtraAmortization[] = loanAmortizationsList.map((a, i) => ({
      atMonth: i + 1,
      amount: a.amount,
    }));
    const schedule = simulateSAC(
      {
        principal: outstandingBalance,
        annualRatePercent: Number(loan.interestRate),
        termMonths: Math.max(1, remainingTerm),
        startDate: new Date(loan.startDate),
      },
      extraAmorts
    );

    // Linked asset
    let assetSummary: AssetSummary | null = null;
    if (loan.assetId) {
      const asset = allAssets.find((a) => a.id === loan.assetId);
      if (asset) {
        const valuations = allAssetValuations
          .filter((v) => v.assetId === asset.id)
          .map((v) => ({
            id: v.id,
            value: Number(v.value),
            currencyCode: v.currencyCode,
            valuedAt: v.valuedAt,
            notes: v.notes,
          }));
        const latestValuation = valuations.length > 0 ? valuations[valuations.length - 1] : null;
        const yearStartValuation =
          valuations.filter((v) => v.valuedAt <= yearStart).slice(-1)[0] ?? null;

        assetSummary = {
          id: asset.id,
          name: asset.name,
          kind: asset.kind,
          currencyCode: asset.currencyCode,
          purchasePrice: Number(asset.purchasePrice),
          purchasedAt: asset.purchasedAt,
          latestValuation,
          yearStartValuation,
          currentValue: latestValuation?.value ?? Number(asset.purchasePrice),
          yearStartValue: yearStartValuation?.value ?? Number(asset.purchasePrice),
        };
      }
    }

    // Only active loans contribute to wealth computation
    if (loan.status === "active") {
      addTo(outstandingBalanceByCurrency, loan.currencyCode, outstandingBalance);
      addTo(yearStartOutstandingByCurrency, loan.currencyCode, yearStartOutstanding);

      if (assetSummary) {
        addTo(assetValueByCurrency, assetSummary.currencyCode, assetSummary.currentValue);
        addTo(yearStartAssetValueByCurrency, assetSummary.currencyCode, assetSummary.yearStartValue);
      }
    }

    return {
      id: loan.id,
      name: loan.name,
      lender: loan.lender,
      principal: Number(loan.principal),
      currencyCode: loan.currencyCode,
      interestRate: Number(loan.interestRate),
      termMonths: loan.termMonths,
      startDate: loan.startDate,
      status: loan.status as LoanStatus,
      notes: loan.notes,
      asset: assetSummary,
      payments: loanPaymentsList,
      amortizations: loanAmortizationsList,
      outstandingBalance,
      principalPaid,
      interestPaidYTD,
      interestPaidTotal,
      schedule,
    };
  });

  // Build AssetSummary for ALL assets (not just loan-linked ones)
  const allAssetSummaries: AssetSummary[] = allAssets.map((asset) => {
    const valuations = allAssetValuations
      .filter((v) => v.assetId === asset.id)
      .map((v) => ({
        id: v.id,
        value: Number(v.value),
        currencyCode: v.currencyCode,
        valuedAt: v.valuedAt,
        notes: v.notes,
      }));
    const latestValuation = valuations.length > 0 ? valuations[valuations.length - 1] : null;
    const yearStartValuation =
      valuations.filter((v) => v.valuedAt <= yearStart).slice(-1)[0] ?? null;
    return {
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      currencyCode: asset.currencyCode,
      purchasePrice: Number(asset.purchasePrice),
      purchasedAt: asset.purchasedAt,
      latestValuation,
      yearStartValuation,
      currentValue: latestValuation?.value ?? Number(asset.purchasePrice),
      yearStartValue: yearStartValuation?.value ?? Number(asset.purchasePrice),
    };
  });

  return {
    loans: loanSummaries,
    allAssets: allAssetSummaries,
    outstandingBalanceByCurrency,
    assetValueByCurrency,
    yearStartOutstandingByCurrency,
    yearStartAssetValueByCurrency,
  };
}
