/**
 * Currency Format Hook
 *
 * Feature: settings-update
 * Hook for formatting prices based on user currency preferences.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useUserPreferences } from './useUserPreferences';
import { createClient } from '@/lib/supabase/client';
import {
  formatPrice,
  formatPriceWithConversion,
  convertCurrency,
  getFallbackRates,
  areRatesValid,
} from '@/lib/currency';
import type { CurrencyCode, ExchangeRatesRow } from '@/types/settings';

interface UseCurrencyFormatReturn {
  // Current preferences
  preferredCurrency: CurrencyCode;
  currencyPosition: 'before' | 'after';
  showOriginalPrice: boolean;
  autoConvertPrices: boolean;

  // Exchange rates
  exchangeRates: Record<string, number>;
  ratesLoading: boolean;
  ratesError: string | null;

  // Formatters
  formatPrice: (amount: number, currency?: CurrencyCode) => string;
  formatWithConversion: (amount: number, originalCurrency: CurrencyCode) => string;

  // Converters
  convert: (amount: number, from: CurrencyCode, to?: CurrencyCode) => number | null;
}

/**
 * Hook for currency formatting based on user preferences
 */
export function useCurrencyFormat(): UseCurrencyFormatReturn {
  const { preferences } = useUserPreferences();
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(getFallbackRates());
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []) as SupabaseClient;

  const { preferredCurrency, currencyPosition, showOriginalPrice, autoConvertPrices } = preferences;

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      setRatesLoading(true);
      setRatesError(null);

      try {
        // Try to get cached rates from database
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('exchange_rates')
          .select('*')
          .eq('base_currency', 'EUR')
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single() as { data: ExchangeRatesRow | null; error: { code?: string; message?: string } | null };

        if (error) {
          // Table might not exist yet or no data - use fallback
          if (error.code === 'PGRST116' || error.message?.includes('relation')) {
            setExchangeRates(getFallbackRates());
          } else {
            throw error;
          }
        } else if (data) {
          const row = data;
          const expiresAt = new Date(row.expires_at);

          if (areRatesValid(expiresAt)) {
            setExchangeRates(row.rates as Record<string, number>);
          } else {
            // Rates expired, try to fetch new ones via API
            await refreshRatesFromAPI();
          }
        }
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
        setRatesError('Failed to fetch exchange rates');
        // Keep using fallback rates
      } finally {
        setRatesLoading(false);
      }
    };

    fetchRates();
  }, [supabase]);

  // Refresh rates from external API
  const refreshRatesFromAPI = async () => {
    try {
      const response = await fetch('/api/settings/exchange-rates');
      if (response.ok) {
        const data = await response.json();
        setExchangeRates(data.rates);
      }
    } catch (err) {
      console.error('Error refreshing exchange rates:', err);
    }
  };

  // Format price in preferred currency
  const formatPriceFn = useCallback(
    (amount: number, currency?: CurrencyCode) => {
      const curr = currency ?? preferredCurrency;
      return formatPrice(amount, curr, currencyPosition);
    },
    [preferredCurrency, currencyPosition]
  );

  // Format price with conversion from original to preferred currency
  const formatWithConversionFn = useCallback(
    (amount: number, originalCurrency: CurrencyCode) => {
      if (!autoConvertPrices || originalCurrency === preferredCurrency) {
        return formatPrice(amount, originalCurrency, currencyPosition);
      }

      return formatPriceWithConversion(
        amount,
        originalCurrency,
        preferredCurrency,
        exchangeRates,
        currencyPosition,
        { showOriginal: showOriginalPrice }
      );
    },
    [
      preferredCurrency,
      currencyPosition,
      autoConvertPrices,
      showOriginalPrice,
      exchangeRates,
    ]
  );

  // Convert between currencies
  const convertFn = useCallback(
    (amount: number, from: CurrencyCode, to?: CurrencyCode) => {
      const targetCurrency = to ?? preferredCurrency;
      return convertCurrency(amount, from, targetCurrency, exchangeRates);
    },
    [preferredCurrency, exchangeRates]
  );

  return useMemo(
    () => ({
      preferredCurrency,
      currencyPosition,
      showOriginalPrice,
      autoConvertPrices,
      exchangeRates,
      ratesLoading,
      ratesError,
      formatPrice: formatPriceFn,
      formatWithConversion: formatWithConversionFn,
      convert: convertFn,
    }),
    [
      preferredCurrency,
      currencyPosition,
      showOriginalPrice,
      autoConvertPrices,
      exchangeRates,
      ratesLoading,
      ratesError,
      formatPriceFn,
      formatWithConversionFn,
      convertFn,
    ]
  );
}
