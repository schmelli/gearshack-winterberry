/**
 * Serper Shopping API integration for real-time reseller price discovery.
 *
 * Used as a live fallback in /api/resellers/search when no cached prices exist.
 * Mirrors what AI assistants (Gemini, ChatGPT) do natively — real-time Google
 * Shopping search with price extraction.
 *
 * Note: Serper Shopping only returns Google Shopping redirect URLs (item.link),
 * not real product URLs. We derive the retailer homepage from item.source and
 * optionally do a secondary Serper organic search to find the actual product page.
 */

// =============================================================================
// Types
// =============================================================================

export interface SerperShoppingHit {
  /** Retailer store name, e.g. "sackundpack.de" or "Sport Schuster" */
  source: string;
  /** Product title from the shopping listing */
  title: string;
  /** Parsed price amount */
  priceAmount: number;
  /** Detected currency code */
  priceCurrency: string;
  /** Real retailer homepage URL, or null if can't be derived */
  websiteUrl: string | null;
  /**
   * Best-effort product URL on the retailer's site.
   * null when only the homepage could be determined.
   * Populated via secondary Serper organic search.
   */
  productUrl: string | null;
}

// =============================================================================
// Price parsing
// =============================================================================

/**
 * Parse a Serper price string to a number.
 * Handles German format "819,00 €" and US format "$849.00".
 */
function parseSerperPrice(priceStr: string): number {
  if (!priceStr) return 0;
  // Remove currency symbols and whitespace
  let s = priceStr.replace(/[€$£¥₩\s]/g, '');

  const hasPeriod = s.includes('.');
  const hasComma = s.includes(',');

  if (hasPeriod && hasComma) {
    // Detect format from position: "1.234,56" (DE) vs "1,234.56" (US)
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.'); // DE
    } else {
      s = s.replace(/,/g, ''); // US
    }
  } else if (hasComma) {
    const parts = s.split(',');
    // "819,00" → decimal; "1,234" → thousands
    if (parts.length === 2 && parts[1].length <= 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function detectCurrency(priceStr: string, countryCode: string): string {
  if (priceStr.includes('$')) return 'USD';
  if (priceStr.includes('£')) return 'GBP';
  if (['DE', 'AT', 'CH', 'FR', 'NL', 'BE', 'AT'].includes(countryCode.toUpperCase())) return 'EUR';
  return 'EUR';
}

// =============================================================================
// Source → Website URL
// =============================================================================

const STORE_MAP: Record<string, string> = {
  'sackundpack': 'https://www.sackundpack.de',
  'sport schuster': 'https://www.sport-schuster.de',
  'schuster': 'https://www.sport-schuster.de',
  'bergfreunde': 'https://www.bergfreunde.de',
  'campz': 'https://www.campz.de',
  'globetrotter': 'https://www.globetrotter.de',
  'intersport': 'https://www.intersport.de',
  'decathlon': 'https://www.decathlon.de',
  'skandinavier': 'https://www.skandinaviern.de',
  'der skandinavier': 'https://www.derskandinaviern.de',
  'outdoorfair': 'https://www.outdoorfair.de',
  'outdoorxl': 'https://www.outdoorxl.de',
  'tapir': 'https://www.tapir.de',
  'aktivwinter': 'https://www.aktivwinter.de',
  'walkonthewildside': 'https://www.walkonthewildside.de',
  'inwild': 'https://www.inwild.de',
  'snowcountry': 'https://www.snowcountry.de',
  'hardloop': 'https://www.hardloop.fr',
};

/**
 * Derive a real retailer homepage URL from the Serper Shopping `source` field.
 * Returns null for eBay (handled separately) and unknown stores without a domain.
 */
export function sourceToWebsiteUrl(source: string): string | null {
  if (!source) return null;

  // Strip leading "!" artefacts from Serper (e.g. "! Outdoorxl.de")
  const clean = source.replace(/^!\s*/, '').trim();
  const lower = clean.toLowerCase();

  // Skip eBay — we have dedicated eBay integration
  if (lower.startsWith('ebay')) return null;

  // If source looks like a bare domain (no spaces, has a TLD dot)
  if (!lower.includes(' ') && lower.includes('.')) {
    return `https://www.${lower}`;
  }

  // Known store name mapping
  const match = Object.entries(STORE_MAP).find(([key]) => lower.includes(key));
  if (match) return match[1];

  // Last resort: if there's a TLD pattern anywhere in the source
  const domainMatch = lower.match(/\b([\w-]+\.(?:de|at|ch|com|co\.uk|fr|nl|eu))\b/);
  if (domainMatch) return `https://www.${domainMatch[1]}`;

  return null;
}

// =============================================================================
// Title relevance filter
// =============================================================================

/**
 * Returns true if the Serper shopping result title is relevant to the search query.
 * Requires the brand name (if provided) to appear in the title.
 */
function titleIsRelevant(title: string, brand: string | undefined, itemName: string): boolean {
  const t = title.toLowerCase();

  // Brand must appear if provided
  if (brand && !t.includes(brand.toLowerCase())) return false;

  // At least one significant word from itemName must match
  const words = itemName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return words.some((w) => t.includes(w));
}

// =============================================================================
// Primary: Serper Shopping search
// =============================================================================

/**
 * Search Google Shopping via Serper and return parsed, filtered results.
 *
 * @param query - Full search query, e.g. "Slingfin Portal 2"
 * @param brand - Brand name for title filtering, e.g. "Slingfin"
 * @param countryCode - ISO 3166-1 alpha-2 country code, e.g. "DE"
 * @param limit - Max raw results to request (Serper max 10)
 */
async function searchShoppingRaw(
  query: string,
  brand: string | undefined,
  itemName: string,
  countryCode: string,
  limit: number
): Promise<SerperShoppingHit[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const gl = countryCode.toLowerCase().slice(0, 2);
  const hl = ['at', 'ch', 'de'].includes(gl) ? 'de' : gl;

  try {
    const response = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl, hl, num: Math.min(limit, 10) }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];
    const data = await response.json();
    const items: Array<{ title: string; price: string; source: string }> = data.shopping ?? [];

    return items
      .filter((item) => titleIsRelevant(item.title, brand, itemName))
      .map((item) => ({
        source: item.source,
        title: item.title,
        priceAmount: parseSerperPrice(item.price),
        priceCurrency: detectCurrency(item.price, countryCode),
        websiteUrl: sourceToWebsiteUrl(item.source),
        productUrl: null, // populated later by organic search
      }))
      .filter((r) => r.priceAmount > 0 && r.websiteUrl !== null) as SerperShoppingHit[];
  } catch {
    return [];
  }
}

