## Nuvio – Agents Baseline

### Tech stack & scope
- **Frontend**: Next.js (App Router, SSR/ISR), TypeScript, React.
- **Backend**: Postgres + Drizzle ORM. Custom auth via bcrypt + iron-session. No Supabase.
- **Auth**: Email/password with iron-session cookies. All user data must be strictly isolated by `user_id` (and later `household_id`).
- **Hosting**: Self-hosted (Docker + Postgres) or Vercel (Next.js) + any Postgres provider.

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
- Use **Drizzle ORM** with the shared `db` client (`@/db/client`) for all database access.
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
- Never log or expose secrets (access tokens, API keys). Use environment variables.
- Enforce per-user data isolation in all DB queries (`where eq(table.userId, user.id)`).

### Color signals & financial semantics

**Never use `--color-success` / `--color-danger` for budget tracking.** Use the dedicated tokens below so the mapping can evolve independently.

#### Budget tracking tokens
| Token | Meaning |
|---|---|
| `--color-on-track` | Performing as planned or better |
| `--color-on-track-subtle` | Background tint for on-track pills/badges |
| `--color-off-track` | Performing worse than planned |
| `--color-off-track-subtle` | Background tint for off-track pills/badges |

#### Decision rules (context-dependent)
| Category | On-track condition | Off-track condition |
|---|---|---|
| **Expenses** | `actual ≤ planned` | `actual > planned` |
| **Income** | `actual ≥ planned` | `actual < planned` |
| **% of budget (expenses)** | `pct ≤ 100%` | `pct > 100%` |
| **% of budget (income)** | `pct ≥ 100%` | `pct < 100%` |

#### Raw amount signals (not budget-relative)
Use `--color-success` / `--color-danger` only for **sign-based** signals (positive/negative amounts) that are not compared against a plan — e.g., portfolio gains, loan equity, net worth change.

#### Zero is neutral
A value of exactly `0` or `100%` counts as on-track (use `>=` / `<=`, never strict `>`).

#### Hardcoded hex colors are forbidden
Always reference CSS tokens (`var(--color-on-track)` etc.). Never use raw hex values (`#15803D`) in component code — they break dark mode and theming.


- Agents must **not** introduce new major dependencies or external services without explaining why and ensuring they fit the self-hosted / Vercel deployment model.
- Prefer incremental, well-scoped changes with clear migration plans for Postgres.
- When adding features, always consider:
  1. Impact on multi-currency correctness.
  2. Impact on user’s mental model of budgets vs actuals vs transfers.
- When in doubt, choose clarity and auditability of data over clever optimizations.
- Do **not** edit long-term planning documents (such as `.cursor/plans/*`) unless explicitly requested; instead, respect them as the source of product direction.

