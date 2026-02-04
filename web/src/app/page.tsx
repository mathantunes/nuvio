import { getMessages } from "@/i18n";

export default function Home() {
  const messages = getMessages("en");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 text-center dark:bg-black">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {messages.common.appName}
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {messages.landing.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {messages.landing.subtitle}
          </p>
        </header>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 sm:w-auto dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {messages.landing.ctaSignIn}
          </a>
        </div>

        <section className="grid gap-4 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {messages.landing.featureBudgetsTitle}
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {messages.landing.featureBudgetsBody}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {messages.landing.featureAccountsTitle}
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {messages.landing.featureAccountsBody}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {messages.landing.featureFxTitle}
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {messages.landing.featureFxBody}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
