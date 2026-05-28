import { Card, DataList, DataListHeader, DataListRow, RowAction } from "@/components/ui";
import { db } from "@/db/client";
import { accounts, profiles } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { AccountsForm } from "../../accounts-form";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { deleteAccount } from "../../accounts.actions";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetAccountsPage({ params }: Props) {
  const { year: yearString } = await params;
  const numericYear = Number(yearString);
  if (!Number.isInteger(numericYear)) {
    redirect("/app");
  }

  const user = await AuthService.getCurrentUser();

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), eq(accounts.isActive, true)))
    .orderBy(desc(accounts.createdAt));

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          Accounts
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Define the accounts where your money lives. These can be reused across
          all budget years.
        </p>
      </header>

      <Card>
        {userAccounts.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            You don&apos;t have any accounts yet. Create your first one below.
          </p>
        ) : (
          <DataList
            className="mb-4"
            header={
              <>
                <span className="flex-1">Name</span>
                <span className="w-20">Currency</span>
                <span className="w-16 text-right">Actions</span>
              </>
            }
          >
            {userAccounts.map((account) => (
              <DataListRow key={account.id}>
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium" style={{ color: "var(--color-text)" }}>
                    {account.name}
                  </p>
                  {account.institution ? (
                    <p className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                      {account.institution}
                    </p>
                  ) : null}
                </div>
                <span
                  className="w-20 uppercase tracking-[0.15em]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {account.currencyCode}
                </span>
                <div className="w-16 text-right">
                  <form action={async () => {
                    "use server";
                    await deleteAccount(account.id);
                  }}>
                    <RowAction type="submit" danger>Delete</RowAction>
                  </form>
                </div>
              </DataListRow>
            ))}
          </DataList>
        )}
        <AccountsForm defaultCurrencyCode={profile?.baseCurrency} />
      </Card>
    </div>
  );
}

