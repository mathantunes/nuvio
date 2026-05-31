"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import { transactions, budgetLines, categories, budgets, accounts } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { and, asc, eq } from "drizzle-orm";

const createTransactionSchema = z.object({
  budgetLineId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0.01)),
  currencyCode: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO code."),
  occurredAt: z.string().transform((val) => new Date(val)),
  description: z.string().max(500).optional(),
});

const updateTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  budgetLineId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  amount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0.01))
    .optional(),
  currencyCode: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO code.")
    .optional(),
  occurredAt: z.string().transform((val) => new Date(val)).optional(),
  description: z.string().max(500).optional(),
});

export async function deleteTransaction(transactionId: string, year: number) {
  try {
    const user = await AuthService.getCurrentUser();

    // Verify transaction ownership before deletion
    const existingTransaction = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
      .limit(1);

    if (existingTransaction.length === 0) {
      return { error: "Transaction not found or access denied." };
    }

    await db.delete(transactions).where(eq(transactions.id, transactionId));

    revalidatePath(`/app/${year}/tracking`);
    revalidatePath(`/app/${year}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete transaction." };
  }
}

export async function createTransaction(formData: FormData) {
  try {
    const user = await AuthService.getCurrentUser();

  const raw = {
    budgetLineId: String(formData.get("budgetLineId") ?? ""),
    accountId: String(formData.get("accountId") ?? ""),
    amount: String(formData.get("amount") ?? "0"),
    currencyCode: String(formData.get("currencyCode") ?? "USD").toUpperCase(),
    occurredAt: String(formData.get("occurredAt") ?? ""),
    description: formData.get("description")
      ? String(formData.get("description"))
      : undefined,
  };

  const parsed = createTransactionSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction data." };
  }

  const { budgetLineId, accountId, amount, currencyCode, occurredAt, description } =
    parsed.data;

  // Get budget line with category to determine transaction type — verify user owns it via category
  const budgetLineResult = await db
    .select({
      budgetLineId: budgetLines.id,
      categoryId: budgetLines.categoryId,
      categoryKind: categories.kind,
    })
    .from(budgetLines)
    .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
    .where(and(eq(budgetLines.id, budgetLineId), eq(categories.userId, user.id)))
    .limit(1);

  if (budgetLineResult.length === 0) {
    return { error: "Budget line not found." };
  }

  const budgetLine = budgetLineResult[0];
  const transactionType =
    budgetLine.categoryKind === "income" ? "income" : "expense";

  await db.insert(transactions).values({
    userId: user.id,
    accountId,
    categoryId: budgetLine.categoryId,
    budgetLineId: budgetLineId,
    transactionType,
    amount: amount.toString(),
    currencyCode,
    occurredAt,
    description,
  });

  revalidatePath(`/app/${formData.get("year")}/tracking`);
  revalidatePath(`/app/${formData.get("year")}`);

  return { success: true, transactionType: transactionType };
} catch (error) {
  console.error("Failed to create transaction:", error);
  return { error: error instanceof Error ? error.message : "Failed to create transaction." };
}
}

export async function updateTransaction(formData: FormData) {
  try {
    const user = await AuthService.getCurrentUser();

    const raw = {
      transactionId: String(formData.get("transactionId") ?? ""),
      budgetLineId: formData.get("budgetLineId") ? String(formData.get("budgetLineId")) : undefined,
      accountId: formData.get("accountId") ? String(formData.get("accountId")) : undefined,
      amount: formData.get("amount") ? String(formData.get("amount")) : undefined,
      currencyCode: formData.get("currencyCode") ? String(formData.get("currencyCode")) : undefined,
      occurredAt: formData.get("occurredAt") ? String(formData.get("occurredAt")) : undefined,
      description: formData.get("description") ? String(formData.get("description")) : undefined,
    };

    const parsed = updateTransactionSchema.safeParse(raw);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid transaction data." };
    }

    const { transactionId, budgetLineId, accountId, amount, currencyCode, occurredAt, description } =
      parsed.data;

    // Verify transaction ownership and get current data
    const existingTransaction = await db
      .select({
        id: transactions.id,
        categoryId: transactions.categoryId,
        budgetLineId: transactions.budgetLineId,
      })
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
      .limit(1);

    if (existingTransaction.length === 0) {
      return { error: "Transaction not found or access denied." };
    }

    // Prepare update data
    const updateData: Partial<typeof transactions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (amount !== undefined) updateData.amount = amount.toString();
    if (currencyCode !== undefined) updateData.currencyCode = currencyCode.toUpperCase();
    if (occurredAt !== undefined) updateData.occurredAt = occurredAt;
    if (description !== undefined) updateData.description = description;

    // Handle budget line change
    if (budgetLineId !== undefined && budgetLineId !== existingTransaction[0].budgetLineId) {
      // Get new budget line with category — verify user owns it via category
      const budgetLineResult = await db
        .select({
          categoryId: budgetLines.categoryId,
          categoryKind: categories.kind,
        })
        .from(budgetLines)
        .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
        .where(and(eq(budgetLines.id, budgetLineId), eq(categories.userId, user.id)))
        .limit(1);

      if (budgetLineResult.length === 0) {
        return { error: "Budget line not found." };
      }

      const budgetLine = budgetLineResult[0];
      updateData.budgetLineId = budgetLineId;
      updateData.categoryId = budgetLine.categoryId;
      updateData.transactionType = budgetLine.categoryKind === "income" ? "income" : "expense";
    }

    // Handle account change
    if (accountId !== undefined) updateData.accountId = accountId;

    // Perform the update
    await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, transactionId));

    revalidatePath(`/app/${formData.get("year")}/tracking`);
    revalidatePath(`/app/${formData.get("year")}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return { error: error instanceof Error ? error.message : "Failed to update transaction." };
  }
}

const createUnplannedTransactionSchema = z.object({
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0.01)),
  currencyCode: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO code."),
  occurredAt: z.string().transform((val) => new Date(val)),
  description: z.string().max(500).optional(),
  year: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int()),
  month: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(12)),
});

