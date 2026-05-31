/**
 * CurrencyInput — searchable ISO 4217 currency combobox.
 * Custom dropdown with max-height so it doesn't flood the screen.
 * Works in both Server and Client Component trees (it is itself a Client Component).
 */
"use client";

import { useState, useRef, useEffect, useId } from "react";

export const COMMON_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "DKK", name: "Danish Krone" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RON", name: "Romanian Leu" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "KRW", name: "South Korean Won" },
  { code: "TWD", name: "Taiwan Dollar" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "HRK", name: "Croatian Kuna" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "ISK", name: "Icelandic Krona" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "MMK", name: "Myanmar Kyat" },
  { code: "BTC", name: "Bitcoin" },
  { code: "ETH", name: "Ethereum" },
];

type Props = {
  name: string;
  defaultValue?: string;
  /** Controlled value. When provided, onChange must also be provided. */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  "data-testid"?: string;
};

export function CurrencyInput({
  name,
  defaultValue,
  value: controlledValue,
  onChange,
  required,
  className = "input text-xs uppercase tracking-widest",
  placeholder = "USD",
  "data-testid": testId,
}: Props) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const displayValue = isControlled ? controlledValue : internalValue;

  const [query, setQuery] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  // Keep query in sync when controlled value changes externally.
  useEffect(() => {
    setQuery(displayValue);
  }, [displayValue]);

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = COMMON_CURRENCIES.filter(
    (c) =>
      c.code.includes(query.toUpperCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 30);

  const commit = (code: string) => {
    const upper = code.toUpperCase();
    setQuery(upper);
    setOpen(false);
    if (isControlled) {
      onChange?.(upper);
    } else {
      setInternalValue(upper);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    setQuery(raw);
    setOpen(true);
    if (isControlled) {
      onChange?.(raw);
    } else {
      setInternalValue(raw);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Hidden input carries the committed value for form submission */}
      <input type="hidden" name={name} value={displayValue} />
      <input
        id={uid}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        required={required}
        maxLength={3}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 rounded-md shadow-lg overflow-y-auto text-xs"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            maxHeight: "180px",
          }}
        >
          {filtered.map((c) => (
            <li
              key={c.code}
              role="option"
              aria-selected={displayValue === c.code}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click registers
                commit(c.code);
              }}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
              style={{
                backgroundColor:
                  displayValue === c.code
                    ? "var(--color-brand-subtle)"
                    : undefined,
                color: "var(--color-text)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLLIElement).style.backgroundColor =
                  "var(--color-brand-subtle)")
              }
              onMouseLeave={(e) => {
                if (displayValue !== c.code)
                  (e.currentTarget as HTMLLIElement).style.backgroundColor = "";
              }}
            >
              <span className="font-mono font-semibold w-8 shrink-0">{c.code}</span>
              <span style={{ color: "var(--color-text-muted)" }}>{c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

