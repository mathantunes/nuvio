"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "../planning/currency-format";
import {
  createAsset,
  recordAssetValuation,
  deleteAsset,
} from "./assets.actions";
import { CurrencyInput } from "@/components/currency-input";
import { IconHome, IconCar, IconBox } from "@/components/icons";
import type { AssetSummary } from "@/lib/loan-computations";

// ── Shared style constants (matches loan-list.tsx) ────────────────────────────
const inputCls = "input px-3 py-1.5 text-xs";
const labelCls = "block text-[11px] font-medium";
const labelStyle = { color: "var(--color-text-muted)" } as const;
const submitBtnCls = "btn-primary px-3 py-1.5 text-xs";
const ghostBtnCls = "btn-ghost text-xs";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── RecordAssetValuationForm (exported for use on the loans page) ─────────────

export function RecordAssetValuationForm({
  assetId,
  assetName,
  currencyCode,
  currentValue,
  year,
  onDone,
}: {
  assetId: string;
  assetName: string;
  currencyCode: string;
  currentValue: number;
  year: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(fd: FormData) {
    setSubmitting(true);
    try {
      fd.set("assetId", assetId);
      fd.set("year", String(year));
      await recordAssetValuation(fd);
      onDone();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        Record valuation for {assetName}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Market value ({currencyCode})</label>
          <input
            name="value"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={currentValue > 0 ? currentValue.toFixed(2) : ""}
            placeholder="0"
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={labelStyle}>Valuation date</label>
          <input
            name="valuedAt"
            type="date"
            required
            defaultValue={todayISO()}
            className={inputCls}
          />
        </div>
      </div>
      <input name="notes" placeholder="Source / notes (optional)" className={inputCls} />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={submitBtnCls}>
          {submitting ? "Saving…" : "Save valuation"}
        </button>
        <button type="button" onClick={onDone} className={ghostBtnCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── AssetCard ─────────────────────────────────────────────────────────────────

function AssetCard({ asset, year }: { asset: AssetSummary; year: number }) {
  const [showValForm, setShowValForm] = useState(false);

  async function handleValuation(fd: FormData) {
    fd.set("assetId", asset.id);
    fd.set("year", String(year));
    await recordAssetValuation(fd);
    setShowValForm(false);
  }

  const AssetIcon =
    asset.kind === "real_estate" ? IconHome : asset.kind === "vehicle" ? IconCar : IconBox;
  const appreciation =
    asset.currentValue > 0 && asset.purchasePrice > 0
      ? asset.currentValue - asset.purchasePrice
      : null;

  return (
    <div className="card space-y-3 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            <AssetIcon size={14} /> {asset.name}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
            {asset.kind.replace("_", " ")} · {asset.currencyCode} · purchased{" "}
            {fmtDate(asset.purchasedAt)} for{" "}
            {formatCurrency(asset.purchasePrice, asset.currencyCode)}
          </p>
        </div>
        <form
          action={async (fd) => {
            fd.set("assetId", asset.id);
            fd.set("year", String(year));
            await deleteAsset(fd);
          }}
        >
          <button
            type="submit"
            onClick={(e) => {
              if (!confirm(`Delete "${asset.name}"? This cannot be undone.`))
                e.preventDefault();
            }}
            className="rounded px-2 py-1 text-[11px]"
            style={{ color: "var(--color-danger)" }}
          >
            Delete
          </button>
        </form>
      </div>

      {/* Value grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Current value</p>
          <p className="font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
            {asset.currentValue > 0
              ? formatCurrency(asset.currentValue, asset.currencyCode)
              : "—"}
          </p>
          {asset.latestValuation && (
            <p className="mt-0.5 text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
              as of {fmtDate(asset.latestValuation.valuedAt)}
            </p>
          )}
        </div>
        <div>
          <p style={{ color: "var(--color-text-subtle)" }}>Year-start value</p>
          <p className="font-medium tabular-nums" style={{ color: "var(--color-text-muted)" }}>
            {asset.yearStartValue > 0
              ? formatCurrency(asset.yearStartValue, asset.currencyCode)
              : "—"}
          </p>
        </div>
        {appreciation !== null && (
          <div className="col-span-2">
            <p style={{ color: "var(--color-text-subtle)" }}>Gain vs purchase price</p>
            <p
              className="font-medium tabular-nums"
              style={{
                color: appreciation >= 0 ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              {appreciation >= 0 ? "+" : ""}
              {formatCurrency(appreciation, asset.currencyCode)}
            </p>
          </div>
        )}
      </div>

      {/* Update valuation */}
      <button
        type="button"
        onClick={() => setShowValForm((v) => !v)}
        className={ghostBtnCls}
      >
        {showValForm ? "Cancel" : "Update valuation"}
      </button>

      {showValForm && (
        <form
          action={handleValuation}
          className="space-y-2 border-t pt-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} style={labelStyle}>Value ({asset.currencyCode})</label>
              <input
                name="value"
                type="number"
                min="0"
                step="0.01"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Valued on</label>
              <input
                name="valuedAt"
                type="date"
                defaultValue={todayISO()}
                required
                className={inputCls}
              />
            </div>
          </div>
          <input
            name="notes"
            type="text"
            placeholder="Notes (optional)"
            className={inputCls}
          />
          <button type="submit" className={submitBtnCls}>
            Save valuation
          </button>
        </form>
      )}
    </div>
  );
}

// ── AddAssetForm ──────────────────────────────────────────────────────────────

function AddAssetForm({ year, onDone }: { year: number; onDone: () => void }) {
  async function handleCreate(fd: FormData) {
    fd.set("year", String(year));
    await createAsset(fd);
    onDone();
  }

  return (
    <form
      action={handleCreate}
      className="card space-y-3 p-4"
    >
      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>New Asset</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls} style={labelStyle}>Name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="My Apartment"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Kind</label>
          <select name="kind" required className={inputCls}>
            <option value="real_estate">Real estate</option>
            <option value="vehicle">Vehicle</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Currency</label>
          <CurrencyInput
            name="currencyCode"
            required
            defaultValue="BRL"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Purchase price</label>
          <input
            name="purchasePrice"
            type="number"
            min="0"
            step="0.01"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Purchase date</label>
          <input
            name="purchasedAt"
            type="date"
            required
            defaultValue={todayISO()}
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls} style={labelStyle}>Notes (optional)</label>
          <input name="notes" type="text" className={inputCls} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={submitBtnCls}>
          Create asset
        </button>
        <button type="button" onClick={onDone} className={ghostBtnCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── AssetsPage (main export) ──────────────────────────────────────────────────

export function AssetsPage({
  assets,
  year,
}: {
  assets: AssetSummary[];
  year: number;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Assets</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {year} — properties, vehicles, and other assets
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary gap-2 text-xs"
          >
            Add Asset
          </button>
        )}
      </div>

      {showForm && <AddAssetForm year={year} onDone={() => setShowForm(false)} />}

      {assets.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} year={year} />
          ))}
        </div>
      ) : (
        !showForm && (
          <div
            className="rounded-xl border border-dashed p-12 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--color-text-subtle)" }}>No assets yet</p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-subtle)" }}>
              Add properties, vehicles, or other assets to track their value and see them reflected
              in your net wealth.
            </p>
          </div>
        )
      )}
    </div>
  );
}
