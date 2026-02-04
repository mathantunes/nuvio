## Globudget – Agents Baseline

### Tech stack & scope
- **Frontend**: Next.js (App Router, SSR/ISR), TypeScript, React.
- **Backend**: Supabase (Postgres + Auth). No separate custom backend service unless explicitly introduced later.
- **Auth**: Supabase-based SSO (and/or email) with multi-tenant support. All user data must be strictly isolated by `user_id` (and later `household_id`).
- **Hosting**: Vercel (Next.js) + Supabase.

### Core domain principles
- **Base currency reporting**: Every user has a configurable base currency used for budgets and summary reporting.
- **Multi-currency correctness**: Amounts must always carry currency codes (e.g., `amount` + `currency_code`), never assume a global currency.
- **Explicit FX transfers**: Moving money between currencies must be recorded as explicit transfer records with:
  - Source & target accounts and currencies.
  - FX rate used.
  - Separate `fees` and `taxes` fields when applicable.
  - Derived effective rate stored or computed.
- **Idempotent imports (future)**: When we add CSV or API ingestion, design for idempotency and traceability (import batches, source IDs).

### Data modeling guidelines
- Prefer **normalized schemas** with clear tables for `users`, `accounts`, `transactions`, `budgets`, `budget_lines`, `fx_rates`, and `transfers`.
- Always link records to `user_id` (and `household_id` once introduced) to enforce multi-tenancy.
- Use **ISO 4217 currency codes** (e.g., `USD`, `BRL`, `EUR`) in all persisted data.
- Store **timestamps in UTC** in the database; convert to user locale in the UI.

### API & backend rules
- Use **Supabase client/server helpers** rather than writing raw HTTP calls when possible.
- Never expose another user’s data; enforce filters by `user_id` in all DB queries.
- When computing financial aggregates, prefer **server-side queries** over client-side aggregation for correctness and performance.

### Frontend & UX conventions
- Use **TypeScript** everywhere; avoid `any` unless strictly necessary and justify with a comment.
- Prefer **Server Components** for data fetching pages, with Client Components only for interactive pieces.
- Use a **design system** (e.g., a simple component library or shadcn-style primitives) and keep layouts responsive.
- Validation and error messages should be clear and written in plain language (no cryptic errors).

### Testing & quality
- Write unit tests for **business logic** (FX conversion, effective rate calculations, budget aggregation).
- For critical flows (auth, transaction creation, FX transfer), add at least minimal integration tests or end-to-end coverage.
- Avoid introducing linter/TypeScript errors; if you must, leave `TODO` comments explaining the gap.

### Performance & security
- Only load the minimum data needed per page. Paginate transaction lists.
- Never log or expose secrets (access tokens, API keys). Use environment variables and Supabase config.
- Use RLS (Row Level Security) policies in Supabase to protect per-user data.

### Agent behavior & limitations
- Agents must **not** introduce new major dependencies or external services without explaining why and ensuring they fit Vercel/Supabase.
- Prefer incremental, well-scoped changes with clear migration plans for Postgres.
- When adding features, always consider:
  1. Impact on multi-currency correctness.
  2. Impact on user’s mental model of budgets vs actuals vs transfers.
- When in doubt, choose clarity and auditability of data over clever optimizations.
- Do **not** edit long-term planning documents (such as `.cursor/plans/*`) unless explicitly requested; instead, respect them as the source of product direction.

