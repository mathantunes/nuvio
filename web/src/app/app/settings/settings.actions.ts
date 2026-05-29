"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  baseCurrency: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code."),
});

export async function updateProfile(_prevState: unknown, formData: FormData) {
  const user = await AuthService.getCurrentUser();

  const raw = {
    baseCurrency: String(formData.get("baseCurrency") ?? "").toUpperCase(),
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db
    .update(profiles)
    .set({ baseCurrency: parsed.data.baseCurrency })
    .where(eq(profiles.id, user.id));

  revalidatePath("/app/settings");

  return { success: true };
}
