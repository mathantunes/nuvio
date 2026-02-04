// Currency code to locale mapping for proper number formatting
// This ensures currencies use their native formatting (e.g., CHF uses apostrophe for thousands)
const currencyLocaleMap: Record<string, string> = {
  USD: "en-US",
  EUR: "de-DE", // German locale uses period for thousands, comma for decimals
  GBP: "en-GB",
  CHF: "de-CH", // Swiss locale uses apostrophe for thousands
  JPY: "ja-JP",
  CAD: "en-CA",
  AUD: "en-AU",
  BRL: "pt-BR",
  CNY: "zh-CN",
  INR: "en-IN",
  MXN: "es-MX",
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  PLN: "pl-PL",
  CZK: "cs-CZ",
  HUF: "hu-HU",
  RON: "ro-RO",
  BGN: "bg-BG",
  HRK: "hr-HR",
  RUB: "ru-RU",
  TRY: "tr-TR",
  ZAR: "en-ZA",
  KRW: "ko-KR",
  SGD: "en-SG",
  HKD: "zh-HK",
  NZD: "en-NZ",
  THB: "th-TH",
  MYR: "ms-MY",
  IDR: "id-ID",
  PHP: "en-PH",
  VND: "vi-VN",
};

/**
 * Formats a number as currency using the currency's native locale formatting.
 * For example, CHF will use apostrophe (') as thousands separator.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string
): string {
  const locale = currencyLocaleMap[currencyCode] || "en-US";
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a number with locale-aware separators but without currency symbol.
 * For example, CHF locale will use apostrophe (') as thousands separator.
 */
export function formatAmount(
  amount: number,
  currencyCode: string
): string {
  const locale = currencyLocaleMap[currencyCode] || "en-US";
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
