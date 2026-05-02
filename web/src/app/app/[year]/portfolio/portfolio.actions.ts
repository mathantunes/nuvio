"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  investmentPositions,
  investmentValuations,
  investmentFlows,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { AuthService } from "@/lib/auth-service";

export async function recordValuation(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const positionId = formData.get("positionId") as string;
  const amount = formData.get("amount") as string;
  const asOf = formData.get("asOf") as string;
  const notes = (formData.get("notes") as string) || null;
  const year = formData.get("year") as string;

  // Verify the position belongs to this user
  const [position] = await db
    .select()
    .from(investmentPositions)
    .where(eq(investmentPositions.id, positionId));
  if (!position || position.userId !== user.id) throw new Error("Not found");

  await db.insert(investmentValuations).values({
    userId: user.id,
    positionId,
    amount,
    asOf: new Date(asOf),
    notes,
  });

  revalidatePath(`/app/${year}/portfolio`);
  revalidatePath(`/app/${year}`);
}

export async function recordFlow(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const positionId = formData.get("positionId") as string;
  const amount = formData.get("amount") as string;
  const flowKind = formData.get("flowKind") as string;
  const occurredAt = formData.get("occurredAt") as string;
  const notes = (formData.get("notes") as string) || null;
  const year = formData.get("year") as string;

  const [position] = await db
    .select()
    .from(investmentPositions)
    .where(eq(investmentPositions.id, positionId));
  if (!position || position.userId !== user.id) throw new Error("Not found");

  await db.insert(investmentFlows).values({
    userId: user.id,
    positionId,
    amount,
    flowKind,
    occurredAt: new Date(occurredAt),
    notes,
  });

  revalidatePath(`/app/${year}/portfolio`);
}

export async function createPosition(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const name = formData.get("name") as string;
  const currencyCode = formData.get("currencyCode") as string;
  const kind = formData.get("kind") as string;
  const institution = (formData.get("institution") as string) || null;
  const year = formData.get("year") as string;

  await db.insert(investmentPositions).values({
    userId: user.id,
    name,
    currencyCode: currencyCode.toUpperCase(),
    kind,
    institution,
  });

  revalidatePath(`/app/${year}/portfolio`);
}
