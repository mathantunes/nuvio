# Contributing to Nuvio

Thanks for your interest in contributing! This document covers how to get the project running locally and how to submit changes.

---

## Prerequisites

- [Node.js](https://nodejs.org) ≥ 20
- [Docker](https://www.docker.com) + Docker Compose (for the full stack)
- `pnpm` (or `npm` — the project uses whichever lockfile is present)

---

## Local setup

```bash
git clone https://github.com/mathantunes/globudget.git
cd globudget

# Install dependencies
cd web && npm install

# Copy environment template and fill in values
cp .env.example .env.local

# Start the dev server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
globudget/
├── web/                        # Next.js application (App Router)
│   └── src/
│       └── app/
│           ├── page.tsx        # Landing page (static)
│           ├── app/            # Authenticated app shell
│           │   └── [year]/     # Year-scoped pages (planning, tracking, …)
│           └── …
└── docker-compose.yml          # Self-hosting setup
```

---

## Guidelines

- **TypeScript everywhere** — avoid `any`; if unavoidable, leave a comment explaining why.
- **Server Components first** — use Client Components only when interactivity requires it.
- **Server actions for mutations** — prefer `<form action={async () => { "use server"; … }}>` over API routes.
- **Security** — all DB queries and mutations must be scoped to the authenticated `user.id`. Never return another user's data.
- **Multi-currency correctness** — amounts must always carry a currency code (ISO 4217); never assume a global currency.

---

## Submitting a PR

1. Fork the repo and create a branch from `main`.
2. Make your changes, keeping commits focused and descriptive.
3. Open a pull request against `main` with a clear description of what changed and why.

---

## License

By contributing you agree that your changes will be licensed under the [AGPLv3](LICENSE).
