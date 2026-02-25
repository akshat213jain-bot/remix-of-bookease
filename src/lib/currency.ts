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
 * Format a number to currency string
 * @param amount - Amount in whole currency units (as stored in DB)
 * @param config - Optional currency configuration
 * @returns Formatted currency string
 */
export const formatCurrency = (
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
 * Format a number to currency string without decimals
 * @param amount - Amount in whole currency units
 * @param config - Optional currency configuration
 * @returns Formatted currency string
 */
export const formatCurrencyCompact = (
  amount: number,
  config?: CurrencyConfig
): string => {
  const currency = config || defaultCurrency;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
