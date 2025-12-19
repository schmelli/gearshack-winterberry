/**
 * Domain Trust Scoring System
 * Feature 050: AI Assistant - Phase 2B Web Search Integration
 *
 * Provides credibility scoring for web search results based on domain reputation.
 * Implements tiered trust levels for outdoor gear and backpacking content sources.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Domain trust tier levels
 */
export type DomainTrustTier = 'tier1' | 'tier2' | 'tier3' | 'untrusted' | 'blacklisted';

/**
 * Domain trust configuration
 */
export interface DomainTrustConfig {
  domain: string;
  tier: DomainTrustTier;
  score: number;
  category: 'review_site' | 'community' | 'brand' | 'retailer' | 'general';
}

/**
 * Web search result with domain info
 */
export interface SearchResultWithDomain {
  title: string;
  link: string;
  snippet: string;
  domain?: string;
}

/**
 * Scored search result
 */
export interface ScoredSearchResult extends SearchResultWithDomain {
  trustScore: number;
  trustTier: DomainTrustTier;
  domainCategory: DomainTrustConfig['category'];
}

// =============================================================================
// Domain Trust Configuration
// =============================================================================

/**
 * Tier 1: Highly trusted outdoor gear review sites (score: 1.0)
 * These are established, reputable sources for gear reviews and information.
 */
const TIER_1_DOMAINS: DomainTrustConfig[] = [
  { domain: 'rei.com', tier: 'tier1', score: 1.0, category: 'retailer' },
  { domain: 'outdoorgearlab.com', tier: 'tier1', score: 1.0, category: 'review_site' },
  { domain: 'backpacker.com', tier: 'tier1', score: 1.0, category: 'review_site' },
  { domain: 'cleverhiker.com', tier: 'tier1', score: 1.0, category: 'review_site' },
  { domain: 'switchbacktravel.com', tier: 'tier1', score: 1.0, category: 'review_site' },
  { domain: 'trailspace.com', tier: 'tier1', score: 1.0, category: 'review_site' },
  { domain: 'sectionhiker.com', tier: 'tier1', score: 1.0, category: 'review_site' },
  { domain: 'adventurealan.com', tier: 'tier1', score: 1.0, category: 'review_site' },
];

/**
 * Tier 2: Community forums and trail sites (score: 0.8)
 * Trusted community sources with user-generated content.
 */
const TIER_2_DOMAINS: DomainTrustConfig[] = [
  { domain: 'reddit.com', tier: 'tier2', score: 0.8, category: 'community' },
  { domain: 'alltrails.com', tier: 'tier2', score: 0.8, category: 'community' },
  { domain: 'gaiagps.com', tier: 'tier2', score: 0.8, category: 'community' },
  { domain: 'whiteblaze.net', tier: 'tier2', score: 0.8, category: 'community' },
  { domain: 'backpackinglight.com', tier: 'tier2', score: 0.8, category: 'community' },
  { domain: 'lighterpack.com', tier: 'tier2', score: 0.8, category: 'community' },
  { domain: 'youtube.com', tier: 'tier2', score: 0.75, category: 'community' },
];

/**
 * Tier 3: Brand sites and retailers (score: 0.7)
 * Official brand sources - useful for specs but potentially biased.
 */
const TIER_3_DOMAINS: DomainTrustConfig[] = [
  // Premium brands
  { domain: 'zpacks.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'bigagnes.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'gossamergear.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'hyperlitemountaingear.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'enlightenedequipment.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'westernmountaineering.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'nemo.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'thermarest.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'msr.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'blackdiamondequipment.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'patagonia.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'arcteryx.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'osprey.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'gregory.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'granite-gear.com', tier: 'tier3', score: 0.7, category: 'brand' },
  { domain: 'ula-equipment.com', tier: 'tier3', score: 0.7, category: 'brand' },
  // Retailers
  { domain: 'backcountry.com', tier: 'tier3', score: 0.7, category: 'retailer' },
  { domain: 'moosejaw.com', tier: 'tier3', score: 0.7, category: 'retailer' },
  { domain: 'campsaver.com', tier: 'tier3', score: 0.7, category: 'retailer' },
];

/**
 * Blacklisted domains (score: 0, should be filtered out)
 * These domains typically have low-quality or spam content.
 */
const BLACKLISTED_DOMAINS: string[] = [
  'pinterest.com',
  'pinterest.de',
  'pinterest.co.uk',
  'wish.com',
  'temu.com',
  'aliexpress.com',
  'dhgate.com',
  'made-in-china.com',
];

// Combine all trusted domains for lookup
const ALL_TRUSTED_DOMAINS: DomainTrustConfig[] = [
  ...TIER_1_DOMAINS,
  ...TIER_2_DOMAINS,
  ...TIER_3_DOMAINS,
];

// Create lookup maps for fast access
const domainLookup = new Map<string, DomainTrustConfig>(
  ALL_TRUSTED_DOMAINS.map((d) => [d.domain, d])
);

