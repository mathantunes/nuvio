import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Profiles: per-user settings keyed 1:1 to users.id.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // users.id
  baseCurrency: text("base_currency").notNull().default("USD"),
  locale: text("locale").notNull().default("en-US"),
  timeZone: text("time_zone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Accounts: financial accounts owned by a user in a specific currency.
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  currencyCode: text("currency_code").notNull(),
  institution: text("institution"),
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false),
  liquidityType: text("liquidity_type").notNull().default("liquid"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ENUM-LIKE TYPES
// Stored as text, but constrained by application logic for now.
export const transactionTypeValues = ["income", "expense", "transfer"] as const;

// CATEGORIES
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  // Optional type to distinguish income vs expense vs savings buckets.
  kind: text("kind"), // e.g. 'income' | 'fixed_cost' | 'variable_cost' | 'savings'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// BUDGETS & BUDGET LINES
export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  // Budgets are always defined for a calendar year (e.g. 2026).
  year: integer("year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const budgetLines = pgTable("budget_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").notNull(),
  categoryId: uuid("category_id").notNull(),
  // Month index within the budget year (1-12).
  month: integer("month").notNull(),
  // Planned amount (stored in the currency specified by currencyCode).
  plannedAmount: numeric("planned_amount", { precision: 18, scale: 4 })
    .notNull()
    .default("0"),
  // Currency code for the planned amount (ISO 4217).
  currencyCode: text("currency_code").notNull().default("USD"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// FX RATES
export const fxRates = pgTable("fx_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  baseCurrency: text("base_currency").notNull(), // e.g. 'USD'
  quoteCurrency: text("quote_currency").notNull(), // e.g. 'BRL'
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// TRANSACTIONS
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  accountId: uuid("account_id").notNull(),
  categoryId: uuid("category_id"),
  transactionType: text("transaction_type").notNull().default("expense"),
  // Amount and currency as stored on the account.
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  currencyCode: text("currency_code").notNull(),
  // Optional link to a budget line this transaction belongs to.
  budgetLineId: uuid("budget_line_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// TRANSFERS (explicit cross-currency or intra-currency money moves)
export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  // Source side
  sourceAccountId: uuid("source_account_id").notNull(),
  sourceAmount: numeric("source_amount", { precision: 18, scale: 4 })
    .notNull()
    .default("0"),
  sourceCurrencyCode: text("source_currency_code").notNull(),
  // Target side
  targetAccountId: uuid("target_account_id").notNull(),
  targetAmount: numeric("target_amount", { precision: 18, scale: 4 })
    .notNull()
    .default("0"),
  targetCurrencyCode: text("target_currency_code").notNull(),
  // FX details
  fxRate: numeric("fx_rate", { precision: 18, scale: 8 }),
  // Fees and taxes in source currency.
  feeAmount: numeric("fee_amount", { precision: 18, scale: 4 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 18, scale: 4 }).default("0"),
  // Optional derived effective rate stored for convenience.
  effectiveFxRate: numeric("effective_fx_rate", {
    precision: 18,
    scale: 8,
  }),
  // Optional note or provider label, e.g. "Revolut", "Wise".
  note: text("note"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// SAVINGS SNAPSHOTS (starting savings at a point in time)
export const savingsSnapshots = pgTable("savings_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  // Point-in-time date for this snapshot, e.g. start of a year.
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  // Optional human-friendly label like "Start of 2026".
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const savingsSnapshotLines = pgTable("savings_snapshot_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotId: uuid("snapshot_id").notNull(),
  // Optional link to a concrete account; can be null for abstract items like "pension".
  accountId: uuid("account_id"),
  // Short label like "bank account 1", "stocks bank 2", "pension".
  label: text("label").notNull(),
  // Amount as of the snapshot; typically in the user's base currency.
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  // Optional raw currency code if you capture snapshot amounts in original currency.
  currencyCode: text("currency_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── INVESTMENT PORTFOLIO ────────────────────────────────────────────────────

/**
 * Named investment positions — tracked separately from liquid accounts.
 * kind: 'invest' | 'pension' | 'crypto'
 */
export const investmentPositions = pgTable("investment_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  currencyCode: text("currency_code").notNull(),
  /** invest | pension | crypto */
  kind: text("kind").notNull().default("invest"),
  institution: text("institution"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Periodic mark-to-market entries for an investment position.
 * The user manually enters the current total market value of the position.
 */
export const investmentValuations = pgTable("investment_valuations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  positionId: uuid("position_id").notNull(),
  /** Total current market value in the position's currency */
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  /** Date of valuation (use UTC midnight) */
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Cash flow events into/out of an investment position.
 * Used for market-return attribution only — not for driving balance calculations.
 * flow_kind: 'deposit' | 'withdrawal' | 'dividend'
 *
 * Total return = latestValuation - yearStartValuation + dividendsYTD
 * Market return = latestValuation - yearStartValuation - netDepositsYTD
 */
export const investmentFlows = pgTable("investment_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  positionId: uuid("position_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  /** deposit | withdrawal | dividend */
  flowKind: text("flow_kind").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  /** Link to the cash-account side of this flow, when captured */
  instrumentTransferId: uuid("instrument_transfer_id").references(() => instrumentTransfers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Bridge between cash accounts (domain 1) and financial instruments (domain 2).
 * Records the cash-account side of any deposit into or withdrawal from a
 * portfolio position (or future loan). Essential for keeping the wealth picture
 * accurate — without this, cash balance and instrument value would both show the
 * same money.
 *
 * direction:
 *   'to_instrument'   — cash left the account (deposit into portfolio)
 *   'from_instrument' — cash entered the account (withdrawal / dividend)
 *
 * kind: 'deposit' | 'withdrawal' | 'dividend' | 'loan_payment' | 'amortization'
 */
export const instrumentTransfers = pgTable("instrument_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  /** The cash account that sent or received the money */
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  /** Direction from the cash account's perspective */
  direction: text("direction").notNull(), // 'to_instrument' | 'from_instrument'
  /** 'investment_position' | 'loan' */
  instrumentType: text("instrument_type").notNull(),
  /** FK into the relevant instrument table (e.g. investment_positions.id) */
  instrumentId: uuid("instrument_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  currencyCode: text("currency_code").notNull(),
  /** deposit | withdrawal | dividend | loan_payment | amortization */
  kind: text("kind").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── ASSETS (Real estate, vehicles, and other financed assets) ────────────────

/**
 * A physical or financial asset owned by the user (property, car, boat, etc.).
 * Standalone entity — persists independently of any associated loan/financing.
 * Linked to a loan via loans.asset_id (optional).
 */
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  /** e.g. 'real_estate' | 'vehicle' | 'other' */
  kind: text("kind").notNull().default("other"),
  description: text("description"),
  currencyCode: text("currency_code").notNull(),
  /** Purchase price at acquisition */
  purchasePrice: numeric("purchase_price", { precision: 18, scale: 6 }).notNull(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Market value snapshots for an asset over time.
 * Used to compute equity = latest_valuation − outstanding_loan_balance.
 */
export const assetValuations = pgTable("asset_valuations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  value: numeric("value", { precision: 18, scale: 6 }).notNull(),
  currencyCode: text("currency_code").notNull(),
  valuedAt: timestamp("valued_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── LOANS / MORTGAGES ────────────────────────────────────────────────────────

/**
 * A loan or mortgage. Can exist as a simulation (no cash effects) before being
 * promoted to active (liability tracked in wealth computation).
 *
 * status lifecycle: 'simulation' → 'active' → 'closed'
 *
 * SAC (Sistema de Amortização Constante) is the only supported amortization type.
 * The payment schedule is always computed at runtime from these params +
 * recorded amortization events — never stored.
 */
export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  lender: text("lender").notNull(),
  /** Original principal amount borrowed */
  principal: numeric("principal", { precision: 18, scale: 6 }).notNull(),
  currencyCode: text("currency_code").notNull(),
  /** Annual interest rate as a percentage, e.g. 1.5 = 1.5% */
  interestRate: numeric("interest_rate", { precision: 8, scale: 6 }).notNull(),
  termMonths: integer("term_months").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  /** simulation | active | closed */
  status: text("status").notNull().default("simulation"),
  /** Optional link to the asset this loan finances (property, vehicle, etc.) */
  assetId: uuid("asset_id").references(() => assets.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Extra principal amortization events on a loan.
 * kind='a_prazo' reduces the remaining term (does not reduce the installment amount).
 * The schedule recomputes from the outstanding balance at the point of amortization.
 */
export const loanAmortizations = pgTable("loan_amortizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  loanId: uuid("loan_id").notNull().references(() => loans.id),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  /** 'a_prazo' — reduces the term */
  kind: text("kind").notNull().default("a_prazo"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  /** Links to cash account debit when account was specified */
  instrumentTransferId: uuid("instrument_transfer_id").references(() => instrumentTransfers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Actual installment payments recorded against an active loan.
 * Amounts are stored for audit trail (computed from schedule at time of payment,
 * but stored to survive future schedule changes).
 */
export const loanPayments = pgTable("loan_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  loanId: uuid("loan_id").notNull().references(() => loans.id),
  /** Links to cash account debit */
  instrumentTransferId: uuid("instrument_transfer_id").references(() => instrumentTransfers.id),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull(),
  totalAmount: numeric("total_amount", { precision: 18, scale: 6 }).notNull(),
  principalAmount: numeric("principal_amount", { precision: 18, scale: 6 }).notNull(),
  interestAmount: numeric("interest_amount", { precision: 18, scale: 6 }).notNull(),
  /** Remaining balance after this payment */
  remainingBalance: numeric("remaining_balance", { precision: 18, scale: 6 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// USERS: local authentication.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});



