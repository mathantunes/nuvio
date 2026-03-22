"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { transactions, budgetLines, categories } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { and, eq } from "drizzle-orm";

const createTransactionSchema = z.object({
  budgetLineId: z.uuid(),
  accountId: z.uuid(),
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
  transactionId: z.uuid(),
  budgetLineId: z.uuid().optional(),
  accountId: z.uuid().optional(),
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

  // Get budget line with category to determine transaction type
  const budgetLineResult = await db
    .select({
      budgetLineId: budgetLines.id,
      categoryId: budgetLines.categoryId,
      categoryKind: categories.kind,
    })
    .from(budgetLines)
    .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
    .where(eq(budgetLines.id, budgetLineId))
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
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (amount !== undefined) updateData.amount = amount.toString();
    if (currencyCode !== undefined) updateData.currencyCode = currencyCode.toUpperCase();
    if (occurredAt !== undefined) updateData.occurredAt = occurredAt;
    if (description !== undefined) updateData.description = description;

    // Handle budget line change
    if (budgetLineId !== undefined && budgetLineId !== existingTransaction[0].budgetLineId) {
      // Get new budget line with category to determine transaction type
      const budgetLineResult = await db
        .select({
          categoryId: budgetLines.categoryId,
          categoryKind: categories.kind,
        })
        .from(budgetLines)
        .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
        .where(eq(budgetLines.id, budgetLineId))
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
