"use client";

import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
        <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Wealth Growth</h2>
        
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
  const hasPortfolio = currency.portfolioYearStartValue > 0 || currency.portfolioCurrentValue > 0;
  const hasAssets = currency.assetYearStartValue > 0 || currency.assetCurrentValue > 0;
  const hasLoans = currency.loanYearStartBalance > 0 || currency.loanOutstandingBalance > 0;
  const isPositiveWealth = currency.wealthGrowthRate >= 0;
  const isPositiveCash = currency.growthRate >= 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{currency.currency}</h3>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isPositiveWealth
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {isPositiveWealth ? '↑' : '↓'} {Math.abs(currency.wealthGrowthRate).toFixed(1)}%
        </div>
      </div>

      {/* Total wealth summary */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Total wealth (start)</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(currency.wealthStartingBalance, currency.currency)}
          </span>
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Total wealth (now)</span>
            <span className={`text-base font-bold ${
              isPositiveWealth ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(currency.wealthCurrentBalance, currency.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Wealth composition breakdown */}
      <details className="group mb-2" open>
        <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-2">
          Wealth breakdown
        </summary>
        <div className="space-y-1.5 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Cash
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1">(incl. portfolio flows)</span>
            </span>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
              {formatCurrency(currency.currentBalance, currency.currency)}
            </span>
          </div>
          {hasPortfolio && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Portfolio</span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {formatCurrency(currency.portfolioCurrentValue, currency.currency)}
              </span>
            </div>
          )}
          {hasAssets && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Assets</span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                +{formatCurrency(currency.assetCurrentValue, currency.currency)}
              </span>
            </div>
          )}
          {hasLoans && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Loan liabilities</span>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                −{formatCurrency(currency.loanOutstandingBalance, currency.currency)}
              </span>
            </div>
          )}
          {hasAssets && hasLoans && (
            <div className="flex justify-between items-center pt-1 border-t border-dashed border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Asset equity</span>
              <span className={`text-xs font-medium ${
                currency.assetCurrentValue - currency.loanOutstandingBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(currency.assetCurrentValue - currency.loanOutstandingBalance, currency.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">= Net wealth</span>
            <span className={`text-xs font-bold ${
              isPositiveWealth ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(currency.wealthCurrentBalance, currency.currency)}
            </span>
          </div>
        </div>
      </details>

      {/* Cash flow breakdown */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-2">
          Cash flow detail {isPositiveCash ? '↑' : '↓'} {Math.abs(currency.growthRate).toFixed(1)}%
        </summary>
        <div className="space-y-2 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Starting cash</span>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
              {formatCurrency(currency.startingBalance, currency.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Income</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(currency.ytdIncome, currency.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Expenses</span>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              -{formatCurrency(currency.ytdExpenses, currency.currency)}
            </span>
          </div>
          {currency.transferImpact !== 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">FX Impact</span>
              <span className={`text-xs font-medium ${
                currency.transferImpact >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {currency.transferImpact >= 0 ? '+' : ''}{formatCurrency(currency.transferImpact, currency.currency)}
              </span>
            </div>
          )}
          {currency.instrumentTransferImpact !== 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Portfolio flows</span>
              <span className={`text-xs font-medium ${
                currency.instrumentTransferImpact >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'
              }`}>
                {currency.instrumentTransferImpact >= 0 ? '+' : ''}{formatCurrency(currency.instrumentTransferImpact, currency.currency)}
              </span>
            </div>
          )}
          {currency.loanTransferImpact !== 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Loan flows</span>
              <span className={`text-xs font-medium ${
                currency.loanTransferImpact >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {currency.loanTransferImpact >= 0 ? '+' : ''}{formatCurrency(currency.loanTransferImpact, currency.currency)}
              </span>
            </div>
          )}
          {currency.totalFees > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Fees</span>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                -{formatCurrency(currency.totalFees, currency.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Current cash</span>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
              {formatCurrency(currency.currentBalance, currency.currency)}
            </span>
          </div>
        </div>
      </details>

      {/* Portfolio breakdown */}
      {hasPortfolio && (
        <details className="group mt-2">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-2">
            Portfolio detail
          </summary>
          <div className="space-y-2 pl-2 border-l-2 border-indigo-100 dark:border-indigo-900 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Portfolio (Jan 1)</span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                {formatCurrency(currency.portfolioYearStartValue, currency.currency)}
              </span>
            </div>
            {currency.portfolioNetDeposits !== 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Net deposits / withdrawals</span>
                <span className={`text-xs font-medium ${
                  currency.portfolioNetDeposits >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {currency.portfolioNetDeposits >= 0 ? '+' : ''}{formatCurrency(currency.portfolioNetDeposits, currency.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Market return</span>
              <span className={`text-xs font-medium ${
                currency.portfolioTotalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {currency.portfolioTotalReturn >= 0 ? '+' : ''}{formatCurrency(currency.portfolioTotalReturn, currency.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Portfolio (now)</span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                {formatCurrency(currency.portfolioCurrentValue, currency.currency)}
              </span>
            </div>
          </div>
        </details>
      )}

      {/* Assets & Liabilities breakdown */}
      {(hasAssets || hasLoans) && (
        <details className="group mt-2">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-2">
            Assets &amp; liabilities
          </summary>
          <div className="space-y-2 pl-2 border-l-2 border-amber-100 dark:border-amber-900 mt-2">
            {hasAssets && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Asset value (Jan 1)</span>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(currency.assetYearStartValue, currency.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Asset value (now)</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {formatCurrency(currency.assetCurrentValue, currency.currency)}
                  </span>
                </div>
              </>
            )}
            {hasLoans && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Loan balance (Jan 1)</span>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    −{formatCurrency(currency.loanYearStartBalance, currency.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Loan balance (now)</span>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    −{formatCurrency(currency.loanOutstandingBalance, currency.currency)}
                  </span>
                </div>
              </>
            )}
            {hasAssets && hasLoans && (
              <div className="flex justify-between items-center pt-1 border-t border-dashed border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Net equity</span>
                <span className={`text-xs font-bold ${
                  currency.assetCurrentValue - currency.loanOutstandingBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(currency.assetCurrentValue - currency.loanOutstandingBalance, currency.currency)}
                </span>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function MonthlyProgressChart({
  currency,
  currentMonthIdx,
}: {
  currency: GrowthData;
  currentMonthIdx: number;
}) {
  const ytdMonths = currency.monthlyBreakdown.filter(
    (m) => m.month <= currentMonthIdx + 1
  );

  const data = ytdMonths.map((m) => ({
    name: m.monthName,
    Income: m.income,
    Expenses: m.expenses,
    Balance: m.endingBalance,
    transferImpact: m.transferImpact,
    instrumentTransferImpact: m.instrumentTransferImpact,
    loanTransferImpact: m.loanTransferImpact,
  }));

  const formatYAxis = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm text-xs dark:border-zinc-700 dark:bg-zinc-900 space-y-1">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color ?? p.stroke }}>
            {p.name}: {formatCurrency(p.value, currency.currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {currency.currency} Cash Flow Progress
        </h4>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">cash balance · includes portfolio flows</span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={48} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Bar dataKey="Income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Bar dataKey="Expenses" name="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Bar
            dataKey="instrumentTransferImpact"
            name="Portfolio flow"
            fill="#14b8a6"
            radius={[3, 3, 0, 0]}
            opacity={0.75}
          />
          <Bar
            dataKey="loanTransferImpact"
            name="Loan flow"
            fill="#3b82f6"
            radius={[3, 3, 0, 0]}
            opacity={0.75}
          />
          <Bar
            dataKey="transferImpact"
            name="FX impact"
            fill="#a855f7"
            radius={[3, 3, 0, 0]}
            opacity={0.75}
          />

          <Area
            type="monotone"
            dataKey="Balance"
            name="Balance"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.08}
            strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

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
