"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { transactions, budgetLines, categories } from "@/db/schema";
import { createClient } from "@/lib/supabase-server";
import { and, eq } from "drizzle-orm";

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

export async function deleteTransaction(transactionId: string, year: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete a transaction." };
  }

  await db.delete(transactions).where(eq(transactions.id, transactionId));

  revalidatePath(`/app/${year}/tracking`);
  revalidatePath(`/app/${year}`);

  return { success: true };
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a transaction." };
  }

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

  return { success: true };
}
