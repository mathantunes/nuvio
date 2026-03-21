"use server";

import { db } from "@/db/client";
import { savingsSnapshotLines } from "@/db/schema";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createSavingsSnapshotLine(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "You must be signed in to create a savings snapshot line." };
    }

    await db.insert(savingsSnapshotLines).values({
        snapshotId: String(formData.get("snapshotId") ?? ""),
        accountId: String(formData.get("accountId") ?? ""),
        amount: String(formData.get("amount") ?? "0"),
        label: String(formData.get("label") ?? ""),
        notes: String(formData.get("notes") ?? ""),
    });

    revalidatePath(`/app/${formData.get("year")}/savings`);
    revalidatePath(`/app/${formData.get("year")}`);

    return { success: true };
}