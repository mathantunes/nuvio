"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { budgets } from "@/db/schema";
import { createClient } from "@/lib/supabase-server";
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
});

export async function createBudget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a budget." };
  }

  const rawYear = String(formData.get("year") ?? "");
  const parsed = createBudgetSchema.safeParse({ year: rawYear });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid year." };
  }

  const { year } = parsed.data;

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
}

