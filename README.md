# Nuvio

> **Personal finance for people across borders.**

Open source · Self-hostable · AGPLv3

Your entire financial picture, in one place — budgets, investments, loans, and net worth, across every currency.

---

## Why Nuvio?

As an immigrant, managing finances across countries gets messy fast. Income arrives in one currency. Daily expenses run in another. Savings, a pension, a mortgage, or a brokerage account may each live in a third.

Most tools assume you live in one country with one currency. Spreadsheets let you model anything — until the FX formula breaks, the tabs multiply, and you lose confidence in the numbers.

Nuvio was built to close that gap:

- Budget and track expenses in your day-to-day currency
- Hold accounts, investments, and loans in different currencies
- Record FX transfers with real exchange rates and fees
- See your true net worth converted to a single base currency — always up to date

---

## The problem with spreadsheets

| | Spreadsheet | Nuvio |
|---|---|---|
| Multi-currency FX with rates + fees | Manual | ✓ |
| Budget vs actual tracking | Manual | ✓ |
| On-track / over-budget signals | ✗ | ✓ |
| Loan amortization & collateral | Manual | ✓ |
| Portfolio returns vs contributions | Manual | ✓ |
| Net worth across all asset types | Manual | ✓ |
| Your data stays yours | ✓ | ✓ |

---

## Features

### 📊 Full net worth picture
Assets, loans, investments, and cash — all tracked together and converted to your base currency. See how every part moves your total.

### 💱 Real multi-currency support
Every account carries its own currency. FX transfers record the rate, fees, and taxes used. No assumptions, no rounding errors.

### 📈 Budget vs actual
Plan your year by category. Record transactions against it. See monthly variance with clear on-track / over-budget signals.

### 🏦 Investment & loan tracking
Track portfolio returns separately from contributions. Model loan amortization. Link collateral assets to see your loan-to-value ratio.

### 🔒 Self-hostable & open source
Run it yourself on your own infrastructure. Your financial data stays on your server. AGPLv3 licensed — fully auditable.

### 🌐 Built for complexity
Income in one currency, savings in another, investments in a third. Nuvio handles the full picture without losing any detail.

---

## Navigation

The app is organised into four sections:

| Section | Pages | What it's for |
|---|---|---|
| **Plan** | Planning, Savings | Set your yearly budget and savings goals |
| **Track** | Budget vs Actual, FX Transfers | Record actuals and cross-currency transfers |
| **Net Worth** | Assets, Loans, Portfolio, Wealth | Full balance sheet and wealth growth over time |
| **Settings** | Accounts, Categories | Configure accounts and budget categories |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | [Next.js](https://nextjs.org) (App Router, TypeScript) |
| Self-hosting | Docker + Docker Compose |

---

## Self-hosting

> 📖 A step-by-step interactive self-hosting tutorial is coming soon. <!-- TODO: link to mathantunes.github.io/globudget once published -->

**Quick start:**

```bash
git clone https://github.com/mathantunes/globudget.git
cd globudget
cp .env.example .env   # fill in your values
docker compose up -d
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, project structure, and PR guidelines.

---

## Philosophy

This project is intentionally:

- **Transparent** — no hidden calculations; every number is traceable
- **Multi-currency first** — amounts always carry a currency; conversions are always explicit
- **Self-hosted** — your data stays yours

---

## License

Nuvio is licensed under the [GNU Affero General Public License v3.0](LICENSE). In short: you can freely use, modify, and self-host it, but if you run a modified version as a network service you must also release your changes under the same license.