// =============================================================================
// Secondary: Serper Organic search for real product URLs
// =============================================================================

/**
 * For a given retailer domain and query, search Serper organic to find the
 * actual product page URL (e.g. "site:sackundpack.de Slingfin Portal 2").
 *
 * Returns the best matching URL or null.
 */
async function findProductUrl(websiteUrl: string, query: string): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  try {
    const domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
    const siteQuery = `site:${domain} ${query}`;

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: siteQuery, num: 3 }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const organic: Array<{ link: string; title: string }> = data.organic ?? [];

    // Return the first result URL that belongs to the target domain
    const match = organic.find((r) => {
      try {
        return new URL(r.link).hostname.replace(/^www\./, '') === domain;
      } catch {
        return false;
      }
    });

    return match?.link ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Full Serper-based reseller price discovery for a gear item.
 *
 * 1. Calls Serper Shopping to get retailer names, prices, and filtered results.
 * 2. For each matched result, does a secondary Serper organic search to find
 *    the actual product URL on the retailer's site (in parallel).
 *
 * Designed to work "like Gemini" — real-time, no database dependency.
 */
export async function searchSerperResellers(
  query: string,
  brand: string | undefined,
  countryCode: string,
  resultLimit = 3
): Promise<SerperShoppingHit[]> {
  const itemName = brand ? query.replace(new RegExp(brand, 'i'), '').trim() : query;

  const hits = await searchShoppingRaw(query, brand, itemName, countryCode, 10);
  if (hits.length === 0) return [];

  // Deduplicate by domain
  const seen = new Set<string>();
  const unique = hits.filter((h) => {
    try {
      const domain = new URL(h.websiteUrl!).hostname;
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    } catch {
      return false;
    }
  });

  // Sort by price (cheapest first), take limit
  const top = unique
    .sort((a, b) => a.priceAmount - b.priceAmount)
    .slice(0, resultLimit);

  // In parallel: find real product URLs for each retailer
  const withUrls = await Promise.all(
    top.map(async (hit) => {
      const productUrl = hit.websiteUrl
        ? await findProductUrl(hit.websiteUrl, query)
        : null;
      return { ...hit, productUrl };
    })
  );

  return withUrls;
}
