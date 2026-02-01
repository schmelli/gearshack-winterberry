/**
 * Firecrawl Cache Service
 *
 * Feature: URL-Import Enhancement
 * Task: Phase 1.3 - Firecrawl Cache mit Supabase erstellen
 *
 * Provides Supabase-based caching for Firecrawl API responses.
 * Cache entries are stored with a configurable TTL (default: 7 days).
 * Uses SHA-256 hashing for cache keys to ensure uniqueness.
 *
 * Environment Variables:
 * - FIRECRAWL_CACHE_TTL_DAYS: Cache TTL in days (default: 7)
 * - FIRECRAWL_CACHE_ENABLED: Enable/disable caching (default: true)
 *
 * NOTE: Requires the `firecrawl_cache` table to be created via migration.
 * See Task 9 (Phase 4.1: DB-Migration) for the table schema.
 */

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

// =============================================================================
// Table Name Constant
// =============================================================================

/**
 * Table name for firecrawl cache entries.
 * Uses 'as const' to preserve the literal type for Supabase client.
 */
const FIRECRAWL_CACHE_TABLE = 'firecrawl_cache' as const;

// =============================================================================
// Types
// =============================================================================

/**
 * GearSpecs type representing structured gear data extracted from web pages.
 * This matches the GearSpecsSchema defined in gear-specs.ts.
 */
export interface GearSpecs {
  name?: string;
  brand?: string;
  category?: string;
  weight?: {
    value: number;
    unit: 'g' | 'kg' | 'oz' | 'lb';
  };
  price?: {
    value: number;
    currency: string;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'in' | 'mm';
  };
  capacity?: {
    value: number;
    unit: 'L' | 'ml' | 'cu in';
  };
  temperatureRating?: {
    value: number;
    unit: 'C' | 'F';
  };
  materials?: string[];
  features?: string[];
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  scrapedAt?: string;
  confidence?: number;
  // Category-specific fields
  capacityPersons?: number;
  seasonRating?: '3-season' | '3.5-season' | '4-season' | 'summer' | 'winter';
  frameType?: 'internal' | 'external' | 'frameless' | 'removable';
  fuelType?:
    | 'canister'
    | 'alcohol'
    | 'wood'
    | 'solid'
    | 'multi-fuel'
    | 'white-gas'
    | 'propane';
  connectorType?:
    | 'usb-c'
    | 'usb-a'
    | 'micro-usb'
    | 'usb-mini'
    | 'lightning'
    | 'proprietary';
  constructionType?:
    | 'freestanding'
    | 'semi-freestanding'
    | 'non-freestanding'
    | 'trekking-pole'
    | 'a-frame'
    | 'tunnel'
    | 'dome'
    | 'pyramid';
  size?: string;
}

/**
 * Cached gear result returned from the cache.
 */
export interface CachedGearResult {
  specs: GearSpecs | null;
  sources: string[];
  confidence: number;
  cachedAt: string;
}

/**
 * Cache statistics for monitoring and analytics.
 */
export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  averageConfidence: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  cacheHitRate: number | null;
}

/**
 * Internal cache entry structure matching the database schema.
 * This type mirrors the `firecrawl_cache` table schema.
 *
 * Exported for use by migration scripts and type generation.
 */
export interface FirecrawlCacheRow {
  id: string;
  query_hash: string;
  query_text: string;
  response_json: Json | null;
  source_urls: Json;
  confidence: number;
  created_at: string;
  expires_at: string;
}

/**
 * Insert type for firecrawl cache entries.
 *
 * Exported for use by migration scripts and type generation.
 */
export interface FirecrawlCacheInsert {
  id: string;
  query_hash: string;
  query_text: string;
  response_json: Json | null;
  source_urls: Json;
  confidence: number;
  expires_at: string;
}

/**
 * Partial select type for cache entry queries (get operations).
 */
interface FirecrawlCacheSelectResult {
  response_json: Json | null;
  source_urls: Json;
  confidence: number;
  created_at: string;
  expires_at: string;
}

/**
 * Stats query select result.
 */
interface FirecrawlCacheStatsResult {
  confidence: number;
  created_at: string;
  expires_at: string;
}

/**
 * Delete query select result.
 */
