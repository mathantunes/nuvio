import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";
import { db } from "@/db/client";
import { budgets, budgetLines, categories, profiles, savingsSnapshotLines, savingsSnapshots, accounts } from "@/db/schema";
import { and, eq, inArray, lt } from "drizzle-orm";
import { createSavingsSnapshotLine } from "./savings.actions";
import { formatCurrency } from "../planning/currency-format";

type Props = {
    params: Promise<{ year: string }>;
};

export default async function SavingsPage({ params }: Props) {
    const { year: yearString } = await params;
    const year = Number(yearString);

    if (!Number.isInteger(year)) {
        redirect("/app");
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get budget
    const savings = await db.query.savingsSnapshots.findFirst({
        where: and(eq(savingsSnapshots.userId, user.id), eq(savingsSnapshots.asOf, new Date(year, 0, 1))),
    }) ?? (await db.insert(savingsSnapshots).values({
        userId: user.id,
        asOf: new Date(year, 0, 1),
    }).returning({ id: savingsSnapshots.id }))[0];

    // Get profile for base currency
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
    });

    const allAccounts = await db.query.accounts.findMany({
        where: eq(accounts.userId, user.id),
    });

    const baseCurrency = profile?.baseCurrency ?? "USD";

    // Get all budget lines for this budget with categories
    const allSavingsLines = await db.query.savingsSnapshotLines.findMany({
        where: eq(savingsSnapshotLines.snapshotId, savings.id),
    });

    return (
        <div className="space-y-4">
            <header className="space-y-1">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Planning
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This is the overview of your initial savings on the first day of {year}.
                    <br />
                    The savings here will be used to compute your overall savings throughout the year.
                </p>
            </header>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <th className="text-left py-2 px-2 font-semibold text-zinc-900 dark:text-zinc-50">
                                Account
                            </th>
                            <th className="text-left py-2 px-2 font-semibold text-zinc-900 dark:text-zinc-50">
                                Label
                            </th>
                            <th className="text-left py-2 px-2 font-semibold text-zinc-900 dark:text-zinc-50">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {allSavingsLines.map((line) => (
                            <tr key={line.id}>
                                <td className="text-left py-2 px-2 text-zinc-700 dark:text-zinc-300">{
                                    `${allAccounts.find(a => a.id == line.accountId)?.name} (${allAccounts.find(a => a.id == line.accountId)?.currencyCode})`
                                }</td>
                                <td className="text-left py-2 px-2 text-zinc-700 dark:text-zinc-300">{line.label}</td>
                                <td className="text-left py-2 px-2 text-zinc-700 dark:text-zinc-300">{formatCurrency(Number(line.amount), allAccounts.find(a => a.id == line.accountId)?.currencyCode!)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <form action={async (data: FormData) => {
                    "use server";
                    data.set("year", yearString);
                    data.set("snapshotId", savings.id);
                    await createSavingsSnapshotLine(data);
                }}
                    className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
                            Label
                        </label>
                        <input
                            name="label"
                            required
                            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
                            placeholder={"Investment account, pension, checking"}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
                                Account
                            </label>
                            <select
                                name="accountId"
                                required
                                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
                            >
                                {allAccounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} ({account.currencyCode})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
                                Amount
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    className="block flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-zinc-900 dark:text-zinc-50">
                            Notes (optional)
                        </label>
                        <textarea
                            name="notes"
                            rows={2}
                            maxLength={500}
                            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
                            placeholder="Additional details..."
                        />
                    </div>
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        Add savings
                    </button>
                </form>
            </div>
        </div>
    );
}
