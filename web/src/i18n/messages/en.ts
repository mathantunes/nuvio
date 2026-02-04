export const en = {
  common: {
    appName: "Globudget",
  },
  landing: {
    title: "Plan, track, and analyze your multi-currency budget.",
    subtitle:
      "Globudget helps you manage accounts across currencies, plan budgets, and understand the true cost of FX transfers, fees, and taxes.",
    ctaSignIn: "Sign in to get started",
    featureBudgetsTitle: "Budgets & actuals",
    featureBudgetsBody:
      "Define budgets by category and compare planned vs actual in your base currency.",
    featureAccountsTitle: "Multi-currency accounts",
    featureAccountsBody:
      "Track balances across currencies while keeping reporting consistent in one base currency.",
    featureFxTitle: "FX transparency",
    featureFxBody:
      "Record transfers, fees, and taxes to see the effective FX rates you actually pay.",
  },
  auth: {
    loginTitle: "Sign in to Globudget",
    loginSubtitle: "Enter your email to receive a one-time sign-in link.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    sendMagicLink: "Send magic link",
    sendingMagicLink: "Sending link...",
    magicLinkSent: "Check your inbox for a sign-in link.",
    legalNote:
      "By continuing, you agree to use this app for personal budgeting only.",
  },
  app: {
    welcome: "Welcome",
    welcomeWithEmail: "Welcome, {email}.",
    workspaceIntro:
      "This is your authenticated workspace. Next steps: wire your base currency, accounts, and first transactions.",
    profileCardTitle: "Profile & base currency",
    profileBaseCurrencyLabel: "Base currency",
    profileBaseCurrencyUnset: "Base currency is not set yet.",
    profileLocaleLabel: "Locale",
    profileTimeZoneLabel: "Time zone",
    profileLoading: "Loading your profile…",
    profileError: "We couldn't load your profile. Please try again.",
    gettingStartedTitle: "Getting started",
    gettingStartedBody:
      "Soon you'll be able to define your base currency, create accounts in multiple currencies, and set up your first budget.",
    fxSectionTitle: "FX & transfers",
    fxSectionBody:
      "Globudget will track cross-currency moves, fees, taxes, and effective FX rates so you can see the true cost of transfers.",
  },
} as const;

