import React from "react";
import { formatCurrency } from "../planning/currency-format";
import { Card, CardHeader, CardTitle, Table, Thead, Tbody, Tfoot, Th, Td, Tr } from "@/components/ui";
import { IconTrendUp, IconTrendDown, IconBarChart, IconCheck, IconWarning } from "@/components/icons";

interface SavingsTabProps {
  savingsHealthByCurrency: Array<{
    currency: string;
    plannedSavings: number;
    actualSavings: number;
    savingsRate: number;
    onTrack: boolean;
  }>;
  biggestPositiveDeviation: any;
  biggestNegativeDeviation: any;
  deviationsByMonth: Record<number, { monthName: string; currencies: any[] }>;
  currentMonthIdx: number;
}

const cardStyle = {
  backgroundColor: "var(--color-surface)",
  borderColor: "var(--color-border)",
};

export function SavingsTab({
  savingsHealthByCurrency,
  biggestPositiveDeviation,
  biggestNegativeDeviation,
  deviationsByMonth,
  currentMonthIdx,
}: SavingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Savings Health Overview */}
      <Card style={cardStyle}>
        <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text)" }}>Savings Health</h2>
        <div className="space-y-4">
          {savingsHealthByCurrency.map((health) => (
            <div key={health.currency} className="rounded-lg border p-3" style={cardStyle}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{health.currency}</h3>
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: health.onTrack ? "var(--color-on-track-subtle)" : "var(--color-off-track-subtle)",
                    color: health.onTrack ? "var(--color-on-track)" : "var(--color-off-track)",
                  }}
                >
                  {health.onTrack ? (
                    <><IconCheck size={12} /> On Track</>
                  ) : (
                    <><IconWarning size={12} /> Off Track</>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>YTD Planned Savings</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                    {formatCurrency(health.plannedSavings, health.currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>YTD Actual Savings</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: health.actualSavings >= health.plannedSavings ? "var(--color-on-track)" : "var(--color-off-track)" }}
                  >
                    {formatCurrency(health.actualSavings, health.currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Savings Rate</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: health.savingsRate >= 95 ? "var(--color-on-track)" : "var(--color-off-track)" }}
                  >
                    {health.savingsRate.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Avg Monthly</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-text-muted)" }}>
                    {formatCurrency(health.actualSavings / (currentMonthIdx + 1), health.currency)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Insights */}
      <Card style={cardStyle}>
        <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text)" }}>Key Insights</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {biggestPositiveDeviation && biggestPositiveDeviation.deviation > 0 && (
            <div
              className="rounded-lg border p-3"
              style={{ backgroundColor: "var(--color-on-track-subtle)", borderColor: "var(--color-border)" }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span style={{ color: "var(--color-on-track)" }}><IconTrendUp size={14} /></span>
                <span className="text-sm font-medium" style={{ color: "var(--color-on-track)" }}>Best Month</span>
              </div>
              <p className="text-xs" style={{ color: "var(--color-on-track)" }}>
                {biggestPositiveDeviation.monthName}: {formatCurrency(biggestPositiveDeviation.deviation, biggestPositiveDeviation.currency)} over target
              </p>
            </div>
          )}
          {biggestNegativeDeviation && biggestNegativeDeviation.deviation < 0 && (
            <div
              className="rounded-lg border p-3"
              style={{ backgroundColor: "var(--color-off-track-subtle)", borderColor: "var(--color-border)" }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span style={{ color: "var(--color-off-track)" }}><IconTrendDown size={14} /></span>
                <span className="text-sm font-medium" style={{ color: "var(--color-off-track)" }}>Challenging Month</span>
              </div>
              <p className="text-xs" style={{ color: "var(--color-off-track)" }}>
                {biggestNegativeDeviation.monthName}: {formatCurrency(Math.abs(biggestNegativeDeviation.deviation), biggestNegativeDeviation.currency)} under target
              </p>
            </div>
          )}
          <div
            className="rounded-lg border p-3"
            style={{ backgroundColor: "var(--color-brand-subtle)", borderColor: "var(--color-border)" }}
          >
            <div className="mb-1 flex items-center gap-2">
              <span style={{ color: "var(--color-brand)" }}><IconBarChart size={14} /></span>
              <span className="text-sm font-medium" style={{ color: "var(--color-brand)" }}>Monthly Average</span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-brand)" }}>
              {savingsHealthByCurrency.length > 0
                ? formatCurrency(savingsHealthByCurrency[0].actualSavings / (currentMonthIdx + 1), savingsHealthByCurrency[0].currency)
                : formatCurrency(0, "USD")}
              {" "}per month
            </p>
          </div>
          <div
            className="rounded-lg border p-3"
            style={{ backgroundColor: "var(--color-brand-subtle)", borderColor: "var(--color-border)" }}
          >
            <div className="mb-1 flex items-center gap-2">
              <span style={{ color: "var(--color-brand)" }}>🎯</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-brand)" }}>Year Progress</span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-brand)" }}>
              {Math.round(((currentMonthIdx + 1) / 12) * 100)}% complete
            </p>
          </div>
        </div>
      </Card>

      {/* Monthly Deviations */}
      <Card style={cardStyle}>
        <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text)" }}>Monthly Plan Deviations</h2>
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <Th>Month</Th>
                <Th>Currency</Th>
                <Th numeric>Planned Net</Th>
                <Th numeric>Actual Net</Th>
                <Th numeric>Deviation</Th>
                <Th numeric>% Dev</Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.entries(deviationsByMonth).map(([monthNum, monthData]) => {
                const monthKey = `month-${monthNum}`;
                return (
                  <React.Fragment key={monthKey}>
                    <Tr style={{ backgroundColor: "var(--color-surface)" }}>
                      <Td className="font-medium" style={{ color: "var(--color-text)" }}>
                        {monthData.monthName}
                      </Td>
                      <Td muted colSpan={5}>
                        {monthData.currencies.length} {monthData.currencies.length === 1 ? "currency" : "currencies"}
                      </Td>
                    </Tr>
                    {monthData.currencies.map((currency) => (
                      <Tr key={`${monthNum}-${currency.currency}`}>
                        <Td muted />
                        <Td muted className="font-medium">
                          {currency.currency}
                        </Td>
                        <Td numeric muted>
                          {formatCurrency(currency.plannedNet, currency.currency)}
                        </Td>
                        <Td numeric muted>
                          {formatCurrency(currency.actualNet, currency.currency)}
                        </Td>
                        <Td
                          numeric
                          className="font-medium"
                          style={{ color: currency.deviation >= 0 ? "var(--color-on-track)" : "var(--color-off-track)" }}
                        >
                          {currency.deviation >= 0 ? "+" : ""}{formatCurrency(currency.deviation, currency.currency)}
                        </Td>
                        <Td
                          numeric
                          className="font-medium"
                          style={{ color: currency.deviationPercent >= 0 ? "var(--color-on-track)" : "var(--color-off-track)" }}
                        >
                          {currency.deviationPercent >= 0 ? "+" : ""}{currency.deviationPercent.toFixed(1)}%
                        </Td>
                      </Tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </Tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
