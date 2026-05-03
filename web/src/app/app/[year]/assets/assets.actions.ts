"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { loans, assets, assetValuations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AuthService } from "@/lib/auth-service";

function revalidateAssetPaths(year: string) {
  revalidatePath(`/app/${year}/assets`);
  revalidatePath(`/app/${year}/loans`);
  revalidatePath(`/app/${year}/wealth`);
  revalidatePath(`/app/${year}`);
}

export async function createAsset(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const year = formData.get("year") as string;

  await db.insert(assets).values({
    userId: user.id,
    name: formData.get("name") as string,
    kind: (formData.get("kind") as string) || "other",
    description: (formData.get("description") as string) || null,
    currencyCode: (formData.get("currencyCode") as string).toUpperCase(),
    purchasePrice: formData.get("purchasePrice") as string,
    purchasedAt: new Date(formData.get("purchasedAt") as string),
    notes: (formData.get("notes") as string) || null,
  });

  revalidateAssetPaths(year);
}

export async function recordAssetValuation(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const assetId = formData.get("assetId") as string;
  const year = formData.get("year") as string;

  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
  if (!asset || asset.userId !== user.id) throw new Error("Not found");

  await db.insert(assetValuations).values({
    userId: user.id,
    assetId,
    value: formData.get("value") as string,
    currencyCode: asset.currencyCode,
    valuedAt: new Date(formData.get("valuedAt") as string),
    notes: (formData.get("notes") as string) || null,
  });

  revalidateAssetPaths(year);
}

export async function deleteAsset(formData: FormData) {
  const user = await AuthService.getCurrentUser();
  const assetId = formData.get("assetId") as string;
  const year = formData.get("year") as string;

  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
  if (!asset || asset.userId !== user.id) throw new Error("Not found");

  // Unlink from any loans first, then delete valuations and asset
  await db.update(loans).set({ assetId: null }).where(eq(loans.assetId, assetId));
  await db.delete(assetValuations).where(eq(assetValuations.assetId, assetId));
  await db.delete(assets).where(eq(assets.id, assetId));

  revalidateAssetPaths(year);
}
