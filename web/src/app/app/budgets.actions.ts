"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { budgets, profiles } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { and, eq } from "drizzle-orm";

const createBudgetSchema = z.object({
  year: z
    .string()
    .transform((value) => parseInt(value, 10))
    .pipe(
      z
        .number()
        .int()
        .min(1900, "Year must be 1900 or later.")
        .max(3000, "Year must be 3000 or earlier."),
    ),
  baseCurrency: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code.")
    .optional(),
});

export async function createBudget(formData: FormData) {
  try {
    const user = await AuthService.getCurrentUser();

    const rawYear = String(formData.get("year") ?? "");
    const rawCurrency = formData.get("baseCurrency")
      ? String(formData.get("baseCurrency")).toUpperCase()
      : undefined;
    const parsed = createBudgetSchema.safeParse({ year: rawYear, baseCurrency: rawCurrency });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const { year, baseCurrency } = parsed.data;

    // Save base currency to user profile if provided.
    if (baseCurrency) {
      await db
        .update(profiles)
        .set({ baseCurrency })
        .where(eq(profiles.id, user.id));
    }

    // Ensure we don't create duplicate budgets for the same (user, year).
    const existing = await db.query.budgets.findFirst({
      where: and(eq(budgets.userId, user.id), eq(budgets.year, year)),
    });

    if (!existing) {
      await db.insert(budgets).values({
        userId: user.id,
        year,
      });
    }

    revalidatePath("/app");

    return { success: true, year };
  } catch (error) {
    console.error("Failed to create budget:", error);
    return { error: error instanceof Error ? error.message : "Failed to create budget." };
  }
}

