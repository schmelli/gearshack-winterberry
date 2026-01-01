/**
 * SerpApi client for price search functionality
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 * Enhanced: 2026-01-01 (Feature 055 - category-based result filtering)
 */

import { RETRY_CONFIG, CACHE_CONFIG } from '@/lib/constants/price-tracking';
import { matchesProductType } from './search-query-builder';
import type { PriceResult } from '@/types/price-tracking';

/**
 * Retry helper with exponential backoff (Review fix #14)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = RETRY_CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Only retry on 5xx errors or network errors
      if (response.ok || response.status < 500) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries - 1) {
      const backoffMs = Math.min(
        RETRY_CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, attempt),
        RETRY_CONFIG.MAX_BACKOFF_MS
      );
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('Failed after retries');
}

interface SerpApiGoogleShoppingResult {
  title: string;
  link: string;
  price: string;
  extracted_price: number;
  thumbnail: string;
  seller: string;
  delivery?: string;
}

interface SerpApiEbayResult {
  title: string;
  link: string;
  price: {
    raw: string;
    extracted: number;
  };
  thumbnail: string;
  condition?: string;
}

/**
 * Valid product condition values (Review fix #18)
 */
const VALID_CONDITIONS = ['new', 'used', 'refurbished', 'open_box'] as const;
type ProductCondition = typeof VALID_CONDITIONS[number];

/**
 * Type guard to safely validate product condition (Review fix #18)
 */
function isValidCondition(condition: string | undefined): condition is ProductCondition {
  if (!condition) return false;
  return VALID_CONDITIONS.includes(condition as ProductCondition);
}

/**
 * Normalize product condition with fallback (Review fix #18)
 */
function normalizeCondition(condition: string | undefined): ProductCondition {
  if (isValidCondition(condition)) {
    return condition;
  }
  // Default to 'new' if invalid or missing
  return 'new';
}

/**
 * Search Google Shopping via SerpApi with optional category filtering
 * Enhanced to filter results by product type keywords (Feature 055)
 */
export async function searchGoogleShopping(
  query: string,
  location: string = 'Germany',
  productTypeKeywords: string[] = []
): Promise<PriceResult[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY environment variable is not set');
  }

  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    api_key: process.env.SERPAPI_KEY,
    location,
    num: '10',
  });

  try {
    const response = await fetchWithRetry(`https://serpapi.com/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results: SerpApiGoogleShoppingResult[] = data.shopping_results || [];

    // Filter results by product type before mapping (Feature 055)
    const filteredResults = productTypeKeywords.length > 0
      ? results.filter(r => matchesProductType(r.title, productTypeKeywords))
      : results;

    if (productTypeKeywords.length > 0) {
      console.log(`[Google Shopping] Filtered ${results.length} -> ${filteredResults.length} results by product type`);
    }

    return filteredResults.map((result) => ({
      id: crypto.randomUUID(),
      tracking_id: '', // Will be set by caller
      source_type: 'google_shopping' as const,
      source_name: result.seller || 'Google Shopping',
      source_url: result.link,
      price_amount: result.extracted_price,
      price_currency: 'EUR',
      shipping_cost: result.delivery ? parseShippingCost(result.delivery) : null,
      shipping_currency: 'EUR',
      total_price: result.extracted_price + (result.delivery ? parseShippingCost(result.delivery) : 0),
      product_name: result.title,
      product_image_url: result.thumbnail || null,
      product_condition: normalizeCondition('new'),
      is_local: false,
      shop_latitude: null,
      shop_longitude: null,
      distance_km: null,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_CONFIG.TTL_MS).toISOString(),
    }));
  } catch (error) {
    console.error('Google Shopping search error:', error);
    throw new Error(`Failed to search Google Shopping: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search eBay via SerpApi with optional category filtering
 * Enhanced to filter results by product type keywords (Feature 055)
 */
export async function searchEbay(
  query: string,
  productTypeKeywords: string[] = []
): Promise<PriceResult[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY environment variable is not set');
  }

  const params = new URLSearchParams({
    engine: 'ebay',
    q: query,
    api_key: process.env.SERPAPI_KEY,
    _nkw: query,
  });

  try {
    const response = await fetchWithRetry(`https://serpapi.com/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results: SerpApiEbayResult[] = data.organic_results || [];

    // Filter results by product type before mapping (Feature 055)
    const filteredResults = productTypeKeywords.length > 0
      ? results.filter(r => matchesProductType(r.title, productTypeKeywords))
      : results;

    if (productTypeKeywords.length > 0) {
      console.log(`[eBay] Filtered ${results.length} -> ${filteredResults.length} results by product type`);
    }

    return filteredResults.map((result) => ({
      id: crypto.randomUUID(),
      tracking_id: '', // Will be set by caller
      source_type: 'ebay' as const,
      source_name: 'eBay',
      source_url: result.link,
      price_amount: result.price.extracted,
      price_currency: 'EUR',
      shipping_cost: null,
      shipping_currency: 'EUR',
      total_price: result.price.extracted,
      product_name: result.title,
      product_image_url: result.thumbnail || null,
      product_condition: normalizeCondition(result.condition?.toLowerCase()),
      is_local: false,
      shop_latitude: null,
      shop_longitude: null,
      distance_km: null,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_CONFIG.TTL_MS).toISOString(),
    }));
  } catch (error) {
    console.error('eBay search error:', error);
    throw new Error(`Failed to search eBay: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse shipping cost from delivery string
 */
function parseShippingCost(delivery: string): number {
  const match = delivery.match(/€(\d+(?:[.,]\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return 0;
}
