"use server";

import { db } from "@/db/client";
import { savingsSnapshots, savingsSnapshotLines } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

export async function createSavingsSnapshotLine(formData: FormData) {
    try {
        const user = await AuthService.getCurrentUser();

        const snapshotId = String(formData.get("snapshotId") ?? "");

        const snapshot = await db.query.savingsSnapshots.findFirst({
            where: and(eq(savingsSnapshots.id, snapshotId), eq(savingsSnapshots.userId, user.id)),
        });

        if (!snapshot) return { error: "Snapshot not found." };

        const rawAccountId = String(formData.get("accountId") ?? "");

        await db.insert(savingsSnapshotLines).values({
            snapshotId,
            accountId: rawAccountId || null,
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