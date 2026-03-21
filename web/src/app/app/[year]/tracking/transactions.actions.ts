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

export async function deleteTransaction(transactionId: string, year: number) {
  try {
    const user = await AuthService.getCurrentUser();

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
