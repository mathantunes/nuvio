"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { budgetLines, categories, budgets } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { and, eq } from "drizzle-orm";

const createBudgetLineSchema = z
  .object({
    budgetId: z.uuid(),
    categoryName: z.string().min(1).max(120),
    categoryKind: z.enum(["income", "expense"]),
    isMonthly: z.string().transform((val) => val === "true"),
    month: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(12))
      .optional(),
    plannedAmount: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(0)),
    currencyCode: z
      .string()
      .min(3)
      .max(3)
      .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO code."),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.isMonthly || data.month !== undefined, {
    message: "Month is required when not monthly.",
    path: ["month"],
  });

const updateBudgetLineSchema = z.object({
  budgetLineId: z.uuid(),
  plannedAmount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0)),
  currencyCode: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO code."),
  notes: z.string().max(500).optional(),
});

export async function createBudgetLine(formData: FormData) {
  try {
    const user = await AuthService.getCurrentUser();

    const raw = {
    budgetId: String(formData.get("budgetId") ?? ""),
    categoryName: String(formData.get("categoryName") ?? ""),
    categoryKind: String(formData.get("categoryKind") ?? ""),
    isMonthly: String(formData.get("isMonthly") ?? "false"),
    month: formData.get("month") ? String(formData.get("month")) : undefined,
    plannedAmount: String(formData.get("plannedAmount") ?? "0"),
    currencyCode: String(formData.get("currencyCode") ?? "USD").toUpperCase(),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  };

  const parsed = createBudgetLineSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget line data." };
  }

  const {
    budgetId,
    categoryName,
    categoryKind,
    isMonthly,
    month,
    plannedAmount,
    currencyCode,
    notes,
  } = parsed.data;

  // Find or create the category
  let category = await db.query.categories.findFirst({
    where: and(
      eq(categories.userId, user.id),
      eq(categories.name, categoryName),
      eq(categories.kind, categoryKind)
    ),
  });

  if (!category) {
    const [newCategory] = await db
      .insert(categories)
      .values({
        userId: user.id,
        name: categoryName,
        kind: categoryKind,
      })
      .returning();
    category = newCategory;
  }

  // Create budget line(s) - one per month if monthly, otherwise just the specified month
  const monthsToCreate = isMonthly
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : [month!];

  await db.insert(budgetLines).values(
    monthsToCreate.map((m) => ({
      budgetId,
      categoryId: category.id,
      month: m,
      plannedAmount: plannedAmount.toString(),
      currencyCode,
      notes,
    }))
  );

  revalidatePath(`/app/${formData.get("year")}/planning`);
    revalidatePath(`/app/${formData.get("year")}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to create budget line:", error);
    return { error: error instanceof Error ? error.message : "Failed to create budget line." };
  }
}

export async function updateBudgetLine(formData: FormData) {
  try {
    const user = await AuthService.getCurrentUser();

  const raw = {
    budgetLineId: String(formData.get("budgetLineId") ?? ""),
    plannedAmount: String(formData.get("plannedAmount") ?? "0"),
    currencyCode: String(formData.get("currencyCode") ?? "USD").toUpperCase(),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  };

  const parsed = updateBudgetLineSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget line data." };
  }

  const { budgetLineId, plannedAmount, currencyCode, notes } = parsed.data;

  // Verify ownership via budget
  const budgetLine = await db.query.budgetLines.findFirst({
    where: eq(budgetLines.id, budgetLineId),
  });

  if (!budgetLine) {
    return { error: "Budget line not found." };
  }

  const budget = await db.query.budgets.findFirst({
    where: eq(budgets.id, budgetLine.budgetId),
  });

  if (!budget || budget.userId !== user.id) {
    return { error: "Access denied." };
  }

  await db
    .update(budgetLines)
    .set({
      plannedAmount: plannedAmount.toString(),
      currencyCode,
      notes: notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(budgetLines.id, budgetLineId));

  revalidatePath(`/app/${formData.get("year")}/planning`);
  revalidatePath(`/app/${formData.get("year")}`);

  return { success: true };
  } catch (error) {
    console.error("Failed to update budget line:", error);
    return { error: error instanceof Error ? error.message : "Failed to update budget line." };
  }
}
