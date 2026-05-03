"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "../planning/currency-format";
import {
  createAsset,
  recordAssetValuation,
  deleteAsset,
} from "./assets.actions";
import type { AssetSummary } from "@/lib/loan-computations";

// ── Shared style constants (matches loan-list.tsx) ────────────────────────────
const inputCls =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-900 dark:focus:border-zinc-50";
const labelCls = "block text-[11px] font-medium text-zinc-700 dark:text-zinc-300";
const submitBtnCls =
  "inline-flex items-center rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 disabled:opacity-50";
const ghostBtnCls =
  "text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 underline";

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
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Record valuation for {assetName}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Market value ({currencyCode})</label>
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
          <label className={labelCls}>Valuation date</label>
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

  const emoji =
    asset.kind === "real_estate" ? "🏠" : asset.kind === "vehicle" ? "🚗" : "📦";
  const appreciation =
    asset.currentValue > 0 && asset.purchasePrice > 0
      ? asset.currentValue - asset.purchasePrice
      : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {emoji} {asset.name}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
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
            className="text-[11px] text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded"
          >
            Delete
          </button>
        </form>
      </div>

      {/* Value grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Current value</p>
          <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {asset.currentValue > 0
              ? formatCurrency(asset.currentValue, asset.currencyCode)
              : "—"}
          </p>
          {asset.latestValuation && (
            <p className="text-[10px] text-zinc-400 mt-0.5">
              as of {fmtDate(asset.latestValuation.valuedAt)}
            </p>
          )}
        </div>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Year-start value</p>
          <p className="font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
            {asset.yearStartValue > 0
              ? formatCurrency(asset.yearStartValue, asset.currencyCode)
              : "—"}
          </p>
        </div>
        {appreciation !== null && (
          <div className="col-span-2">
            <p className="text-zinc-500 dark:text-zinc-400">Gain vs purchase price</p>
            <p
              className={`font-medium tabular-nums ${
                appreciation >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
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
          className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Value ({asset.currencyCode})</label>
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
              <label className={labelCls}>Valued on</label>
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
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3"
    >
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">New Asset</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="My Apartment"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Kind</label>
          <select name="kind" required className={inputCls}>
            <option value="real_estate">Real estate</option>
            <option value="vehicle">Vehicle</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <input
            name="currencyCode"
            type="text"
            required
            defaultValue="BRL"
            maxLength={3}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Purchase price</label>
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
          <label className={labelCls}>Purchase date</label>
          <input
            name="purchasedAt"
            type="date"
            required
            defaultValue={todayISO()}
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes (optional)</label>
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
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Assets</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            {year} — properties, vehicles, and other assets
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 transition"
          >
            + Add Asset
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
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No assets yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Add properties, vehicles, or other assets to track their value and see them reflected
              in your net wealth.
            </p>
          </div>
        )
      )}
    </div>
  );
}
