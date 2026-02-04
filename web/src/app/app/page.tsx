import { redirect } from "next/navigation";
import { createServerClientWithCookies } from "@/lib/supabase-server";
import { getMessages } from "@/i18n";

export default async function AppHomePage() {
  const messages = getMessages("en");
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 text-center dark:bg-black">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
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

        <section className="grid gap-4 text-left sm:grid-cols-2">
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
        </section>
      </div>
    </main>
  );
}

