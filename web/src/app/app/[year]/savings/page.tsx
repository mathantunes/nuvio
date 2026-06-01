import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { profiles, savingsSnapshotLines, savingsSnapshots, accounts } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { createSavingsSnapshotLine, deleteSavingsSnapshotLine } from "./savings.actions";
import { formatCurrency } from "../planning/currency-format";
import { AuthService } from "@/lib/auth-service";
import { Card, Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function SavingsPage({ params }: Props) {
  const { year: yearString } = await params;
  const year = Number(yearString);

  if (!Number.isInteger(year)) {
    redirect("/app");
  }

  const user = await AuthService.getCurrentUser();

  const snapshotWindowStart = new Date(Date.UTC(year - 1, 11, 30));
  const snapshotWindowEnd = new Date(Date.UTC(year, 0, 2));

  const savings =
    (await db.query.savingsSnapshots.findFirst({
      where: and(
        eq(savingsSnapshots.userId, user.id),
        gte(savingsSnapshots.asOf, snapshotWindowStart),
        lte(savingsSnapshots.asOf, snapshotWindowEnd),
      ),
    })) ??
    (
      await db
        .insert(savingsSnapshots)
        .values({
          userId: user.id,
          asOf: new Date(Date.UTC(year, 0, 1)),
        })
        .returning({ id: savingsSnapshots.id })
    )[0];

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const allAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, user.id),
  });

  const baseCurrency = profile?.baseCurrency ?? "USD";

  const allSavingsLines = await db.query.savingsSnapshotLines.findMany({
    where: eq(savingsSnapshotLines.snapshotId, savings.id),
  });

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Planning
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          This is the overview of your initial savings on the first day of {year}.
          <br />
          The savings here will be used to compute your overall savings throughout the year.
        </p>
      </header>

      <Card className="text-left">
        <Table>
          <Thead>
            <Tr>
              <Th>Account</Th>
              <Th>Label</Th>
              <Th>Amount</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {allSavingsLines.map((line) => (
              <Tr key={line.id}>
                <Td muted>
                  {`${allAccounts.find((a) => a.id == line.accountId)?.name} (${allAccounts.find((a) => a.id == line.accountId)?.currencyCode})`}
                </Td>
                <Td muted>{line.label}</Td>
                <Td muted>
                  {formatCurrency(Number(line.amount), allAccounts.find((a) => a.id == line.accountId)?.currencyCode ?? baseCurrency)}
                </Td>
                <Td muted>
                  <form action={async () => {
                    "use server";
                    await deleteSavingsSnapshotLine(line.id, year);
                  }}>
                    <button type="submit" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--color-danger)" }}>
                      Delete
                    </button>
                  </form>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <form
          action={async (data: FormData) => {
            "use server";
            data.set("year", yearString);
            data.set("snapshotId", savings.id);
            await createSavingsSnapshotLine(data);
          }}
          className="mt-4 space-y-3 border-t border-dashed pt-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
              Label
            </label>
            <input name="label" required className="input" placeholder="Investment account, pension, checking" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
                Account
              </label>
              <select name="accountId" required className="input">
                {allAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currencyCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
                Amount
              </label>
              <div className="flex items-center gap-2">
                <input name="amount" type="number" step="0.01" min="0.01" required className="input" placeholder="0.00" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium" style={{ color: "var(--color-text)" }}>
              Notes (optional)
            </label>
            <textarea name="notes" rows={2} maxLength={500} className="input" placeholder="Additional details..." />
          </div>
          <button type="submit" className="btn-primary">
            Add savings
          </button>
        </form>
      </Card>
    </div>
  );
}
