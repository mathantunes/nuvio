"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { accounts, savingsSnapshots, savingsSnapshotLines } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { and, count, eq, gte, lte } from "drizzle-orm";

const createAccountSchema = z.object({
  name: z.string().min(1).max(120),
  currencyCode: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO code."),
  institution: z.string().max(200).optional(),
  openingBalance: z.string().optional().transform((v) => {
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }),
  year: z.string().optional().transform((v) => {
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }),
});

export async function createAccount(formData: FormData) {
  try {
    const user = await AuthService.getCurrentUser();

    const raw = {
      name: String(formData.get("name") ?? ""),
      currencyCode: String(formData.get("currencyCode") ?? "").toUpperCase(),
      institution: formData.get("institution") ? String(formData.get("institution")) : undefined,
      openingBalance: formData.get("openingBalance") ? String(formData.get("openingBalance")) : undefined,
      year: formData.get("year") ? String(formData.get("year")) : undefined,
    };

    const parsed = createAccountSchema.safeParse(raw);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid account data." };
    }

    const { name, currencyCode, institution, openingBalance, year } = parsed.data;

    // Auto-set as primary if this is the first account for this currency
    const [{ count: existingCount }] = await db
      .select({ count: count() })
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), eq(accounts.currencyCode, currencyCode)));

    const isPrimary = Number(existingCount) === 0;

    const [account] = await db.insert(accounts).values({
      userId: user.id,
      name,
      currencyCode,
      institution,
      isPrimary,
    }).returning({ id: accounts.id });

    // If an opening balance was provided, record it as a savings snapshot line for Jan 1.
    if (openingBalance !== null && year !== null && account) {
      const snapshotWindowStart = new Date(Date.UTC(year - 1, 11, 30));
      const snapshotWindowEnd = new Date(Date.UTC(year, 0, 2));

      // Find or create the Jan 1 snapshot for this year.
      const existing = await db.query.savingsSnapshots.findFirst({
        where: and(
          eq(savingsSnapshots.userId, user.id),
          gte(savingsSnapshots.asOf, snapshotWindowStart),
          lte(savingsSnapshots.asOf, snapshotWindowEnd),
        ),
      });

      const snapshot = existing ?? (
        await db.insert(savingsSnapshots).values({
          userId: user.id,
          asOf: new Date(Date.UTC(year, 0, 1)),
          label: `Start of ${year}`,
        }).returning({ id: savingsSnapshots.id })
      )[0];

      await db.insert(savingsSnapshotLines).values({
        snapshotId: snapshot.id,
        accountId: account.id,
        label: name,
        amount: String(openingBalance),
        currencyCode,
      });
    }

    revalidatePath(`/app`);

    return { success: true };
  } catch (error) {
    console.error("Failed to create account:", error);
    return { error: error instanceof Error ? error.message : "Failed to create account." };
  }
}

export async function deleteAccount(accountId: string) {
  try {
    const user = await AuthService.getCurrentUser();

    await db.delete(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)));

    revalidatePath("/app");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete account." };
  }
}

export async function setAccountPrimary(accountId: string, currencyCode: string) {
  try {
    const user = await AuthService.getCurrentUser();

    // Unset primary for all accounts of this currency for the user
    await db
      .update(accounts)
      .set({ isPrimary: false })
      .where(and(eq(accounts.userId, user.id), eq(accounts.currencyCode, currencyCode)));

    // Set this account as primary
    await db
      .update(accounts)
      .set({ isPrimary: true })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)));

    revalidatePath("/app");

    return { success: true };
  } catch (error) {
    console.error("Failed to set primary account:", error);
    return { error: error instanceof Error ? error.message : "Failed to update account." };
  }
}
