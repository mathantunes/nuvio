"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import { createClient } from "@/lib/supabase-server";
import { eq } from "drizzle-orm";

const createAccountSchema = z.object({
  name: z.string().min(1).max(120),
  currencyCode: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency code must be a 3-letter ISO code."),
  institution: z.string().max(200).optional(),
});

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create an account." };
  }

  const raw = {
    name: String(formData.get("name") ?? ""),
    currencyCode: String(formData.get("currencyCode") ?? "").toUpperCase(),
    institution: formData.get("institution")
      ? String(formData.get("institution"))
      : undefined,
  };

  const parsed = createAccountSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid account data." };
  }

  const { name, currencyCode, institution } = parsed.data;

  await db.insert(accounts).values({
    userId: user.id,
    name,
    currencyCode,
    institution,
  });

  // Refresh the /app page so the new account appears in the list.
  revalidatePath("/app");

  return { success: true };
}


export async function deleteAccount(accountId: string) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete an account." };
  }

  await db.delete(accounts).where(eq(accounts.id, accountId));

  revalidatePath("/app");

  return { success: true };
}