/**
 * Creates a transaction for a category without a pre-existing planned budget line.
 * If no budget line exists for the given category + month, a $0 budget line is
 * automatically created. If one already exists (planned or unplanned), it is reused.
 */
export async function createUnplannedTransaction(formData: FormData) {
  const user = await AuthService.getCurrentUser();

  const yearRaw = String(formData.get("year") ?? "");
  const monthRaw = String(formData.get("month") ?? "");

  const raw = {
    categoryId: String(formData.get("categoryId") ?? ""),
    accountId: String(formData.get("accountId") ?? ""),
    amount: String(formData.get("amount") ?? "0"),
    currencyCode: String(formData.get("currencyCode") ?? "").toUpperCase(),
    occurredAt: String(formData.get("occurredAt") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    year: yearRaw,
    month: monthRaw,
  };

  const parsed = createUnplannedTransactionSchema.safeParse(raw);

  if (!parsed.success) {
    redirect(
      `/app/${yearRaw}/tracking/${monthRaw}?unplannedError=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid data."
      )}`
    );
  }

  const { categoryId, accountId, amount, currencyCode, occurredAt, description, year, month } =
    parsed.data;

  // Verify category ownership and derive transaction type from kind
  const categoryResult = await db
    .select({ id: categories.id, kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, user.id)))
    .limit(1);

  if (categoryResult.length === 0) {
    redirect(
      `/app/${year}/tracking/${month}?unplannedError=${encodeURIComponent("Category not found.")}`
    );
  }

  const transactionType = categoryResult[0].kind === "income" ? "income" : "expense";

  // Get the budget for this year
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.year, year), eq(budgets.userId, user.id)),
  });

  if (!budget) {
    redirect(
      `/app/${year}/tracking/${month}?unplannedError=${encodeURIComponent(
        "Budget not found for this year."
      )}`
    );
  }

  // Find or create a $0 budget line for this category + month
  const existingLine = await db
    .select({ id: budgetLines.id })
    .from(budgetLines)
    .where(
      and(
        eq(budgetLines.budgetId, budget.id),
        eq(budgetLines.categoryId, categoryId),
        eq(budgetLines.month, month)
      )
    )
    .limit(1);

  let budgetLineId: string;

  if (existingLine.length > 0) {
    budgetLineId = existingLine[0].id;
  } else {
    const [newLine] = await db
      .insert(budgetLines)
      .values({
        budgetId: budget.id,
        categoryId,
        month,
        plannedAmount: "0",
        currencyCode,
      })
      .returning({ id: budgetLines.id });
    budgetLineId = newLine.id;
  }

  await db.insert(transactions).values({
    userId: user.id,
    accountId,
    categoryId,
    budgetLineId,
    transactionType,
    amount: amount.toString(),
    currencyCode,
    occurredAt,
    description,
  });

  revalidatePath(`/app/${year}/tracking`);
  revalidatePath(`/app/${year}`);
}

/**
 * One-click "paid as planned" shortcut.
 * Creates a transaction for a budget line using the planned amount and the
 * user's primary account for the line's currency (falls back to the first
 * account in that currency). Uses the last day of the given month as the date.
 */
export async function confirmAsPaid(budgetLineId: string, year: number, month: number) {
  try {
    const user = await AuthService.getCurrentUser();

    // Fetch budget line with category info
    const lineResult = await db
      .select({
        plannedAmount: budgetLines.plannedAmount,
        currencyCode: budgetLines.currencyCode,
        categoryId: budgetLines.categoryId,
        categoryKind: categories.kind,
      })
      .from(budgetLines)
      .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
      .where(and(eq(budgetLines.id, budgetLineId), eq(categories.userId, user.id)))
      .limit(1);

    if (lineResult.length === 0) {
      return { error: "Budget line not found." };
    }

    const { plannedAmount, currencyCode, categoryId, categoryKind } = lineResult[0];

    // Find primary account for this currency, falling back to first account in that currency
    const userAccounts = await db
      .select({ id: accounts.id, isPrimary: accounts.isPrimary })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, user.id),
          eq(accounts.currencyCode, currencyCode),
          eq(accounts.isActive, true)
        )
      )
      .orderBy(asc(accounts.createdAt));

    if (userAccounts.length === 0) {
      return { error: `No account found for currency ${currencyCode}.` };
    }

    const primaryAccount =
      userAccounts.find((a) => a.isPrimary) ?? userAccounts[0];

    // Last day of the given month
    const occurredAt = new Date(year, month, 0); // day 0 of next month = last day of this month

    const transactionType = categoryKind === "income" ? "income" : "expense";

    await db.insert(transactions).values({
      userId: user.id,
      accountId: primaryAccount.id,
      categoryId,
      budgetLineId,
      transactionType,
      amount: plannedAmount,
      currencyCode,
      occurredAt,
    });

    revalidatePath(`/app/${year}/tracking`);
    revalidatePath(`/app/${year}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to confirm as paid:", error);
    return { error: error instanceof Error ? error.message : "Failed to create transaction." };
  }
}