interface FirecrawlCacheDeleteResult {
  id: string;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Cache configuration from environment variables.
 */
function getCacheConfig(): { ttlDays: number; enabled: boolean } {
  const ttlDays = parseInt(process.env.FIRECRAWL_CACHE_TTL_DAYS ?? '7', 10);
  const enabled = process.env.FIRECRAWL_CACHE_ENABLED !== 'false';

  return {
    ttlDays: isNaN(ttlDays) || ttlDays < 1 ? 7 : ttlDays,
    enabled,
  };
}

// =============================================================================
// Hash Generation
// =============================================================================

/**
 * Generates a SHA-256 hash of the input string for use as a cache key.
 * Returns the first 32 characters of the hex-encoded hash.
 *
 * Uses Web Crypto API which is available in both Node.js and Edge runtimes.
 *
 * @param gearName - The gear item name to search for
 * @param brand - Optional brand name
 * @returns First 32 characters of the SHA-256 hash
 *
 * @example
 * ```ts
 * const hash = await generateQueryHash('Helinox Chair One', 'Helinox');
 * // Returns: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
 * ```
 */
export async function generateQueryHash(
  gearName: string,
  brand?: string
): Promise<string> {
  // Normalize inputs: lowercase, trim, remove extra whitespace
  const normalizedName = gearName.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedBrand = brand
    ? brand.toLowerCase().trim().replace(/\s+/g, ' ')
    : '';

  // Create consistent input string with delimiter
  const input = normalizedBrand
    ? `${normalizedBrand}|${normalizedName}`
    : normalizedName;

  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Return first 32 characters
  return fullHash.substring(0, 32);
}

// =============================================================================
// Cache Operations
// =============================================================================

/**
 * Retrieves a cached gear result from the database.
 *
 * Returns null if:
 * - Caching is disabled
 * - No cache entry exists for the query
 * - The cache entry has expired
 *
 * @param gearName - The gear item name
 * @param brand - Optional brand name
 * @returns Cached result if valid, null otherwise
 *
 * @example
 * ```ts
 * const cached = await getCachedGearResult('Chair One', 'Helinox');
 * if (cached) {
 *   console.log('Cache hit:', cached.specs?.name);
 * }
 * ```
 */
export async function getCachedGearResult(
  gearName: string,
  brand?: string
): Promise<CachedGearResult | null> {
  const config = getCacheConfig();

  // Check if caching is enabled
  if (!config.enabled) {
    return null;
  }

  try {
    const supabase = await createClient();
    const queryHash = await generateQueryHash(gearName, brand);

    // Query the cache table - use type assertion for table not yet in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(FIRECRAWL_CACHE_TABLE)
      .select('response_json, source_urls, confidence, created_at, expires_at')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      // No cache hit or error - return null silently
      return null;
    }

    // Type the result
    const result = data as FirecrawlCacheSelectResult;

    // Parse and return the cached result
    const specs = result.response_json as GearSpecs | null;
    const sources = Array.isArray(result.source_urls)
      ? (result.source_urls as string[])
      : [];

    return {
      specs,
      sources,
      confidence: result.confidence ?? 0,
      cachedAt: result.created_at,
    };
  } catch (err) {
    console.error('[Firecrawl Cache] Error retrieving cached result:', err);
    return null;
  }
}

/**
 * Stores a gear result in the cache database.
 *
 * Uses upsert to handle both new entries and refreshes of existing entries.
 * The cache key is generated from the gear name and optional brand.
 *
 * @param gearName - The gear item name
 * @param brand - Optional brand name
 * @param specs - The extracted gear specifications (or null if extraction failed)
 * @param sources - Array of source URLs used for extraction
 *
 * @example
 * ```ts
 * await setCachedGearResult(
 *   'Chair One',
 *   'Helinox',
 *   { name: 'Chair One', brand: 'Helinox', weight: { value: 960, unit: 'g' } },
 *   ['https://helinox.com/chair-one', 'https://rei.com/helinox-chair']
 * );
 * ```
 */
export async function setCachedGearResult(
  gearName: string,
  brand: string | undefined,
  specs: GearSpecs | null,
  sources: string[]
): Promise<void> {
  const config = getCacheConfig();

  // Check if caching is enabled
  if (!config.enabled) {
    return;
  }

  try {
    const supabase = await createClient();
    const queryHash = await generateQueryHash(gearName, brand);

    // Calculate expiration date based on TTL
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.ttlDays);

    // Build the query text for debugging/analytics
    const queryText = brand ? `${brand} ${gearName}` : gearName;

    // Calculate confidence based on specs completeness
    const confidence = calculateConfidence(specs);

    // Generate a unique ID for new entries
    const id = crypto.randomUUID();

    // Upsert the cache entry - use type assertion for table not yet in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(FIRECRAWL_CACHE_TABLE).upsert(
      {
        id,
        query_hash: queryHash,
        query_text: queryText,
        response_json: specs as unknown as Json,
        source_urls: sources as unknown as Json,
        confidence,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'query_hash',
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error('[Firecrawl Cache] Failed to store cache entry:', error);
    }
  } catch (err) {
    console.error('[Firecrawl Cache] Error storing cache entry:', err);
  }
}

