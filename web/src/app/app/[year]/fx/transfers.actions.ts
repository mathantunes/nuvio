"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { transfers, accounts, fxRates } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const createTransferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  sourceAmount: z.string().transform(Number).pipe(z.number().positive()),
  sourceCurrencyCode: z.string().length(3).regex(/^[A-Z]{3}$/),
  targetAccountId: z.string().uuid(),
  targetAmount: z.string().transform(Number).pipe(z.number().positive()),
  targetCurrencyCode: z.string().length(3).regex(/^[A-Z]{3}$/),
  fxRate: z.string().transform(Number).pipe(z.number().positive()).optional(),
  feeAmount: z.string().transform(Number).pipe(z.number().min(0)).default("0"),
  taxAmount: z.string().transform(Number).pipe(z.number().min(0)).default("0"),
  note: z.string().max(500).optional(),
  occurredAt: z.string().datetime(),
});

export async function createTransfer(formData: FormData) {
  try {
    const user = await AuthService.getCurrentUser();

    const raw = {
      sourceAccountId: String(formData.get("sourceAccountId") ?? ""),
      sourceAmount: String(formData.get("sourceAmount") ?? ""),
      sourceCurrencyCode: String(formData.get("sourceCurrencyCode") ?? "").toUpperCase(),
      targetAccountId: String(formData.get("targetAccountId") ?? ""),
      targetAmount: String(formData.get("targetAmount") ?? ""),
      targetCurrencyCode: String(formData.get("targetCurrencyCode") ?? "").toUpperCase(),
      fxRate: formData.get("fxRate") ? String(formData.get("fxRate")) : undefined,
      feeAmount: String(formData.get("feeAmount") ?? "0"),
      taxAmount: String(formData.get("taxAmount") ?? "0"),
      note: formData.get("note") ? String(formData.get("note")) : undefined,
      occurredAt: String(formData.get("occurredAt") ?? new Date().toISOString()),
    };

    const parsed = createTransferSchema.safeParse(raw);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid transfer data." };
    }

    const {
      sourceAccountId,
      sourceAmount,
      sourceCurrencyCode,
      targetAccountId,
      targetAmount,
      targetCurrencyCode,
      fxRate,
      feeAmount,
      taxAmount,
      note,
      occurredAt,
    } = parsed.data;

    // Verify accounts belong to user and have correct currencies
    const [sourceAccount, targetAccount] = await Promise.all([
      db.query.accounts.findFirst({
        where: and(eq(accounts.id, sourceAccountId), eq(accounts.userId, user.id)),
      }),
      db.query.accounts.findFirst({
        where: and(eq(accounts.id, targetAccountId), eq(accounts.userId, user.id)),
      }),
    ]);

    if (!sourceAccount || sourceAccount.currencyCode !== sourceCurrencyCode) {
      return { error: "Invalid source account or currency mismatch." };
    }

    if (!targetAccount || targetAccount.currencyCode !== targetCurrencyCode) {
      return { error: "Invalid target account or currency mismatch." };
    }

    // Calculate effective FX rate if not provided
    let effectiveFxRate = fxRate;
    if (!fxRate && sourceCurrencyCode !== targetCurrencyCode) {
      effectiveFxRate = targetAmount / (sourceAmount - feeAmount - taxAmount);
    } else if (sourceCurrencyCode === targetCurrencyCode) {
      effectiveFxRate = 1;
    }

    // Create the transfer
    await db.insert(transfers).values({
      userId: user.id,
      sourceAccountId,
      sourceAmount: sourceAmount.toString(),
      sourceCurrencyCode,
      targetAccountId,
      targetAmount: targetAmount.toString(),
      targetCurrencyCode,
      fxRate: fxRate?.toString(),
      feeAmount: feeAmount.toString(),
      taxAmount: taxAmount.toString(),
      effectiveFxRate: effectiveFxRate?.toString(),
      note,
      occurredAt: new Date(occurredAt),
    });

    // Revalidate paths
    revalidatePath("/app");
    revalidatePath(`/app/${new Date(occurredAt).getFullYear()}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to create transfer:", error);
    return { error: error instanceof Error ? error.message : "Failed to create transfer." };
  }
}

export async function getTransfers(year?: number) {
  try {
    const user = await AuthService.getCurrentUser();

    const baseQuery = db
      .select({
        id: transfers.id,
        sourceAccountId: transfers.sourceAccountId,
        sourceAmount: transfers.sourceAmount,
        sourceCurrencyCode: transfers.sourceCurrencyCode,
        sourceAccountName: accounts.name,
        targetAccountId: transfers.targetAccountId,
        targetAmount: transfers.targetAmount,
        targetCurrencyCode: transfers.targetCurrencyCode,
        targetAccountName: accounts.name,
        fxRate: transfers.fxRate,
        feeAmount: transfers.feeAmount,
        taxAmount: transfers.taxAmount,
        effectiveFxRate: transfers.effectiveFxRate,
        note: transfers.note,
        occurredAt: transfers.occurredAt,
        createdAt: transfers.createdAt,
      })
      .from(transfers)
      .leftJoin(accounts, eq(transfers.sourceAccountId, accounts.id));

    const whereConditions = [eq(transfers.userId, user.id)];
    
    if (year) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      whereConditions.push(gte(transfers.occurredAt, yearStart));
      whereConditions.push(lte(transfers.occurredAt, yearEnd));
    }

    const transfersList = await baseQuery.where(and(...whereConditions)).orderBy(desc(transfers.occurredAt));

    // We need to get target account names separately since we joined on source accounts
    const transfersWithTargetNames = await Promise.all(
      transfersList.map(async (transfer) => {
        const targetAccount = await db.query.accounts.findFirst({
          where: eq(accounts.id, transfer.targetAccountId),
        });
        return {
          ...transfer,
          targetAccountName: targetAccount?.name || "Unknown",
        };
      })
    );

    return { success: true, data: transfersWithTargetNames };
  } catch (error) {
    console.error("Failed to get transfers:", error);
    return { error: error instanceof Error ? error.message : "Failed to get transfers." };
  }
}

export async function deleteTransfer(transferId: string) {
  try {
    const user = await AuthService.getCurrentUser();

    // Verify transfer belongs to user
    const transfer = await db.query.transfers.findFirst({
      where: and(eq(transfers.id, transferId), eq(transfers.userId, user.id)),
    });

    if (!transfer) {
      return { error: "Transfer not found or access denied." };
    }

    await db.delete(transfers).where(eq(transfers.id, transferId));

    // Revalidate paths
    revalidatePath("/app");
    revalidatePath(`/app/${transfer.occurredAt.getFullYear()}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete transfer:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete transfer." };
  }
}

