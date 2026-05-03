"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  loans,
  loanPayments,
  loanAmortizations,
  instrumentTransfers,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AuthService } from "@/lib/auth-service";

// ── Loan actions ──────────────────────────────────────────────────────────────

export async function createSimulation(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const year = formData.get("year") as string;

  await db.insert(loans).values({
    userId: user.id,
    name: formData.get("name") as string,
    lender: formData.get("lender") as string,
    principal: formData.get("principal") as string,
    currencyCode: (formData.get("currencyCode") as string).toUpperCase(),
    interestRate: formData.get("interestRate") as string,
    termMonths: parseInt(formData.get("termMonths") as string, 10),
    startDate: new Date(formData.get("startDate") as string),
    status: "simulation",
    assetId: (formData.get("assetId") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath(`/app/${year}/loans`);
}

export async function updateSimulation(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const year = formData.get("year") as string;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");
  if (loan.status !== "simulation") throw new Error("Only simulations can be edited");

  await db.update(loans).set({
    name: formData.get("name") as string,
    lender: (formData.get("lender") as string) || "",
    principal: formData.get("principal") as string,
    currencyCode: (formData.get("currencyCode") as string).toUpperCase(),
    interestRate: formData.get("interestRate") as string,
    termMonths: parseInt(formData.get("termMonths") as string, 10),
    startDate: new Date(formData.get("startDate") as string),
    assetId: (formData.get("assetId") as string) || null,
    notes: (formData.get("notes") as string) || null,
  }).where(eq(loans.id, loanId));

  revalidatePath(`/app/${year}/loans`);
}

export async function promoteToActive(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const accountId = (formData.get("accountId") as string) || null;
  const disbursementDate = (formData.get("disbursementDate") as string) || null;
  const year = formData.get("year") as string;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");
  if (loan.status !== "simulation") throw new Error("Only simulations can be promoted");

  // Optional: record the bank disbursement as cash inflow on a linked account
  if (accountId && disbursementDate) {
    await db.insert(instrumentTransfers).values({
      userId: user.id,
      accountId,
      direction: "from_instrument",
      instrumentType: "loan",
      instrumentId: loanId,
      amount: loan.principal,
      currencyCode: loan.currencyCode,
      kind: "loan_disbursement",
      occurredAt: new Date(disbursementDate),
      notes: `Loan disbursement: ${loan.name}`,
    });
  }

  await db.update(loans).set({ status: "active" }).where(eq(loans.id, loanId));

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}

export async function recordPayment(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const accountId = (formData.get("accountId") as string) || null;
  const year = formData.get("year") as string;
  const paymentDate = new Date(formData.get("paymentDate") as string);
  const totalAmount = formData.get("totalAmount") as string;
  const principalAmount = formData.get("principalAmount") as string;
  const interestAmount = formData.get("interestAmount") as string;
  const remainingBalance = formData.get("remainingBalance") as string;
  const notes = (formData.get("notes") as string) || null;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");
  if (loan.status !== "active") throw new Error("Can only record payments on active loans");

  let instrumentTransferId: string | null = null;

  if (accountId) {
    const [transfer] = await db
      .insert(instrumentTransfers)
      .values({
        userId: user.id,
        accountId,
        direction: "to_instrument",
        instrumentType: "loan",
        instrumentId: loanId,
        amount: totalAmount,
        currencyCode: loan.currencyCode,
        kind: "loan_payment",
        occurredAt: paymentDate,
        notes,
      })
      .returning({ id: instrumentTransfers.id });

    instrumentTransferId = transfer.id;
  }

  await db.insert(loanPayments).values({
    userId: user.id,
    loanId,
    instrumentTransferId,
    paymentDate,
    totalAmount,
    principalAmount,
    interestAmount,
    remainingBalance,
    notes,
  });

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}

export async function recordAmortization(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const accountId = (formData.get("accountId") as string) || null;
  const year = formData.get("year") as string;
  const occurredAt = new Date(formData.get("occurredAt") as string);
  const amount = formData.get("amount") as string;
  const notes = (formData.get("notes") as string) || null;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");
  if (loan.status !== "active") throw new Error("Can only record amortizations on active loans");

  let instrumentTransferId: string | null = null;

  if (accountId) {
    const [transfer] = await db
      .insert(instrumentTransfers)
      .values({
        userId: user.id,
        accountId,
        direction: "to_instrument",
        instrumentType: "loan",
        instrumentId: loanId,
        amount,
        currencyCode: loan.currencyCode,
        kind: "loan_amortization",
        occurredAt,
        notes,
      })
      .returning({ id: instrumentTransfers.id });

    instrumentTransferId = transfer.id;
  }

  await db.insert(loanAmortizations).values({
    userId: user.id,
    loanId,
    amount,
    kind: "a_prazo",
    occurredAt,
    instrumentTransferId,
    notes,
  });

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}

export async function linkAssetToLoan(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const assetId = (formData.get("assetId") as string) || null;
  const year = formData.get("year") as string;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");

  await db.update(loans).set({ assetId }).where(eq(loans.id, loanId));

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}

export async function closeLoan(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const year = formData.get("year") as string;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");

  await db.update(loans).set({ status: "closed" }).where(eq(loans.id, loanId));

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}

export async function deleteLoan(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const year = formData.get("year") as string;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");
  // Only simulations can be deleted (active loans should be closed instead)
  if (loan.status !== "simulation") throw new Error("Only simulations can be deleted");

  await db.delete(loans).where(eq(loans.id, loanId));

  revalidatePath(`/app/${year}/loans`);
}

export async function deletePayment(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const paymentId = formData.get("paymentId") as string;
  const year = formData.get("year") as string;

  const [payment] = await db
    .select()
    .from(loanPayments)
    .where(and(eq(loanPayments.id, paymentId), eq(loanPayments.userId, user.id)));
  if (!payment) throw new Error("Not found");

  // Delete the loan_payment first (it holds the FK to instrument_transfer)
  const transferId = payment.instrumentTransferId;
  await db.delete(loanPayments).where(eq(loanPayments.id, paymentId));

  // Then delete the instrument_transfer (FK reference now gone)
  if (transferId) {
    await db.delete(instrumentTransfers).where(eq(instrumentTransfers.id, transferId));
  }

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}

export async function deleteAmortization(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const amortizationId = formData.get("amortizationId") as string;
  const year = formData.get("year") as string;

  const [amortization] = await db
    .select()
    .from(loanAmortizations)
    .where(and(eq(loanAmortizations.id, amortizationId), eq(loanAmortizations.userId, user.id)));
  if (!amortization) throw new Error("Not found");

  // Delete the amortization first (it holds the FK to instrument_transfer)
  const transferId = amortization.instrumentTransferId;
  await db.delete(loanAmortizations).where(eq(loanAmortizations.id, amortizationId));

  // Then delete the instrument_transfer
  if (transferId) {
    await db.delete(instrumentTransfers).where(eq(instrumentTransfers.id, transferId));
  }

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}

export async function demoteToSimulation(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const loanId = formData.get("loanId") as string;
  const year = formData.get("year") as string;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id) throw new Error("Not found");
  if (loan.status !== "active") throw new Error("Only active loans can be demoted");

  // Block if any payments or amortizations exist
  const [existingPayment] = await db
    .select({ id: loanPayments.id })
    .from(loanPayments)
    .where(eq(loanPayments.loanId, loanId))
    .limit(1);
  const [existingAmortization] = await db
    .select({ id: loanAmortizations.id })
    .from(loanAmortizations)
    .where(eq(loanAmortizations.loanId, loanId))
    .limit(1);

  if (existingPayment || existingAmortization) {
    throw new Error("Delete all payments and amortizations before demoting to simulation");
  }

  // Delete any disbursement instrument_transfer
  await db
    .delete(instrumentTransfers)
    .where(
      and(
        eq(instrumentTransfers.instrumentId, loanId),
        eq(instrumentTransfers.userId, user.id)
      )
    );

  await db.update(loans).set({ status: "simulation" }).where(eq(loans.id, loanId));

  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/variance`);
  revalidatePath(`/app/${year}`);
}
