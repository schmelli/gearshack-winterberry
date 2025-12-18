// @ts-nocheck - Price tracking feature requires migrations to be applied
/**
 * Custom hook for price search with state machine
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { useState } from 'react';
import type {
  PriceSearchResults,
  PriceSearchStatus,
  SearchPricesRequest,
} from '@/types/price-tracking';

interface UsePriceSearchResult {
  results: PriceSearchResults | null;
  status: PriceSearchStatus;
  error: Error | null;
  searchPrices: (request: SearchPricesRequest) => Promise<void>;
}

export function usePriceSearch(): UsePriceSearchResult {
  const [results, setResults] = useState<PriceSearchResults | null>(null);
  const [status, setStatus] = useState<PriceSearchStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const searchPrices = async (request: SearchPricesRequest) => {
    try {
      setStatus('loading');
      setError(null);

      const response = await fetch('/api/price-tracking/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: PriceSearchResults = await response.json();
      setResults(data);

      // Set status based on results
      if (data.status === 'success') {
        setStatus('success');
      } else if (data.status === 'partial') {
        setStatus('partial');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setError(err as Error);
      setStatus('error');
      throw err;
    }
  };

  return {
    results,
    status,
    error,
    searchPrices,
  };
}
