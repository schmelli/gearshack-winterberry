/**
 * API Cache Service
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T006, T007, T008, T009
 *
 * Provides caching functionality for external API responses (YouTube, GearGraph).
 * Cache is stored in Supabase and shared across all users with a 7-day TTL.
 */

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

export type CacheService = 'youtube' | 'geargraph';

export interface CacheEntry<T = unknown> {
  data: T;
  cached: boolean;
  expiresAt: string;
}

// =============================================================================
// Zod Schemas (T009)
// =============================================================================

export const cacheServiceSchema = z.enum(['youtube', 'geargraph']);

export const cacheEntrySchema = z.object({
  id: z.string().uuid(),
  service: cacheServiceSchema,
  cache_key: z.string(),
  response_data: z.unknown(),
  created_at: z.string(),
  expires_at: z.string(),
});

// =============================================================================
// Cache Key Generation (T008)
// =============================================================================

/**
 * Generates a SHA-256 hash of the input string for use as a cache key.
 * Uses Web Crypto API which is available in both Node.js and Edge runtimes.
 *
 * @param input - String to hash
 * @returns SHA-256 hash as hex string
 */
export async function generateCacheKey(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a cache key for YouTube API requests.
 *
 * @param brand - Product brand (optional)
 * @param name - Product name
 * @returns SHA-256 hash of the query
 */
export async function generateYouTubeCacheKey(
  brand: string | undefined,
  name: string
): Promise<string> {
  const input = `${brand ?? ''}|${name}|review outdoor gear`;
  return generateCacheKey(input);
}

/**
 * Creates a cache key for GearGraph API requests.
 *
 * Ensures unique cache keys by:
 * - Using explicit nullability markers for missing values
 * - Combining all available identifiers
 * - Preventing cache collisions between items with different missing fields
 *
 * @param params - Query parameters
 * @returns SHA-256 hash of the parameters
 */
export async function generateGearGraphCacheKey(params: {
  productTypeId?: string;
  categoryId?: string;
  brand?: string;
  name?: string;
}): Promise<string> {
  // Use explicit markers for null/undefined to prevent cache collisions
  // e.g., "||Helinox|Chair" vs "NULL|NULL|Helinox|Chair" are now distinct
  const productType = params.productTypeId ?? 'NULL';
  const category = params.categoryId ?? 'NULL';
  const brand = params.brand ?? 'NULL';
  const name = params.name ?? 'NULL';

  const input = `${productType}|${category}|${brand}|${name}`;
  return generateCacheKey(input);
}

// =============================================================================
// Cache Operations (T006, T007)
// =============================================================================

/**
 * Retrieves a cached response from the database.
 *
 * @param service - The service type ('youtube' or 'geargraph')
 * @param cacheKey - The SHA-256 cache key
 * @returns Cached data if valid, null if not found or expired
 */
export async function getFromCache<T>(
  service: CacheService,
  cacheKey: string
): Promise<CacheEntry<T> | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('api_cache')
    .select('response_data, expires_at')
    .eq('service', service)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return {
    data: data.response_data as T,
    cached: true,
    expiresAt: data.expires_at,
  };
}

/**
 * Stores a response in the cache database.
 *
 * @param service - The service type ('youtube' or 'geargraph')
 * @param cacheKey - The SHA-256 cache key
 * @param data - The response data to cache
 * @param ttlDays - Time-to-live in days (default: 7)
 * @returns The stored cache entry with expiration info
 */
export async function setCache<T>(
  service: CacheService,
  cacheKey: string,
  data: T,
  ttlDays: number = 7
): Promise<CacheEntry<T>> {
  const supabase = await createClient();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  const expiresAtIso = expiresAt.toISOString();

  // Upsert to handle both new entries and refreshes
  const { error } = await supabase.from('api_cache').upsert(
    {
      service,
      cache_key: cacheKey,
      response_data: data as Json,
      expires_at: expiresAtIso,
    },
    {
      onConflict: 'service,cache_key',
    }
  );

  if (error) {
    console.error('[Cache] Failed to store cache entry:', error);
    // Return the data anyway, just not cached
    return {
      data,
      cached: false,
      expiresAt: expiresAtIso,
    };
  }

  return {
    data,
    cached: false, // Fresh data, not from cache
    expiresAt: expiresAtIso,
  };
}

/**
 * Deletes expired cache entries. Called periodically for cleanup.
 *
 * @returns Number of deleted entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('api_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('[Cache] Failed to cleanup expired entries:', error);
    return 0;
  }

  return data?.length ?? 0;
}