/**
 * Deletes expired cache entries from the database.
 *
 * This should be called periodically (e.g., via a cron job) to clean up
 * stale cache entries and keep the database size manageable.
 *
 * @returns Number of deleted entries
 *
 * @example
 * ```ts
 * const deletedCount = await cleanupExpiredCache();
 * console.log(`Cleaned up ${deletedCount} expired cache entries`);
 * ```
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const supabase = await createClient();

    // Delete expired entries - use type assertion for table not yet in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(FIRECRAWL_CACHE_TABLE)
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error(
        '[Firecrawl Cache] Failed to cleanup expired entries:',
        error
      );
      return 0;
    }

    const results = data as FirecrawlCacheDeleteResult[] | null;
    const deletedCount = results?.length ?? 0;

    if (deletedCount > 0) {
      console.log(`[Firecrawl Cache] Cleaned up ${deletedCount} expired entries`);
    }

    return deletedCount;
  } catch (err) {
    console.error('[Firecrawl Cache] Error during cleanup:', err);
    return 0;
  }
}

/**
 * Retrieves cache statistics for monitoring and analytics.
 *
 * @returns Cache statistics including entry counts and confidence metrics
 *
 * @example
 * ```ts
 * const stats = await getCacheStats();
 * console.log(`Cache has ${stats.totalEntries} entries`);
 * console.log(`Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
 * ```
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Get all entries with relevant fields - use type assertion for table not yet in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(FIRECRAWL_CACHE_TABLE)
      .select('confidence, created_at, expires_at');

    const entries = data as FirecrawlCacheStatsResult[] | null;

    if (error || !entries) {
      console.error('[Firecrawl Cache] Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        averageConfidence: 0,
        oldestEntry: null,
        newestEntry: null,
        cacheHitRate: null,
      };
    }

    // Calculate statistics
    const totalEntries = entries.length;
    const validEntries = entries.filter((e) => e.expires_at > now).length;
    const expiredEntries = totalEntries - validEntries;

    // Calculate average confidence (only for valid entries)
    const validEntriesData = entries.filter((e) => e.expires_at > now);
    const averageConfidence =
      validEntriesData.length > 0
        ? validEntriesData.reduce((sum, e) => sum + (e.confidence ?? 0), 0) /
          validEntriesData.length
        : 0;

    // Find oldest and newest entries
    const sortedByDate = [...entries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const oldestEntry =
      sortedByDate.length > 0 ? sortedByDate[0].created_at : null;
    const newestEntry =
      sortedByDate.length > 0
        ? sortedByDate[sortedByDate.length - 1].created_at
        : null;

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      averageConfidence,
      oldestEntry,
      newestEntry,
      cacheHitRate: null, // Would require additional tracking
    };
  } catch (err) {
    console.error('[Firecrawl Cache] Error getting cache stats:', err);
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      averageConfidence: 0,
      oldestEntry: null,
      newestEntry: null,
      cacheHitRate: null,
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculates a confidence score based on specs completeness.
 *
 * The score is based on which fields are present and populated.
 * Core fields (name, brand, weight, price) are weighted higher.
 *
 * @param specs - The gear specifications
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(specs: GearSpecs | null): number {
  if (!specs) {
    return 0;
  }

  let score = 0;
  let maxScore = 0;

  // Core fields (higher weight)
  const coreFields: (keyof GearSpecs)[] = ['name', 'brand', 'weight', 'price'];
  for (const field of coreFields) {
    maxScore += 2;
    if (specs[field] !== undefined && specs[field] !== null) {
      score += 2;
    }
  }

  // Secondary fields (normal weight)
  const secondaryFields: (keyof GearSpecs)[] = [
    'description',
    'imageUrl',
    'category',
    'dimensions',
    'capacity',
  ];
  for (const field of secondaryFields) {
    maxScore += 1;
    if (specs[field] !== undefined && specs[field] !== null) {
      score += 1;
    }
  }

  // Optional fields (lower weight)
  const optionalFields: (keyof GearSpecs)[] = [
    'materials',
    'features',
    'temperatureRating',
    'seasonRating',
  ];
  for (const field of optionalFields) {
    maxScore += 0.5;
    const value = specs[field];
    if (
      value !== undefined &&
      value !== null &&
      (!Array.isArray(value) || value.length > 0)
    ) {
      score += 0.5;
    }
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) / 100 : 0;
}

/**
 * Checks if caching is enabled via environment variable.
 *
 * @returns true if caching is enabled
 */
export function isCacheEnabled(): boolean {
  return getCacheConfig().enabled;
}

/**
 * Gets the configured cache TTL in days.
 *
 * @returns TTL in days
 */
export function getCacheTtlDays(): number {
  return getCacheConfig().ttlDays;
}
