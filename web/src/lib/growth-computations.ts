import { CurrencyTotals, addTo } from "./dashboard-computations";

export interface GrowthData {
  currency: string;
  // Cash-only figures (used for monthly chart)
  startingBalance: number;
  ytdIncome: number;
  ytdExpenses: number;
  netSavings: number;
  transferImpact: number;
  /** Net cash impact from instrument flows (portfolio withdrawals/deposits only) */
  instrumentTransferImpact: number;
  /** Net cash impact from loan flows (disbursements, payments, amortizations) */
  loanTransferImpact: number;
  totalFees: number;
  currentBalance: number;
  growthRate: number;
  monthlyBreakdown: MonthlyGrowthData[];
  // Portfolio / investment figures per currency
  portfolioYearStartValue: number;
  portfolioCurrentValue: number;
  portfolioNetDeposits: number;
  portfolioTotalReturn: number;
  // Asset (real estate, vehicles) figures per currency
  assetYearStartValue: number;
  assetCurrentValue: number;
  // Loan / mortgage liabilities per currency (active loans only)
  loanYearStartBalance: number;
  loanOutstandingBalance: number;
  // Combined wealth (cash + portfolio + assets − loans)
  wealthStartingBalance: number;
  wealthCurrentBalance: number;
  wealthGrowthRate: number;
}

export interface MonthlyGrowthData {
  month: number;
  monthName: string;
  startingBalance: number;
  income: number;
  expenses: number;
  netSavings: number;
  transferImpact: number;
  instrumentTransferImpact: number;
  loanTransferImpact: number;
  endingBalance: number;
}

export interface GrowthAnalytics {
  byCurrency: GrowthData[];
  totalTransfers: Array<{
    id: string;
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    sourceAmount: number;
    targetAmount: number;
    feeAmount: number;
    effectiveFxRate: number | null;
    occurredAt: Date;
    month: number;
  }>;
  totalFeesByCurrency: CurrencyTotals;
}

/**
 * Calculates comprehensive growth analytics for net worth visualization
 */
