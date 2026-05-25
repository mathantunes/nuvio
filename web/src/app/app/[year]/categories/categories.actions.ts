"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import { categories, budgetLines, transactions } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { eq, count } from "drizzle-orm";

function categoryBase(year: string) {
  return `/app/${year}/categories`;
}

const categoryIdSchema = z.string().uuid("Invalid category ID.");

export async function updateCategory(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const year = String(formData.get("year") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  const idParsed = categoryIdSchema.safeParse(categoryId);
  if (!idParsed.success || !name) {
    redirect(`${categoryBase(year)}?error=invalid`);
  }

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });

  if (!category || category.userId !== user.id) {
    redirect(`${categoryBase(year)}?error=not_found`);
  }

  await db
    .update(categories)
    .set({ name, updatedAt: new Date() })
    .where(eq(categories.id, categoryId));

  revalidatePath("/app");
  redirect(categoryBase(year));
}

export async function deleteCategory(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const year = String(formData.get("year") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");

  const idParsed = categoryIdSchema.safeParse(categoryId);
  if (!idParsed.success) redirect(`${categoryBase(year)}?error=invalid`);

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });

  if (!category || category.userId !== user.id) {
    redirect(`${categoryBase(year)}?error=not_found`);
  }

  const [blCount] = await db
    .select({ count: count() })
    .from(budgetLines)
    .where(eq(budgetLines.categoryId, categoryId));

  const [txCount] = await db
    .select({ count: count() })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId));

  const bLineCount = blCount?.count ?? 0;
  const txCountNum = txCount?.count ?? 0;

  if (bLineCount + txCountNum > 0) {
    redirect(
      `${categoryBase(year)}?error=referenced&categoryId=${categoryId}&budgetLines=${bLineCount}&transactions=${txCountNum}`
    );
  }

  await db.delete(categories).where(eq(categories.id, categoryId));
  revalidatePath("/app");
}

export async function forceDeleteCategory(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const year = String(formData.get("year") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");

  const idParsed = categoryIdSchema.safeParse(categoryId);
  if (!idParsed.success) redirect(`${categoryBase(year)}?error=invalid`);

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });

  if (!category || category.userId !== user.id) {
    redirect(`${categoryBase(year)}?error=not_found`);
  }

  await db.transaction(async (tx) => {
    await tx.delete(budgetLines).where(eq(budgetLines.categoryId, categoryId));
    await tx
      .update(transactions)
      .set({ categoryId: null })
      .where(eq(transactions.categoryId, categoryId));
    await tx.delete(categories).where(eq(categories.id, categoryId));
  });

  revalidatePath("/app");
}

export async function mergeCategories(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const year = String(formData.get("year") ?? "");
  const sourceCategoryId = String(formData.get("sourceCategoryId") ?? "");
  const targetCategoryId = String(formData.get("targetCategoryId") ?? "");

  const sourceParsed = categoryIdSchema.safeParse(sourceCategoryId);
  const targetParsed = categoryIdSchema.safeParse(targetCategoryId);
  if (!sourceParsed.success || !targetParsed.success || sourceCategoryId === targetCategoryId) {
    redirect(`${categoryBase(year)}?error=invalid`);
  }

  const [sourceCategory, targetCategory] = await Promise.all([
    db.query.categories.findFirst({ where: eq(categories.id, sourceCategoryId) }),
    db.query.categories.findFirst({ where: eq(categories.id, targetCategoryId) }),
  ]);

  if (!sourceCategory || sourceCategory.userId !== user.id) {
    redirect(`${categoryBase(year)}?error=not_found`);
  }
  if (!targetCategory || targetCategory.userId !== user.id) {
    redirect(`${categoryBase(year)}?error=not_found`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(budgetLines)
      .set({ categoryId: targetCategoryId })
      .where(eq(budgetLines.categoryId, sourceCategoryId));
    await tx
      .update(transactions)
      .set({ categoryId: targetCategoryId })
      .where(eq(transactions.categoryId, sourceCategoryId));
    await tx.delete(categories).where(eq(categories.id, sourceCategoryId));
  });

  revalidatePath("/app");
}
