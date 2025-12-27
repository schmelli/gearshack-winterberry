/**
 * Enrichment Configuration Constants
 *
 * Feature: XXX-weight-search-tier
 *
 * Configuration for gear item enrichment processes including
 * web search throttling for paid tier users.
 */

// =============================================================================
// Web Search Throttling (for cron job)
// =============================================================================

/** Maximum web searches to perform per cron run */
export const MAX_WEB_SEARCHES_PER_RUN = 50;

/** Delay between web searches in milliseconds (to avoid rate limiting) */
export const WEB_SEARCH_DELAY_MS = 500;

// =============================================================================
// Enrichment Configuration
// =============================================================================

export const ENRICHMENT_CONFIG = {
  /** Maximum web searches to perform per cron run */
  maxWebSearchesPerRun: MAX_WEB_SEARCHES_PER_RUN,

  /** Delay between web searches in milliseconds */
  webSearchDelayMs: WEB_SEARCH_DELAY_MS,

  /** Weight sources for tracking provenance */
  weightSources: {
    catalog: 'catalog',
    webSearch: 'web_search',
  } as const,
} as const;

export type WeightSource = (typeof ENRICHMENT_CONFIG.weightSources)[keyof typeof ENRICHMENT_CONFIG.weightSources];
