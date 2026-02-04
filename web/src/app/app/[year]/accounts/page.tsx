import { db } from "@/db/client";
import { accounts, profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase-server";
import { AccountsForm } from "../../accounts-form";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ year: string }>;
};

export default async function BudgetAccountsPage({ params }: Props) {
  const { year: yearString } = await params;
  const numericYear = Number(yearString);
  if (!Number.isInteger(numericYear)) {
    redirect("/app");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Accounts
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Define the accounts where your money lives. These can be reused across
          all budget years.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-700 dark:bg-zinc-950">
        {userAccounts.length === 0 ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            You don&apos;t have any accounts yet. Create your first one below.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 text-xs dark:divide-zinc-800">
            {userAccounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {account.name}
                  </p>
                  {account.institution ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {account.institution}
                    </p>
                  ) : null}
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-700 dark:text-zinc-200">
                  {account.currencyCode}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-dashed border-zinc-200 pt-3 dark:border-zinc-800">
          <AccountsForm defaultCurrencyCode={profile?.baseCurrency} />
        </div>
      </div>
    </div>
  );
}