export function calculateGrowthAnalytics(
  allSavingsLines: Array<{ amount: string | null; currencyCode: string | null }>,
  yearNetActual: CurrencyTotals,
  transferImpacts: CurrencyTotals,
  totalFees: CurrencyTotals,
  yearTransfers: Array<{
    id: string;
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    sourceAmount: string;
    targetAmount: string;
    feeAmount: string | null;
    taxAmount: string | null;
    effectiveFxRate: string | null;
    occurredAt: Date;
  }>,
  monthlyData: Array<{
    month: number;
    name: string;
    plannedIncome: CurrencyTotals;
    actualIncome: CurrencyTotals;
    plannedExpenses: CurrencyTotals;
    actualExpenses: CurrencyTotals;
  }>,
  portfolioYearStart: Record<string, number> = {},
  portfolioLatest: Record<string, number> = {},
  portfolioTotalReturn: Record<string, number> = {},
  portfolioNetDeposits: Record<string, number> = {},
  /** Net cash impact of portfolio instrument transfers per currency (from fetchDashboardData) */
  instrumentTransferImpacts: CurrencyTotals = {},
  /** Net cash impact of loan transfers per currency (disbursements, payments, amortizations) */
  loanTransferImpacts: CurrencyTotals = {},
  yearInstrumentTransfers: Array<{
    accountId: string;
    direction: string;
    amount: string;
    currencyCode: string;
    occurredAt: Date;
  }> = [],
  yearLoanTransfers: Array<{
    accountId: string;
    direction: string;
    amount: string;
    currencyCode: string;
    occurredAt: Date;
  }> = [],
  loanOutstandingByCurrency: Record<string, number> = {},
  assetValueByCurrency: Record<string, number> = {},
  loanYearStartByCurrency: Record<string, number> = {},
  assetYearStartByCurrency: Record<string, number> = {},
): GrowthAnalytics {
  // Get all unique currencies from savings, income/expenses, transfers, and portfolio
  const allCurrencies = new Set<string>();
  
  // Add currencies from starting savings
  allSavingsLines.forEach(line => {
    if (line.currencyCode) allCurrencies.add(line.currencyCode);
  });
  
  // Add currencies from net income/expenses
  Object.keys(yearNetActual).forEach(currency => allCurrencies.add(currency));
  
  // Add currencies from transfers
  yearTransfers.forEach(transfer => {
    allCurrencies.add(transfer.sourceCurrencyCode);
    allCurrencies.add(transfer.targetCurrencyCode);
  });

  // Add currencies from portfolio positions
  Object.keys(portfolioYearStart).forEach(c => allCurrencies.add(c));
  Object.keys(portfolioLatest).forEach(c => allCurrencies.add(c));

  // Add currencies from loans and assets
  Object.keys(loanOutstandingByCurrency).forEach(c => allCurrencies.add(c));
  Object.keys(assetValueByCurrency).forEach(c => allCurrencies.add(c));

  // Calculate growth data for each currency
  const byCurrency: GrowthData[] = Array.from(allCurrencies).map(currency => {
    // Get starting balance for this currency
    const startingSavings = allSavingsLines.find(line => line.currencyCode === currency);
    const startingBalance = Number(startingSavings?.amount || 0);
    
    // Get net income/expenses for this currency
    const netSavings = yearNetActual[currency] || 0;
    
    // Get transfer impact and fees for this currency
    const transferImpact = transferImpacts[currency] || 0;
    const fees = totalFees[currency] || 0;
    const instrumentTransferImpact = instrumentTransferImpacts[currency] || 0;
    const loanTransferImpact = loanTransferImpacts[currency] || 0;
    
    // Calculate current balance (portfolio + loan flows both affect cash)
    const currentBalance = startingBalance + netSavings + transferImpact + instrumentTransferImpact + loanTransferImpact;
    
    // Calculate growth rate
    const growthRate = startingBalance !== 0 
      ? ((currentBalance - startingBalance) / Math.abs(startingBalance)) * 100 
      : (currentBalance !== 0 ? 100 : 0);

    // Calculate monthly breakdown
    const monthlyBreakdown: MonthlyGrowthData[] = [];
    let runningBalance = startingBalance;
    
    monthlyData.forEach(month => {
      const monthIncome = month.actualIncome[currency] || 0;
      const monthExpenses = month.actualExpenses[currency] || 0;
      const monthNetSavings = monthIncome - monthExpenses;
      
      // Calculate transfer impact for this month
      const monthTransfers = yearTransfers.filter(transfer => {
        const transferMonth = new Date(transfer.occurredAt).getUTCMonth() + 1;
        return transferMonth === month.month && (
          transfer.sourceCurrencyCode === currency || 
          transfer.targetCurrencyCode === currency
        );
      });
      
      let monthTransferImpact = 0;
      monthTransfers.forEach(transfer => {
        if (transfer.sourceCurrencyCode === currency) {
          monthTransferImpact -= (Number(transfer.sourceAmount) + Number(transfer.feeAmount || 0) + Number(transfer.taxAmount || 0));
        }
        if (transfer.targetCurrencyCode === currency) {
          monthTransferImpact += Number(transfer.targetAmount);
        }
      });

      // Portfolio instrument transfers for this month and currency (investment_position only)
      const monthInstrumentTransfers = yearInstrumentTransfers.filter(it => {
        const itMonth = new Date(it.occurredAt).getUTCMonth() + 1;
        return itMonth === month.month && it.currencyCode === currency;
      });
      let monthInstrumentTransferImpact = 0;
      for (const it of monthInstrumentTransfers) {
        const sign = it.direction === "from_instrument" ? 1 : -1;
        monthInstrumentTransferImpact += sign * Number(it.amount);
      }

      // Loan transfers for this month (disbursements, payments, amortizations)
      const monthLoanTransfers = yearLoanTransfers.filter(lt => {
        const ltMonth = new Date(lt.occurredAt).getUTCMonth() + 1;
        return ltMonth === month.month && lt.currencyCode === currency;
      });
      let monthLoanTransferImpact = 0;
      for (const lt of monthLoanTransfers) {
        const sign = lt.direction === "from_instrument" ? 1 : -1;
        monthLoanTransferImpact += sign * Number(lt.amount);
      }

      const endingBalance = runningBalance + monthNetSavings + monthTransferImpact + monthInstrumentTransferImpact + monthLoanTransferImpact;
      
      monthlyBreakdown.push({
        month: month.month,
        monthName: month.name,
        startingBalance: runningBalance,
        income: monthIncome,
        expenses: monthExpenses,
        netSavings: monthNetSavings,
        transferImpact: monthTransferImpact,
        instrumentTransferImpact: monthInstrumentTransferImpact,
        loanTransferImpact: monthLoanTransferImpact,
        endingBalance
      });
      
      runningBalance = endingBalance;
    });

    const portYearStart   = portfolioYearStart[currency]   ?? 0;
    const portCurrent     = portfolioLatest[currency]       ?? 0;
    const portTotalReturn = portfolioTotalReturn[currency]  ?? 0;
    const portNetDeposits = portfolioNetDeposits[currency]  ?? 0;

    const assetYearStart  = assetYearStartByCurrency[currency]  ?? 0;
    const assetCurrent    = assetValueByCurrency[currency]       ?? 0;
    const loanYearStart   = loanYearStartByCurrency[currency]    ?? 0;
    const loanCurrent     = loanOutstandingByCurrency[currency]  ?? 0;

    const wealthStartingBalance = startingBalance + portYearStart + assetYearStart - loanYearStart;
    const wealthCurrentBalance  = currentBalance  + portCurrent   + assetCurrent   - loanCurrent;
    const wealthGrowthRate = wealthStartingBalance !== 0
      ? ((wealthCurrentBalance - wealthStartingBalance) / Math.abs(wealthStartingBalance)) * 100
      : (wealthCurrentBalance !== 0 ? 100 : 0);

    return {
      currency,
      startingBalance,
      ytdIncome: monthlyData.reduce((sum, month) => sum + (month.actualIncome[currency] || 0), 0),
      ytdExpenses: monthlyData.reduce((sum, month) => sum + (month.actualExpenses[currency] || 0), 0),
      netSavings,
      transferImpact,
      instrumentTransferImpact,
      loanTransferImpact,
      totalFees: fees,
      currentBalance,
      growthRate,
      monthlyBreakdown,
      portfolioYearStartValue: portYearStart,
      portfolioCurrentValue: portCurrent,
      portfolioNetDeposits: portNetDeposits,
      portfolioTotalReturn: portTotalReturn,
      assetYearStartValue: assetYearStart,
      assetCurrentValue: assetCurrent,
      loanYearStartBalance: loanYearStart,
      loanOutstandingBalance: loanCurrent,
      wealthStartingBalance,
      wealthCurrentBalance,
      wealthGrowthRate,
    };
  });

  // Process transfers with month information
  const totalTransfers = yearTransfers.map(transfer => ({
    ...transfer,
    sourceAmount: Number(transfer.sourceAmount),
    targetAmount: Number(transfer.targetAmount),
    feeAmount: Number(transfer.feeAmount || 0) + Number(transfer.taxAmount || 0),
    effectiveFxRate: transfer.effectiveFxRate ? Number(transfer.effectiveFxRate) : null,
    month: new Date(transfer.occurredAt).getUTCMonth() + 1
  }));

  return {
    byCurrency,
    totalTransfers,
    totalFeesByCurrency: totalFees
  };
}