const blacklistSet = new Set<string>(BLACKLISTED_DOMAINS);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract the root domain from a URL or domain string.
 * Handles subdomains (e.g., "www.example.com" -> "example.com")
 *
 * @param urlOrDomain - URL or domain string
 * @returns Root domain or null if invalid
 */
export function extractRootDomain(urlOrDomain: string): string | null {
  try {
    // Handle full URLs
    let domain = urlOrDomain;
    if (urlOrDomain.includes('://')) {
      domain = new URL(urlOrDomain).hostname;
    }

    // Remove www. prefix
    domain = domain.replace(/^www\./, '');

    // Handle special cases like reddit.com/r/ultralight
    // We want to keep the root domain
    const parts = domain.split('.');

    // For most domains, take the last two parts (e.g., example.com)
    // For co.uk style domains, take last three parts
    if (parts.length >= 2) {
      const secondLast = parts[parts.length - 2];
      const last = parts[parts.length - 1];

      // Check for country-code second-level domains
      if (['co', 'com', 'org', 'net', 'gov'].includes(secondLast) && last.length === 2) {
        // e.g., .co.uk, .com.au
        return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    }

    return domain || null;
  } catch {
    return null;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a domain is blacklisted.
 *
 * @param domain - Domain to check
 * @returns True if domain is blacklisted
 */
export function isBlacklisted(domain: string): boolean {
  const rootDomain = extractRootDomain(domain);
  if (!rootDomain) return false;
  return blacklistSet.has(rootDomain);
}

/**
 * Get trust configuration for a domain.
 *
 * @param domain - Domain to look up
 * @returns Trust configuration or null if not in trusted list
 */
export function getDomainTrust(domain: string): DomainTrustConfig | null {
  const rootDomain = extractRootDomain(domain);
  if (!rootDomain) return null;

  // Check blacklist first
  if (blacklistSet.has(rootDomain)) {
    return {
      domain: rootDomain,
      tier: 'blacklisted',
      score: 0,
      category: 'general',
    };
  }

  // Look up in trusted domains
  return domainLookup.get(rootDomain) || null;
}

/**
 * Calculate relevance score for a search result.
 * Combines domain trust score with content relevance signals.
 *
 * @param result - Search result to score
 * @param queryTerms - Original search query terms (for content matching)
 * @returns Score between 0 and 1
 */
export function calculateRelevanceScore(
  result: SearchResultWithDomain,
  queryTerms: string[] = []
): ScoredSearchResult {
  const domain = result.domain || extractRootDomain(result.link) || '';
  const trustConfig = getDomainTrust(domain);

  // Base trust score
  let trustScore = 0.5; // Default for unknown domains
  let trustTier: DomainTrustTier = 'untrusted';
  let domainCategory: DomainTrustConfig['category'] = 'general';

  if (trustConfig) {
    trustScore = trustConfig.score;
    trustTier = trustConfig.tier;
    domainCategory = trustConfig.category;
  }

  // Boost score based on content relevance (if query terms provided)
  if (queryTerms.length > 0) {
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    const matchCount = queryTerms.filter((term) =>
      text.includes(term.toLowerCase())
    ).length;
    const contentBoost = Math.min(0.1 * matchCount, 0.2); // Max 0.2 boost
    trustScore = Math.min(trustScore + contentBoost, 1.0);
  }

  return {
    ...result,
    domain,
    trustScore,
    trustTier,
    domainCategory,
  };
}

/**
 * Filter and score a list of search results.
 * Removes blacklisted domains and sorts by trust score.
 *
 * @param results - Raw search results
 * @param queryTerms - Original search query terms
 * @returns Filtered and scored results, sorted by trust score (descending)
 */
export function filterAndScoreResults(
  results: SearchResultWithDomain[],
  queryTerms: string[] = []
): ScoredSearchResult[] {
  return results
    .filter((result) => {
      const domain = result.domain || extractRootDomain(result.link);
      return domain && !isBlacklisted(domain);
    })
    .map((result) => calculateRelevanceScore(result, queryTerms))
    .sort((a, b) => b.trustScore - a.trustScore);
}

/**
 * Get all domains in a specific trust tier.
 * Useful for configuration and debugging.
 *
 * @param tier - Trust tier to retrieve
 * @returns Array of domain configurations
 */
export function getDomainsByTier(tier: DomainTrustTier): DomainTrustConfig[] {
  return ALL_TRUSTED_DOMAINS.filter((d) => d.tier === tier);
}

/**
 * Check if a domain is trusted (tier1, tier2, or tier3).
 *
 * @param domain - Domain to check
 * @returns True if domain is in any trusted tier
 */
export function isTrustedDomain(domain: string): boolean {
  const config = getDomainTrust(domain);
  return config !== null && config.tier !== 'blacklisted';
}
