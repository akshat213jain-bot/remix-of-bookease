/**
 * Currency utility for formatting amounts
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
}

// Default currency configuration
const defaultCurrency: CurrencyConfig = {
  code: "INR",
  symbol: "₹",
  locale: "en-IN",
};

/**
 * Format a number (in smallest unit like paise/cents) to currency string
 * @param amountInSmallestUnit - Amount in smallest currency unit
 * @param config - Optional currency configuration
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amountInSmallestUnit: number,
  config?: CurrencyConfig
): string => {
  const currency = config || defaultCurrency;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInSmallestUnit / 100);
};

/**
 * Format a number (in smallest unit) to currency string without decimals
 * @param amountInSmallestUnit - Amount in smallest currency unit
 * @param config - Optional currency configuration
 * @returns Formatted currency string
 */
export const formatCurrencyCompact = (
  amountInSmallestUnit: number,
  config?: CurrencyConfig
): string => {
  const currency = config || defaultCurrency;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInSmallestUnit / 100);
};

/**
 * Format a whole number (not in smallest unit) to currency string
 * @param amount - Amount in whole currency units
 * @param config - Optional currency configuration
 * @returns Formatted currency string
 */
export const formatCurrencyValue = (
  amount: number,
  config?: CurrencyConfig
): string => {
  const currency = config || defaultCurrency;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (config?: CurrencyConfig): string => {
  return (config || defaultCurrency).symbol;
};

/**
 * Default currency code
 */
export const CURRENCY_CODE = "INR";

/**
 * Default currency symbol
 */
export const CURRENCY_SYMBOL = "₹";
