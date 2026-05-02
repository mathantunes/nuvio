import { CurrencyTotals, addTo } from "./dashboard-computations";

export interface GrowthData {
  currency: string;
  // Cash-only figures (used for monthly chart)
  startingBalance: number;
  ytdIncome: number;
  ytdExpenses: number;
  netSavings: number;
  transferImpact: number;
  totalFees: number;
  currentBalance: number;
  growthRate: number;
  monthlyBreakdown: MonthlyGrowthData[];
  // Portfolio / investment figures per currency
  portfolioYearStartValue: number;
  portfolioCurrentValue: number;
  portfolioTotalReturn: number;
  // Combined wealth (cash + portfolio)
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
    
    // Calculate current balance
    const currentBalance = startingBalance + netSavings + transferImpact;
    
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
      
      const endingBalance = runningBalance + monthNetSavings + monthTransferImpact;
      
      monthlyBreakdown.push({
        month: month.month,
        monthName: month.name,
        startingBalance: runningBalance,
        income: monthIncome,
        expenses: monthExpenses,
        netSavings: monthNetSavings,
        transferImpact: monthTransferImpact,
        endingBalance
      });
      
      runningBalance = endingBalance;
    });

    const portYearStart   = portfolioYearStart[currency]   ?? 0;
    const portCurrent     = portfolioLatest[currency]       ?? 0;
    const portTotalReturn = portfolioTotalReturn[currency]  ?? 0;

    const wealthStartingBalance = startingBalance + portYearStart;
    const wealthCurrentBalance  = currentBalance  + portCurrent;
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
      totalFees: fees,
      currentBalance,
      growthRate,
      monthlyBreakdown,
      portfolioYearStartValue: portYearStart,
      portfolioCurrentValue: portCurrent,
      portfolioTotalReturn: portTotalReturn,
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
