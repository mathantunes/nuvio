import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export const dynamic = "force-static";

// ── Preview components — mirror the real app's visual patterns ───────────────

function NetWorthMovementPreview() {
  const rows = [
    { currency: "EUR", start: "€38,200", end: "€42,300", change: "+€4,100", up: true },
    { currency: "USD", start: "$12,400", end: "$13,800", change: "+$1,400", up: true },
    { currency: "BRL", start: "R$31,000", end: "R$28,500", change: "−R$2,500", up: false },
  ];
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
          Net Worth Movement
        </p>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Details →</span>
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.currency} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-surface-raised)" }}>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="w-8 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>{row.currency}</span>
              <span style={{ color: "var(--color-text-muted)" }}>{row.start}</span>
              <span style={{ color: "var(--color-text-subtle)" }}>→</span>
              <span className="font-semibold" style={{ color: row.up ? "var(--color-success)" : "var(--color-danger)" }}>{row.end}</span>
            </div>
            <span className="text-xs font-medium tabular-nums" style={{ color: row.up ? "var(--color-success)" : "var(--color-danger)" }}>{row.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YearAtAGlancePreview() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // May = index 4 is "current"
  const incomeOk =  [true,  true,  true,  false, true,  null, null, null, null, null, null, null];
  const expOk =     [true,  false, true,  true,  false, null, null, null, null, null, null, null];
  return (
    <div className="card">
      <p className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text)" }}>Year at a Glance</p>
      <div style={{ minWidth: "480px" }}>
        <div className="mb-1 grid grid-cols-12 gap-px">
          {months.map((m, i) => (
            <div key={m} className="rounded px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: i === 4 ? "var(--color-brand)" : "var(--color-text-subtle)", backgroundColor: i === 4 ? "var(--color-brand-subtle)" : "transparent" }}>
              {m}
            </div>
          ))}
        </div>
        {[{ label: "Inc", ok: incomeOk }, { label: "Exp", ok: expOk }].map(({ label, ok }) => (
          <div key={label} className="mb-1">
            <div className="grid grid-cols-12 gap-px overflow-hidden rounded-lg" style={{ backgroundColor: "var(--color-border)" }}>
              {ok.map((status, i) => (
                <div key={i} className="px-1.5 py-2 text-[10px] tabular-nums" style={{ backgroundColor: "var(--color-surface)", opacity: status === null ? 0.4 : 1 }}>
                  <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>{label}</div>
                  <div style={{ color: status === null ? "var(--color-text-subtle)" : status ? "var(--color-text)" : "var(--color-off-track)" }}>
                    {status === null ? "—" : "···"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioPreview() {
  const positions = [
    { name: "Global ETF", institution: "Broker NL", currency: "EUR", value: "€54,200", gain: "+€8,320", positive: true },
    { name: "US Tech Fund", institution: "Broker US", currency: "USD", value: "$28,400", gain: "+€3,100", positive: true },
    { name: "Pension fund", institution: null, currency: "EUR", value: "€36,000", gain: "+€2,800", positive: true },
  ];
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-brand)" }}>
          <polyline points="3,17 8,11 13,14 20,5" />
          <circle cx="20" cy="5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Investments</p>
      </div>
      <div className="space-y-2">
        {positions.map((pos) => (
          <div key={pos.name} className="flex h-full flex-col rounded-xl border p-3" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{pos.name}</p>
                <p className="text-[11px]" style={{ color: "var(--color-text-subtle)", visibility: pos.institution ? "visible" : "hidden" }}>{pos.institution ?? "\u00A0"}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-text-subtle)" }}>{pos.currency}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs tabular-nums">
              <span style={{ color: "var(--color-text-muted)" }}>Latest value</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: "var(--color-text)" }}>{pos.value}</span>
                <span style={{ color: pos.positive ? "var(--color-success)" : "var(--color-danger)" }}>{pos.gain}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Comparison table ─────────────────────────────────────────────────────────

const comparisonFeatures = [
  { label: "Multi-currency accounts", nuvio: true, sheets: false },
  { label: "Net worth tracking", nuvio: true, sheets: "manual" },
  { label: "Budget vs actual", nuvio: true, sheets: "manual" },
  { label: "Investment portfolio", nuvio: true, sheets: "manual" },
  { label: "Loan amortization", nuvio: true, sheets: false },
  { label: "FX transfers with rates & fees", nuvio: true, sheets: false },
  { label: "Self-hostable", nuvio: true, sheets: true },
  { label: "Open source", nuvio: true, sheets: false },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>

      {/* Nav */}
      <div className="sticky top-0 z-40 border-b" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Image src="/logo.png" alt="Nuvio" width={352} height={116} className="logo" style={{ width: "auto", height: "24px", objectFit: "contain" }} />
          <div className="flex items-center gap-3">
            <a href="https://github.com/mathantunes/globudget" target="_blank" rel="noopener noreferrer"
              className="hidden text-sm sm:block" style={{ color: "var(--color-text-muted)" }}>
              GitHub
            </a>
            <Link href="/login" className="btn-primary text-sm">Sign in</Link>
            <ThemeToggle />
          </div>
        </nav>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-brand-muted)" }}>
          Open source · Self-hostable · AGPLv3
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl" style={{ color: "var(--color-text)" }}>
          Your entire financial picture,<br />in one place
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base" style={{ color: "var(--color-text-muted)" }}>
          Nuvio brings together budgets, investments, loans, and net worth — across every currency — so you always know where you stand.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="btn-primary px-6 py-2.5 text-sm">
            Create account
          </Link>
          <a href="https://github.com/mathantunes/globudget" target="_blank" rel="noopener noreferrer"
            className="btn-ghost px-6 py-2.5 text-sm">
            View on GitHub →
          </a>
        </div>

        {/* App previews */}
        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          <NetWorthMovementPreview />
          <div className="overflow-x-auto sm:col-span-2">
            <YearAtAGlancePreview />
          </div>
        </div>
        <div className="mt-4 text-left">
          <PortfolioPreview />
        </div>
      </section>

      {/* Pain section */}
      <section className="border-y py-20" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text)" }}>
              Your spreadsheet can&rsquo;t keep up
            </h2>
            <p className="mt-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Sound familiar?
            </p>
          </div>

          {/* Fake broken spreadsheet */}
          <div className="mt-10 overflow-x-auto rounded-xl border font-mono text-xs" style={{ borderColor: "var(--color-border-strong)", backgroundColor: "#1e2022", color: "#cdd6f4" }}>
            {/* Spreadsheet toolbar */}
            <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "#2a2d2f", backgroundColor: "#16191a" }}>
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#ff5f57" }} />
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#febc2e" }} />
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#28c840" }} />
              </div>
              <span className="ml-2 text-[11px]" style={{ color: "#6c7086" }}>net_worth_tracker_v7_FINAL_USE_THIS_ONE.xlsx</span>
            </div>
            {/* Formula bar */}
            <div className="flex items-center gap-3 border-b px-3 py-1.5" style={{ borderColor: "#2a2d2f", backgroundColor: "#16191a" }}>
              <span style={{ color: "#6c7086" }}>D14</span>
              <span style={{ color: "#6c7086" }}>fx</span>
              <span style={{ color: "#f38ba8" }}>=VLOOKUP(B14,FX_Rates_2023!$A:$C,3,0)*C14+IFERROR(VLOOKUP(B14,Manual_Overrides!$A:$B,2,0),0)</span>
            </div>
            {/* Spreadsheet grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr style={{ backgroundColor: "#16191a", color: "#6c7086" }}>
                    {["", "A", "B", "C", "D", "E", "F"].map((h) => (
                      <th key={h} className="border px-3 py-1 text-center font-normal" style={{ borderColor: "#2a2d2f", minWidth: h === "" ? "32px" : "120px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { row: "12", cells: ["Account", "Currency", "Balance", "EUR equiv.", "Last updated", "Notes", ""], header: true },
                    { row: "13", cells: ["NL Checking", "EUR", "12,400", "12,400", "2024-01-15", "", ""] },
                    { row: "14", cells: ["US Savings", "USD", "8,200", <span key="ref" style={{ color: "#f38ba8" }}>#REF!</span>, "2023-10-01 ⚠️", "old rate!", ""] },
                    { row: "15", cells: ["BR Invest.", "BRL", "45,000", <span key="na" style={{ color: "#fab387" }}>manual →</span>, "", "update this", ""] },
                    { row: "16", cells: ["Pension", "EUR", "???", <span key="q" style={{ color: "#f38ba8" }}>N/A</span>, "", "ask HR", ""] },
                    { row: "17", cells: ["", "", "", <span key="sum" style={{ color: "#a6e3a1" }}>{'=SUM(D13:D16)'}</span>, "", "", ""] },
                  ].map(({ row, cells, header }) => (
                    <tr key={row} style={{ backgroundColor: header ? "#16191a" : undefined }}>
                      <td className="border px-2 py-1.5 text-center" style={{ borderColor: "#2a2d2f", color: "#6c7086" }}>{row}</td>
                      {cells.map((cell, i) => (
                        <td key={i} className="border px-3 py-1.5" style={{ borderColor: "#2a2d2f", color: header ? "#6c7086" : undefined }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Three pain points */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "01",
                title: "One stale rate breaks everything",
                body: "Your USD balance is in a formula that references a tab you updated 3 months ago. Now D14 is #REF! and your total is wrong.",
              },
              {
                label: "02",
                title: "You can't see if you're on track",
                body: "The spreadsheet shows balances. It doesn't tell you whether you're overspending, undersaving, or how a loan affects your net worth.",
              },
              {
                label: "03",
                title: "Complexity kills the model",
                body: "Add a pension, a mortgage, and a brokerage account and you're maintaining six tabs, three VLOOKUP chains, and one very fragile sheet.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-5" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <p className="mb-2 text-xs font-bold tabular-nums" style={{ color: "var(--color-brand-muted)" }}>{item.label}</p>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text)" }}>
          Everything in one dashboard
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {[
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Stacked bars with upward arrow */}
                  <rect x="3" y="12" width="4" height="9" rx="1" />
                  <rect x="10" y="7" width="4" height="14" rx="1" />
                  <rect x="17" y="3" width="4" height="18" rx="1" />
                  <path d="M21 3l-3-3-3 3" />
                </svg>
              ),
              title: "Full net worth picture",
              body: "Assets, loans, investments, and cash — all tracked together and converted to your base currency. See how every part moves your total.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Two currency circles with arrows */}
                  <circle cx="8" cy="12" r="5" />
                  <circle cx="16" cy="12" r="5" />
                  <path d="M6.5 10.5c.5-1 1.5-1.5 2.5-1" />
                  <path d="M15 13.5c.5 1 1.5 1.5 2.5 1" />
                  <path d="M13 10h3l-1.5-1.5" />
                  <path d="M11 14H8l1.5 1.5" />
                </svg>
              ),
              title: "Real multi-currency support",
              body: "Every account carries its own currency. FX transfers record the rate, fees, and taxes used. No assumptions, no rounding errors.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Bar chart with a dotted target line */}
                  <path d="M3 20h18" />
                  <rect x="5" y="10" width="3" height="10" rx="0.5" />
                  <rect x="10.5" y="6" width="3" height="14" rx="0.5" />
                  <rect x="16" y="13" width="3" height="7" rx="0.5" />
                  <line x1="3" y1="9" x2="21" y2="9" strokeDasharray="2 2" />
                </svg>
              ),
              title: "Budget vs actual",
              body: "Plan your year by category. Record transactions against it. See monthly variance with clear on-track / over-budget signals.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Line chart going up + small house for loan */}
                  <polyline points="3,17 8,11 13,14 20,5" />
                  <circle cx="20" cy="5" r="1.5" fill="currentColor" stroke="none" />
                  <path d="M3 21h6v-4H3z" />
                  <path d="M3 17l3-3 3 3" />
                </svg>
              ),
              title: "Investment & loan tracking",
              body: "Track portfolio returns separately from contributions. Model loan amortization. Link collateral assets to see your loan-to-value ratio.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Server rack with a shield */}
                  <rect x="2" y="4" width="14" height="4" rx="1" />
                  <rect x="2" y="10" width="14" height="4" rx="1" />
                  <circle cx="13" cy="6" r="0.8" fill="currentColor" stroke="none" />
                  <circle cx="13" cy="12" r="0.8" fill="currentColor" stroke="none" />
                  <path d="M18 13l2-1 2 1v3c0 1.5-2 2.5-2 2.5S18 17.5 18 16z" />
                </svg>
              ),
              title: "Self-hostable & open source",
              body: "Run it yourself on your own infrastructure. Your financial data stays on your server. AGPLv3 licensed — fully auditable.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Hub and spoke — complexity made simple */}
                  <circle cx="12" cy="12" r="2.5" />
                  <circle cx="12" cy="3.5" r="1.5" />
                  <circle cx="20" cy="8" r="1.5" />
                  <circle cx="20" cy="16" r="1.5" />
                  <circle cx="12" cy="20.5" r="1.5" />
                  <circle cx="4" cy="16" r="1.5" />
                  <circle cx="4" cy="8" r="1.5" />
                  <line x1="12" y1="5" x2="12" y2="9.5" />
                  <line x1="18.7" y1="8.75" x2="14.3" y2="10.8" />
                  <line x1="18.7" y1="15.25" x2="14.3" y2="13.2" />
                  <line x1="12" y1="19" x2="12" y2="14.5" />
                  <line x1="5.3" y1="15.25" x2="9.7" y2="13.2" />
                  <line x1="5.3" y1="8.75" x2="9.7" y2="10.8" />
                </svg>
              ),
              title: "Built for complexity",
              body: "Income in one currency, savings in another, investments in a third. Nuvio handles the full picture without losing any detail.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl p-6" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-brand)" }}>
              {f.icon}
              <p className="mt-4 font-semibold" style={{ color: "var(--color-text)" }}>{f.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y py-20" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text)" }}>
            Nuvio vs Spreadsheets
          </h2>
          <div className="mt-8 overflow-hidden rounded-xl border text-sm" style={{ borderColor: "var(--color-border)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "var(--color-surface-raised)" }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--color-text-muted)" }}>Feature</th>
                  <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-brand)" }}>Nuvio</th>
                  <th className="px-4 py-3 text-center font-medium" style={{ color: "var(--color-text-muted)" }}>Spreadsheet</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((f, i) => (
                  <tr key={f.label} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                    <td className="px-4 py-3" style={{ color: "var(--color-text)" }}>{f.label}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--color-on-track)" }}>✓</td>
                    <td className="px-4 py-3 text-center">
                      {f.sheets === true
                        ? <span style={{ color: "var(--color-on-track)" }}>✓</span>
                        : f.sheets === false
                        ? <span style={{ color: "var(--color-off-track)" }}>✗</span>
                        : <span style={{ color: "var(--color-text-muted)" }}>Manual</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text)" }}>
          Ready to see the full picture?
        </h2>
        <p className="mt-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Create a free account or self-host it yourself. Open source, no lock-in.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="btn-primary px-6 py-2.5 text-sm">
            Create account
          </Link>
          <a href="https://github.com/mathantunes/globudget" target="_blank" rel="noopener noreferrer"
            className="btn-ghost px-6 py-2.5 text-sm">
            Self-host on GitHub →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: "var(--color-border)" }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-xs sm:flex-row sm:justify-between" style={{ color: "var(--color-text-subtle)" }}>
          <Image src="/logo.png" alt="Nuvio" width={352} height={116} className="logo" style={{ width: "auto", height: "18px", objectFit: "contain" }} />
          <p>
            AGPLv3 licensed · Built in the open ·{" "}
            <a href="https://github.com/mathantunes/globudget" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}>
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
