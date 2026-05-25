import { and, asc, desc, eq, sql } from "drizzle-orm";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  accounts,
  budgetLines,
  budgets,
  categories,
  db,
  savingsSnapshotLines,
  savingsSnapshots,
  transactions,
  transfers,
} from "./db.js";

const userId = process.env.MCP_USER_ID;

if (!userId) {
  throw new Error("MCP_USER_ID is required");
}

const server = new McpServer({ name: "globudget", version: "0.1.0" });

function jsonResult<T>(data: T) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data),
      },
    ],
  };
}

server.registerTool(
  "get_accounts",
  {
    description: "Get all active accounts for the configured user.",
  },
  async () => {
    const rows = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        currencyCode: accounts.currencyCode,
        institution: accounts.institution,
        liquidityType: accounts.liquidityType,
        isActive: accounts.isActive,
      })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .orderBy(asc(accounts.name));

    return jsonResult(rows);
  }
);

server.registerTool(
  "get_categories",
  {
    description: "Get all categories for the configured user.",
  },
  async () => {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        kind: categories.kind,
      })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.name));

    return jsonResult(rows);
  }
);

server.registerTool(
  "get_transactions",
  {
    description: "Get transactions for a given year.",
    inputSchema: { year: z.number().int() },
  },
  async ({ year }) => {
    const rows = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        currencyCode: transactions.currencyCode,
        occurredAt: transactions.occurredAt,
        type: transactions.transactionType,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          sql`extract(year from ${transactions.occurredAt}) = ${year}`,
        ),
      )
      .orderBy(desc(transactions.occurredAt), asc(transactions.id));

    return jsonResult(rows);
  }
);

server.registerTool(
  "get_budgets",
  {
    description: "Get budget lines for a given year.",
    inputSchema: { year: z.number().int() },
  },
  async ({ year }) => {
    const rows = await db
      .select({
        id: budgetLines.id,
        categoryId: budgetLines.categoryId,
        categoryName: categories.name,
        month: budgetLines.month,
        plannedAmount: budgetLines.plannedAmount,
        currencyCode: budgetLines.currencyCode,
      })
      .from(budgetLines)
      .innerJoin(budgets, eq(budgetLines.budgetId, budgets.id))
      .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.year, year)))
      .orderBy(asc(budgetLines.month), asc(categories.name));

    return jsonResult(rows);
  }
);

server.registerTool(
  "get_variance_report",
  {
    description: "Get planned vs actual spend grouped by category and month.",
    inputSchema: { year: z.number().int() },
  },
  async ({ year }) => {
    const actuals = db
      .select({
        categoryId: transactions.categoryId,
        month: sql<number>`extract(month from ${transactions.occurredAt})`.as("month"),
        actualAmount: sql<string>`coalesce(sum(${transactions.amount}), 0)`.as(
          "actual_amount",
        ),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.transactionType, "expense"),
          sql`${transactions.categoryId} is not null`,
          sql`extract(year from ${transactions.occurredAt}) = ${year}`,
        ),
      )
      .groupBy(
        transactions.categoryId,
        sql`extract(month from ${transactions.occurredAt})`,
      )
      .as("actuals");

    const rows = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        kind: categories.kind,
        month: budgetLines.month,
        plannedAmount: budgetLines.plannedAmount,
        actualAmount: sql<string>`coalesce(${actuals.actualAmount}, 0)`.as(
          "actual_amount",
        ),
        variance: sql<string>`coalesce(${actuals.actualAmount}, 0) - ${budgetLines.plannedAmount}`.as(
          "variance",
        ),
      })
      .from(budgetLines)
      .innerJoin(budgets, eq(budgetLines.budgetId, budgets.id))
      .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
      .leftJoin(
        actuals,
        and(
          eq(actuals.categoryId, budgetLines.categoryId),
          eq(actuals.month, budgetLines.month),
        ),
      )
      .where(and(eq(budgets.userId, userId), eq(budgets.year, year)))
      .orderBy(asc(budgetLines.month), asc(categories.name));

    return jsonResult(rows);
  }
);

server.registerTool(
  "get_savings_snapshots",
  {
    description: "Get savings snapshots for the configured user.",
  },
  async () => {
    const totals = db
      .select({
        snapshotId: savingsSnapshotLines.snapshotId,
        amount: sql<string>`coalesce(sum(${savingsSnapshotLines.amount}), 0)`.as(
          "amount",
        ),
        currencyCode: sql<string | null>`
          case
            when count(distinct ${savingsSnapshotLines.currencyCode}) = 1 then max(${savingsSnapshotLines.currencyCode})
            else null
          end
        `.as("currency_code"),
      })
      .from(savingsSnapshotLines)
      .groupBy(savingsSnapshotLines.snapshotId)
      .as("totals");

    const rows = await db
      .select({
        id: savingsSnapshots.id,
        amount: sql<string>`coalesce(${totals.amount}, 0)`.as("amount"),
        currencyCode: totals.currencyCode,
        snapshottedAt: savingsSnapshots.asOf,
      })
      .from(savingsSnapshots)
      .leftJoin(totals, eq(totals.snapshotId, savingsSnapshots.id))
      .where(eq(savingsSnapshots.userId, userId))
      .orderBy(desc(savingsSnapshots.asOf));

    return jsonResult(rows);
  }
);

server.registerTool(
  "get_fx_transfers",
  {
    description: "Get transfers for a given year.",
    inputSchema: { year: z.number().int() },
  },
  async ({ year }) => {
    const rows = await db
      .select({
        id: transfers.id,
        fromAccountId: transfers.sourceAccountId,
        toAccountId: transfers.targetAccountId,
        fromAmount: transfers.sourceAmount,
        fromCurrencyCode: transfers.sourceCurrencyCode,
        toAmount: transfers.targetAmount,
        toCurrencyCode: transfers.targetCurrencyCode,
        fxRate: transfers.fxRate,
        fees: transfers.feeAmount,
        taxes: transfers.taxAmount,
        occurredAt: transfers.occurredAt,
      })
      .from(transfers)
      .where(
        and(
          eq(transfers.userId, userId),
          sql`extract(year from ${transfers.occurredAt}) = ${year}`,
        ),
      )
      .orderBy(desc(transfers.occurredAt), asc(transfers.id));

    return jsonResult(rows);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
