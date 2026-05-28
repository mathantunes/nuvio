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
import { Card, CardHeader, CardTitle, Table, Thead, Tbody, Tfoot, Th, Td, Tr } from "@/components/ui";

const cardStyle = {
  backgroundColor: "var(--color-surface)",
  borderColor: "var(--color-border)",
};

interface GrowthTabProps {
  growthAnalytics: GrowthAnalytics;
  currentMonthIdx: number;
}

export function GrowthTab({ growthAnalytics, currentMonthIdx }: GrowthTabProps) {
  const { byCurrency, totalTransfers } = growthAnalytics;

  return (
    <div className="space-y-6">
      {/* Net Worth Overview */}
      <Card padding="lg" style={cardStyle}>
        <h2 className="mb-6 text-lg font-semibold" style={{ color: "var(--color-text)" }}>
          Wealth Growth
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {byCurrency.map((currency) => (
            <CurrencyGrowthCard key={currency.currency} currency={currency} />
          ))}
        </div>
      </Card>

      {/* Monthly Progress Charts */}
      <Card padding="lg" style={cardStyle}>
        <h3 className="mb-6 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Monthly Progress
        </h3>

        <div className="space-y-8">
          {byCurrency.map((currency) => (
            <MonthlyProgressChart key={currency.currency} currency={currency} currentMonthIdx={currentMonthIdx} />
          ))}
        </div>
      </Card>

      {/* FX Transfers Summary */}
      {totalTransfers.length > 0 && (
        <Card padding="lg" style={cardStyle}>
          <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            FX Transfers
          </h3>

          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <Th>Date</Th>
                    <Th>From</Th>
                    <Th numeric>Amount</Th>
                    <Th>To</Th>
                    <Th numeric>Amount</Th>
                    <Th numeric>Rate</Th>
                    <Th numeric>Fees</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {totalTransfers.slice(0, 10).map((transfer) => (
                    <Tr key={transfer.id}>
                      <Td style={{ color: "var(--color-text)" }}>
                        {new Date(transfer.occurredAt).toLocaleDateString()}
                      </Td>
                      <Td muted className="font-medium">
                        {transfer.sourceCurrencyCode}
                      </Td>
                      <Td numeric muted>
                        {formatCurrency(transfer.sourceAmount, transfer.sourceCurrencyCode)}
                      </Td>
                      <Td muted className="font-medium">
                        {transfer.targetCurrencyCode}
                      </Td>
                      <Td numeric muted>
                        {formatCurrency(transfer.targetAmount, transfer.targetCurrencyCode)}
                      </Td>
                      <Td numeric muted>
                        {transfer.effectiveFxRate ? transfer.effectiveFxRate.toFixed(4) : "N/A"}
                      </Td>
                      <Td numeric style={{ color: "var(--color-danger)" }}>
                        {formatCurrency(transfer.feeAmount, transfer.sourceCurrencyCode)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {totalTransfers.length > 10 && (
                <p className="mt-2 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Showing 10 of {totalTransfers.length} transfers
                </p>
              )}
            </div>
          </div>
        </Card>
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
    <div className="rounded-lg border p-4" style={cardStyle}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>{currency.currency}</h3>
        <div
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: isPositiveWealth ? "var(--color-success-subtle)" : "var(--color-danger-subtle)",
            color: isPositiveWealth ? "var(--color-success)" : "var(--color-danger)",
          }}
        >
          {isPositiveWealth ? "↑" : "↓"} {Math.abs(currency.wealthGrowthRate).toFixed(1)}%
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Total wealth (start)</span>
          <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            {formatCurrency(currency.wealthStartingBalance, currency.currency)}
          </span>
        </div>
        <div className="border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Total wealth (now)</span>
            <span
              className="text-base font-bold"
              style={{ color: isPositiveWealth ? "var(--color-success)" : "var(--color-danger)" }}
            >
              {formatCurrency(currency.wealthCurrentBalance, currency.currency)}
            </span>
          </div>
        </div>
      </div>

      <details className="group mb-2" open>
        <summary className="mb-2 cursor-pointer text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Wealth breakdown
        </summary>
        <div className="mt-2 space-y-1.5 border-l-2 pl-2" style={{ borderLeftColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Cash
              <span className="ml-1 text-[10px]" style={{ color: "var(--color-text-subtle)" }}>(incl. portfolio flows)</span>
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
              {formatCurrency(currency.currentBalance, currency.currency)}
            </span>
          </div>
          {hasPortfolio && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Portfolio</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-brand)" }}>
                {formatCurrency(currency.portfolioCurrentValue, currency.currency)}
              </span>
            </div>
          )}
          {hasAssets && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Assets</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-warning)" }}>
                +{formatCurrency(currency.assetCurrentValue, currency.currency)}
              </span>
            </div>
          )}
          {hasLoans && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loan liabilities</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                −{formatCurrency(currency.loanOutstandingBalance, currency.currency)}
              </span>
            </div>
          )}
          {hasAssets && hasLoans && (
            <div className="flex items-center justify-between border-t border-dashed pt-1" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Asset equity</span>
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    currency.assetCurrentValue - currency.loanOutstandingBalance >= 0
                      ? "var(--color-success)"
                      : "var(--color-danger)",
                }}
              >
                {formatCurrency(currency.assetCurrentValue - currency.loanOutstandingBalance, currency.currency)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>= Net wealth</span>
            <span
              className="text-xs font-bold"
              style={{ color: isPositiveWealth ? "var(--color-success)" : "var(--color-danger)" }}
            >
              {formatCurrency(currency.wealthCurrentBalance, currency.currency)}
            </span>
          </div>
        </div>
      </details>

      <details className="group">
        <summary className="mb-2 cursor-pointer text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Cash flow detail {isPositiveCash ? "↑" : "↓"} {Math.abs(currency.growthRate).toFixed(1)}%
        </summary>
        <div className="mt-2 space-y-2 border-l-2 pl-2" style={{ borderLeftColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Starting cash</span>
            <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
              {formatCurrency(currency.startingBalance, currency.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Income</span>
            <span className="text-xs font-medium" style={{ color: "var(--color-success)" }}>
              +{formatCurrency(currency.ytdIncome, currency.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Expenses</span>
            <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
              -{formatCurrency(currency.ytdExpenses, currency.currency)}
            </span>
          </div>
          {currency.transferImpact !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>FX Impact</span>
              <span className="text-xs font-medium" style={{ color: currency.transferImpact >= 0 ? "var(--color-brand)" : "var(--color-danger)" }}>
                {currency.transferImpact >= 0 ? "+" : ""}{formatCurrency(currency.transferImpact, currency.currency)}
              </span>
            </div>
          )}
          {currency.instrumentTransferImpact !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Portfolio flows</span>
              <span className="text-xs font-medium" style={{ color: currency.instrumentTransferImpact >= 0 ? "var(--color-brand)" : "var(--color-warning)" }}>
                {currency.instrumentTransferImpact >= 0 ? "+" : ""}{formatCurrency(currency.instrumentTransferImpact, currency.currency)}
              </span>
            </div>
          )}
          {currency.loanTransferImpact !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loan flows</span>
              <span className="text-xs font-medium" style={{ color: currency.loanTransferImpact >= 0 ? "var(--color-brand)" : "var(--color-danger)" }}>
                {currency.loanTransferImpact >= 0 ? "+" : ""}{formatCurrency(currency.loanTransferImpact, currency.currency)}
              </span>
            </div>
          )}
          {currency.totalFees > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Fees</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                -{formatCurrency(currency.totalFees, currency.currency)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Current cash</span>
            <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
              {formatCurrency(currency.currentBalance, currency.currency)}
            </span>
          </div>
        </div>
      </details>

      {hasPortfolio && (
        <details className="group mt-2">
          <summary className="mb-2 cursor-pointer text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Portfolio detail
          </summary>
          <div className="mt-2 space-y-2 border-l-2 pl-2" style={{ borderLeftColor: "var(--color-brand-muted)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Portfolio (Jan 1)</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                {formatCurrency(currency.portfolioYearStartValue, currency.currency)}
              </span>
            </div>
            {currency.portfolioNetDeposits !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Net deposits / withdrawals</span>
                <span className="text-xs font-medium" style={{ color: currency.portfolioNetDeposits >= 0 ? "var(--color-brand)" : "var(--color-warning)" }}>
                  {currency.portfolioNetDeposits >= 0 ? "+" : ""}{formatCurrency(currency.portfolioNetDeposits, currency.currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Market return</span>
              <span className="text-xs font-medium" style={{ color: currency.portfolioTotalReturn >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                {currency.portfolioTotalReturn >= 0 ? "+" : ""}{formatCurrency(currency.portfolioTotalReturn, currency.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Portfolio (now)</span>
              <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                {formatCurrency(currency.portfolioCurrentValue, currency.currency)}
              </span>
            </div>
          </div>
        </details>
      )}

      {(hasAssets || hasLoans) && (
        <details className="group mt-2">
          <summary className="mb-2 cursor-pointer text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Assets &amp; liabilities
          </summary>
          <div className="mt-2 space-y-2 border-l-2 pl-2" style={{ borderLeftColor: "var(--color-warning)" }}>
            {hasAssets && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Asset value (Jan 1)</span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                    {formatCurrency(currency.assetYearStartValue, currency.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Asset value (now)</span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-warning)" }}>
                    {formatCurrency(currency.assetCurrentValue, currency.currency)}
                  </span>
                </div>
              </>
            )}
            {hasLoans && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loan balance (Jan 1)</span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                    −{formatCurrency(currency.loanYearStartBalance, currency.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loan balance (now)</span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                    −{formatCurrency(currency.loanOutstandingBalance, currency.currency)}
                  </span>
                </div>
              </>
            )}
            {hasAssets && hasLoans && (
              <div className="flex items-center justify-between border-t border-dashed pt-1" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Net equity</span>
                <span
                  className="text-xs font-bold"
                  style={{
                    color:
                      currency.assetCurrentValue - currency.loanOutstandingBalance >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                  }}
                >
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
  const ytdMonths = currency.monthlyBreakdown.filter((m) => m.month <= currentMonthIdx + 1);

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
      <div
        className="space-y-1 rounded-lg border p-3 text-xs shadow-sm"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
        }}
      >
        <p className="font-semibold" style={{ color: "var(--color-text)" }}>{label}</p>
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
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {currency.currency} Cash Flow Progress
        </h4>
        <span className="text-xs italic" style={{ color: "var(--color-text-subtle)" }}>
          cash balance · includes portfolio flows
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={48} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-muted)" }} />

          <Bar dataKey="Income" name="Income" fill="var(--color-success)" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Bar dataKey="Expenses" name="Expenses" fill="var(--color-danger)" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Bar
            dataKey="instrumentTransferImpact"
            name="Portfolio flow"
            fill="var(--color-brand)"
            radius={[3, 3, 0, 0]}
            opacity={0.75}
          />
          <Bar
            dataKey="loanTransferImpact"
            name="Loan flow"
            fill="var(--color-warning)"
            radius={[3, 3, 0, 0]}
            opacity={0.75}
          />
          <Bar
            dataKey="transferImpact"
            name="FX impact"
            fill="var(--color-brand-muted)"
            radius={[3, 3, 0, 0]}
            opacity={0.75}
          />

          <Area
            type="monotone"
            dataKey="Balance"
            name="Balance"
            stroke="var(--color-brand)"
            fill="var(--color-brand)"
            fillOpacity={0.08}
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-brand)" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-3 gap-4 border-t pt-3 text-xs" style={{ borderColor: "var(--color-border)" }}>
        <div>
          <span style={{ color: "var(--color-text-muted)" }}>Start: </span>
          <span className="font-medium" style={{ color: "var(--color-text)" }}>
            {formatCurrency(currency.startingBalance, currency.currency)}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-muted)" }}>Net Savings: </span>
          <span className="font-medium" style={{ color: "var(--color-success)" }}>
            {formatCurrency(currency.netSavings, currency.currency)}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-muted)" }}>Current: </span>
          <span className="font-medium" style={{ color: "var(--color-text)" }}>
            {formatCurrency(currency.currentBalance, currency.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