export async function getFxRates(baseCurrency: string, quoteCurrency: string) {
  try {
    const user = await AuthService.getCurrentUser();

    const rates = await db
      .select({
        id: fxRates.id,
        rate: fxRates.rate,
        asOf: fxRates.asOf,
      })
      .from(fxRates)
      .where(
        and(
          eq(fxRates.userId, user.id),
          eq(fxRates.baseCurrency, baseCurrency),
          eq(fxRates.quoteCurrency, quoteCurrency)
        )
      )
      .orderBy(desc(fxRates.asOf))
      .limit(10);

    return { success: true, data: rates };
  } catch (error) {
    console.error("Failed to get FX rates:", error);
    return { error: error instanceof Error ? error.message : "Failed to get FX rates." };
  }
}

export async function getUserAccounts() {
  try {
    const user = await AuthService.getCurrentUser();

    const userAccounts = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        currencyCode: accounts.currencyCode,
        institution: accounts.institution,
        isActive: accounts.isActive,
      })
      .from(accounts)
      .where(eq(accounts.userId, user.id))
      .orderBy(accounts.name);

    return { success: true, data: userAccounts };
  } catch (error) {
    console.error("Failed to get user accounts:", error);
    return { error: error instanceof Error ? error.message : "Failed to get accounts." };
  }
}
