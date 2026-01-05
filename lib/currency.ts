/**
 * Currency Utilities
 *
 * Feature: settings-update
 * Utility functions for currency formatting and conversion.
 */

import type { CurrencyCode, CurrencyPosition, CurrencyInfo } from '@/types/settings';
import { CURRENCY_MAP, SUPPORTED_CURRENCIES } from '@/types/settings';

// =============================================================================
// Currency Formatting
// =============================================================================

/**
 * Get currency info by code
 */
export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCY_MAP[code] ?? CURRENCY_MAP.EUR;
}

/**
 * Format a price with currency symbol
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode,
  position: CurrencyPosition = 'before',
  options?: { decimals?: number; showCode?: boolean }
): string {
  const { showCode = false } = options ?? {};
  const info = getCurrencyInfo(currency);
  const decimals = options?.decimals ?? info.decimals;

  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (showCode) {
    return `${formattedAmount} ${currency}`;
  }

  if (position === 'before') {
    return `${info.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${info.symbol}`;
  }
}

/**
 * Format price with conversion display
 * e.g., "€45.00 (~$49.50)"
 */
export function formatPriceWithConversion(
  amount: number,
  originalCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  exchangeRates: Record<string, number>,
  position: CurrencyPosition = 'before',
  options?: { showOriginal?: boolean }
): string {
  const { showOriginal = true } = options ?? {};

  // If same currency, just format
  if (originalCurrency === targetCurrency) {
    return formatPrice(amount, originalCurrency, position);
  }

  // Convert amount
  const convertedAmount = convertCurrency(amount, originalCurrency, targetCurrency, exchangeRates);

  if (convertedAmount === null) {
    // Conversion not possible, show original
    return formatPrice(amount, originalCurrency, position);
  }

  const formattedConverted = formatPrice(convertedAmount, targetCurrency, position);

  if (showOriginal) {
    const formattedOriginal = formatPrice(amount, originalCurrency, position);
    return `${formattedOriginal} (~${formattedConverted})`;
  }

  return formattedConverted;
}

// =============================================================================
// Currency Conversion
// =============================================================================

/**
 * Convert amount between currencies using exchange rates
 * Rates should be relative to a base currency (typically EUR or USD)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: Record<string, number>,
  baseCurrency: CurrencyCode = 'EUR'
): number | null {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Get rates relative to base currency
  const fromRate = fromCurrency === baseCurrency ? 1 : rates[fromCurrency];
  const toRate = toCurrency === baseCurrency ? 1 : rates[toCurrency];

  if (fromRate === undefined || toRate === undefined) {
    return null;
  }

  // Convert: amount in fromCurrency -> base currency -> toCurrency
  const amountInBase = amount / fromRate;
  const amountInTarget = amountInBase * toRate;

  return amountInTarget;
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): CurrencyInfo[] {
  return SUPPORTED_CURRENCIES;
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code in CURRENCY_MAP;
}

// =============================================================================
// Exchange Rate Helpers
// =============================================================================

/**
 * Check if exchange rates are still valid
 */
export function areRatesValid(expiresAt: Date): boolean {
  return new Date() < expiresAt;
}

/**
 * Get fallback exchange rates (approximate, for offline use)
 * These are rough estimates and should only be used when API is unavailable
 */
export function getFallbackRates(): Record<CurrencyCode, number> {
  return {
    EUR: 1,
    USD: 1.09,
    GBP: 0.86,
    CHF: 0.95,
    CAD: 1.47,
    AUD: 1.65,
    JPY: 161.5,
    SEK: 11.3,
    NOK: 11.6,
    DKK: 7.46,
    PLN: 4.35,
    CZK: 25.2,
  };
}

// =============================================================================
// Locale-aware Formatting
// =============================================================================

/**
 * Get the appropriate number format for a locale
 */
export function getNumberFormat(locale: string, currency: CurrencyCode): Intl.NumberFormat {
  const info = getCurrencyInfo(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  });
}

/**
 * Format price using Intl.NumberFormat (locale-aware)
 */
export function formatPriceLocale(amount: number, currency: CurrencyCode, locale = 'en'): string {
  try {
    return getNumberFormat(locale, currency).format(amount);
  } catch (error) {
    // Log error for debugging but gracefully fallback
    console.warn(`Failed to format price with locale ${locale} and currency ${currency}:`, error);
    // Fallback to simple formatting
    return formatPrice(amount, currency);
  }
}
