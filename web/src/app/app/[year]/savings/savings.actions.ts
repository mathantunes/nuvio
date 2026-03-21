"use server";

import { db } from "@/db/client";
import { savingsSnapshotLines } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { revalidatePath } from "next/cache";

export async function createSavingsSnapshotLine(formData: FormData) {
    try {
        const user = await AuthService.getCurrentUser();

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
    } catch (error) {
        console.error("Failed to create savings snapshot line:", error);
        return { error: error instanceof Error ? error.message : "Failed to create savings snapshot line." };
    }
}