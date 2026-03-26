import React from "react";
import { formatCurrency } from "../planning/currency-format";
import { GrowthAnalytics, GrowthData } from "@/lib/growth-computations";

interface GrowthTabProps {
  growthAnalytics: GrowthAnalytics;
  currentMonthIdx: number;
}

export function GrowthTab({ growthAnalytics, currentMonthIdx }: GrowthTabProps) {
  const { byCurrency, totalTransfers, totalFeesByCurrency } = growthAnalytics;

  return (
    <div className="space-y-6">
      {/* Net Worth Overview */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Net Worth Growth</h2>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {byCurrency.map((currency) => (
            <CurrencyGrowthCard key={currency.currency} currency={currency} />
          ))}
        </div>
      </div>

      {/* Monthly Progress Charts */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Monthly Progress</h3>
        
        <div className="space-y-8">
          {byCurrency.map((currency) => (
            <MonthlyProgressChart key={currency.currency} currency={currency} currentMonthIdx={currentMonthIdx} />
          ))}
        </div>
      </div>

      {/* FX Transfers Summary */}
      {totalTransfers.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">FX Transfers</h3>
          
          <div className="space-y-4">
            {/* Recent Transfers */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 pr-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Date</th>
                    <th className="py-2 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">From</th>
                    <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                    <th className="py-2 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">To</th>
                    <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                    <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Rate</th>
                    <th className="py-2 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">Fees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {totalTransfers.slice(0, 10).map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-50">
                        {new Date(transfer.occurredAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                        {transfer.sourceCurrencyCode}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(transfer.sourceAmount, transfer.sourceCurrencyCode)}
                      </td>
                      <td className="py-2 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                        {transfer.targetCurrencyCode}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(transfer.targetAmount, transfer.targetCurrencyCode)}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-500 dark:text-zinc-400">
                        {transfer.effectiveFxRate ? transfer.effectiveFxRate.toFixed(4) : 'N/A'}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(transfer.feeAmount, transfer.sourceCurrencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalTransfers.length > 10 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                  Showing 10 of {totalTransfers.length} transfers
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CurrencyGrowthCard({ currency }: { currency: GrowthData }) {
  const isPositiveGrowth = currency.growthRate >= 0;
  
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{currency.currency}</h3>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isPositiveGrowth 
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {isPositiveGrowth ? '↑' : '↓'} {Math.abs(currency.growthRate).toFixed(1)}%
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Starting</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(currency.startingBalance, currency.currency)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Income</span>
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(currency.ytdIncome, currency.currency)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Expenses</span>
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            -{formatCurrency(currency.ytdExpenses, currency.currency)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">FX Impact</span>
          <span className={`text-sm font-medium ${
            currency.transferImpact >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {currency.transferImpact >= 0 ? '+' : ''}{formatCurrency(currency.transferImpact, currency.currency)}
          </span>
        </div>
        
        {currency.totalFees > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Fees</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              -{formatCurrency(currency.totalFees, currency.currency)}
            </span>
          </div>
        )}
        
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Current</span>
            <span className={`text-base font-bold ${
              isPositiveGrowth ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(currency.currentBalance, currency.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyProgressChart({ currency, currentMonthIdx }: { currency: GrowthData; currentMonthIdx: number }) {
  const ytdMonths = currency.monthlyBreakdown.filter(month => month.month <= currentMonthIdx + 1);
  const maxBalance = Math.max(...ytdMonths.map(m => m.endingBalance), 1);
  
  return (
    <div>
      <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-3">{currency.currency} Progress</h4>
      
      <div className="space-y-2">
        {ytdMonths.map((month) => (
          <div key={month.month} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 w-12">
                {month.monthName}
              </span>
              <div className="flex items-center gap-3">
                {month.transferImpact !== 0 && (
                  <span className={`font-medium ${
                    month.transferImpact >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    FX {month.transferImpact >= 0 ? '+' : ''}{formatCurrency(month.transferImpact, currency.currency)}
                  </span>
                )}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(month.endingBalance, currency.currency)}
                </span>
              </div>
            </div>
            
            <div className="relative">
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-zinc-300 dark:bg-zinc-600 rounded-full transition-all duration-300"
                  style={{ width: `${(month.endingBalance / maxBalance) * 100}%` }}
                />
              </div>
              <div 
                className="absolute w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full"
                style={{ left: `${(month.endingBalance / maxBalance) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Start: </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(currency.startingBalance, currency.currency)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Net Savings: </span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatCurrency(currency.netSavings, currency.currency)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Current: </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(currency.currentBalance, currency.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
