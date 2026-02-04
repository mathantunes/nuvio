import { redirect } from "next/navigation";
import { createServerClientWithCookies } from "@/lib/supabase-server";
import { getMessages } from "@/i18n";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AppHomePage() {
  const messages = getMessages("en");
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const hasProfile = !!profile;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 text-center dark:bg-black">
      <div className="w-full max-w-3xl space-y-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {messages.common.appName}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {user.email
              ? messages.app.welcomeWithEmail.replace("{email}", user.email)
              : messages.app.welcome}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {messages.app.workspaceIntro}
          </p>
        </header>

        <section className="grid gap-4 text-left sm:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-700 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {messages.app.profileCardTitle}
              </h2>
              {!hasProfile ? (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {messages.app.profileBaseCurrencyUnset}
                </p>
              ) : (
                <dl className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                      {messages.app.profileBaseCurrencyLabel}
                    </dt>
                    <dd className="font-mono uppercase text-zinc-900 dark:text-zinc-50">
                      {profile.baseCurrency}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                      {messages.app.profileLocaleLabel}
                    </dt>
                    <dd className="font-mono text-zinc-900 dark:text-zinc-50">
                      {profile.locale}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                      {messages.app.profileTimeZoneLabel}
                    </dt>
                    <dd className="font-mono text-zinc-900 dark:text-zinc-50">
                      {profile.timeZone}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-700 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {messages.app.gettingStartedTitle}
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {messages.app.gettingStartedBody}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-700 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {messages.app.fxSectionTitle}
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {messages.app.fxSectionBody}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

