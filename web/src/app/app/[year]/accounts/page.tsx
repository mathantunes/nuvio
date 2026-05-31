import { Card, DataList, DataListRow, RowAction } from "@/components/ui";
import { db } from "@/db/client";
import { accounts, profiles } from "@/db/schema";
import { AuthService } from "@/lib/auth-service";
import { AccountsForm } from "../../accounts-form";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { deleteAccount, setAccountPrimary } from "../../accounts.actions";
import Link from "next/link";
import { getOnboardingCounts } from "@/lib/onboarding";

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

  const [userAccounts, { transactionCount }] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), eq(accounts.isActive, true)))
      .orderBy(desc(accounts.createdAt)),
    getOnboardingCounts(user.id, null),
  ]);

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
        {userAccounts.length === 0 && (
          <>
            <div className="mb-4 rounded-lg p-4 space-y-2" style={{ backgroundColor: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Set up your first account</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Accounts are where your money lives — a bank account, credit card, cash wallet, brokerage, etc. Use the form below to add one: give it a name, a currency, and optionally the institution it belongs to. You&apos;ll pick an account every time you log a transaction.
              </p>
            </div>
          </>
        )}
        {userAccounts.length > 0 && (
          <DataList
            className="mb-4"
            header={
              <>
                <span className="flex-1">Name</span>
                <span className="w-20">Currency</span>
                <span
                  className="w-20 text-center"
                  title="The primary account is used automatically when you confirm a budget line as paid with one click."
                >
                  Primary
                </span>
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
                <div className="w-20 text-center">
                  <form action={async () => {
                    "use server";
                    await setAccountPrimary(account.id, account.currencyCode);
                  }}>
                    <button
                      type="submit"
                      title={account.isPrimary ? "Primary account for this currency" : "Set as primary for this currency"}
                      className="text-base leading-none transition-opacity hover:opacity-70"
                      style={{ color: account.isPrimary ? "var(--color-brand)" : "var(--color-text-subtle)" }}
                    >
                      {account.isPrimary ? "★" : "☆"}
                    </button>
                  </form>
                </div>
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
        {userAccounts.length > 0 && transactionCount === 0 && (
          <div className="mb-4 rounded-lg p-4 space-y-1" style={{ backgroundColor: "var(--color-brand-subtle)", border: "1px solid var(--color-brand)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Next: log your first transaction</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              You&apos;re all set! Head to{" "}
              <Link href={`/app/${yearString}/tracking`} className="font-medium underline hover:opacity-70" style={{ color: "var(--color-brand)" }}>Tracking</Link>
              {" "}to start logging real income and expenses against your plan.
            </p>
          </div>
        )}
        <AccountsForm defaultCurrencyCode={profile?.baseCurrency} year={numericYear} />
      </Card>
    </div>
  );
}

