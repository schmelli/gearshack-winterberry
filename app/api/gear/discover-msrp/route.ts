/**
 * MSRP Auto-Discovery API
 *
 * Automatically finds and stores the manufacturer's suggested retail price
 * for a gear item using Firecrawl search() — combines web search + scraping
 * in a single call, returning real product page URLs with scraped content.
 *
 * Strategy:
 * 1. Firecrawl search: "{brand} {item}" site:{brandDomain}  → manufacturer's page
 * 2. Firecrawl search: "{brand} {item}" (broad)             → any product page
 * 3. Price extraction from JSON-LD structured data (schema.org/Product)
 *    — falls back to regex extraction from markdown if JSON-LD not found
 *
 * Writes to gear_items.manufacturer_price, manufacturer_currency, product_url.
 *
 * POST /api/gear/discover-msrp
 * Body: { gearItemId, itemName, brandName?, productUrl?, brandUrl? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createFirecrawlClient } from '@/lib/firecrawl/client';

// =============================================================================
// Types
// =============================================================================

interface DiscoverMsrpRequest {
  gearItemId: string;
  itemName: string;
  brandName?: string | null;
  productUrl?: string | null;
  brandUrl?: string | null;
}

interface DiscoveredPrice {
  amount: number;
  currency: string;
  productUrl: string;
  source: string;
}

// =============================================================================
// JSON-LD structured data extraction (schema.org/Product)
// =============================================================================

/**
 * Extract price from JSON-LD Product schema embedded in HTML.
 * Most e-commerce sites include this — it's authoritative and precise.
 */
function extractPriceFromJsonLd(html: string): { amount: number; currency: string } | null {
  const scriptMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!scriptMatches) return null;

  for (const block of scriptMatches) {
    try {
      const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      const data = JSON.parse(jsonStr);

      const extractFromObject = (obj: unknown): { amount: number; currency: string } | null => {
        if (!obj || typeof obj !== 'object') return null;
        const d = obj as Record<string, unknown>;

        // Check for Product type with offers
        const type = (d['@type'] as string | undefined)?.toLowerCase();
        if (type === 'product' || type?.includes('product')) {
          const offers = d['offers'];
          if (offers) {
            const offerObj = Array.isArray(offers) ? offers[0] : offers;
            const price = offerObj?.price ?? offerObj?.lowPrice;
            const currency = offerObj?.priceCurrency ?? 'USD';
            if (typeof price === 'number' && price > 0) {
              return { amount: price, currency: String(currency) };
            }
            if (typeof price === 'string') {
              const n = parseFloat(price.replace(/[^0-9.]/g, ''));
              if (n > 0) return { amount: n, currency: String(currency) };
            }
          }
        }

        // Recurse into arrays and @graph
        if (Array.isArray(d['@graph'])) {
          for (const item of d['@graph'] as unknown[]) {
            const found = extractFromObject(item);
            if (found) return found;
          }
        }
        return null;
      };

      const result = extractFromObject(data);
      if (result && result.amount >= 10 && result.amount <= 10000) return result;
    } catch {
      // Malformed JSON-LD — skip
    }
  }
  return null;
}

// =============================================================================
// Markdown regex fallback
// =============================================================================

function normalizePrice(raw: string): number {
  let s = raw.replace(/\s/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot > lastComma) {
    s = s.replace(/,/g, '');
  } else if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function extractPriceFromMarkdown(
  text: string,
  preferredCurrency: string
): { amount: number; currency: string } | null {
  // Only scan first 3000 chars (product header area)
  const t = text.slice(0, 3000);

  const PATTERNS: Array<{ regex: RegExp; code: string }> = [
    { regex: /\$\s*([\d,.']+)/g, code: 'USD' },
    { regex: /€\s*([\d,.']+)/g, code: 'EUR' },
    { regex: /([\d,.']+)\s*€/g, code: 'EUR' },
    { regex: /([\d,.']+)\s*\$/g, code: 'USD' },
    { regex: /USD[\s:]*([\d,.']+)/gi, code: 'USD' },
    { regex: /EUR[\s:]*([\d,.']+)/gi, code: 'EUR' },
  ];

  const candidates: Array<{ amount: number; currency: string }> = [];
  for (const { regex, code } of PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = re.exec(t)) !== null) {
      const raw = (match[1] ?? match[0]).replace(/[^0-9,.']/g, '');
      const amount = normalizePrice(raw);
      if (amount >= 10 && amount <= 10000) candidates.push({ amount, currency: code });
    }
  }

  if (candidates.length === 0) return null;
  return candidates.find((c) => c.currency === preferredCurrency) ?? candidates[0];
}

// =============================================================================
// Core discovery using Firecrawl search()
// =============================================================================

/**
 * Uses Firecrawl search() to find and scrape the manufacturer's product page
 * in a single API call. Returns the extracted price and real product URL.
 */
async function discoverMsrpViaFirecrawl(
  itemName: string,
  brandName: string | null,
  brandUrl: string | null,
  preferredCurrency: string
): Promise<DiscoveredPrice | null> {
  const firecrawl = createFirecrawlClient();

  let brandDomain: string | null = null;
  if (brandUrl) {
    try {
      brandDomain = new URL(brandUrl).hostname.replace(/^www\./, '');
    } catch {
      // ignore
    }
  }

  const queries = [
    // Narrow: search on brand domain specifically
    ...(brandDomain ? [`${brandName ? brandName + ' ' : ''}${itemName} site:${brandDomain}`] : []),
    // Medium: brand + item name
    `"${brandName ? brandName + ' ' : ''}${itemName}" price`,
  ];

  for (const query of queries) {
    try {
      const result = await firecrawl.search(query, {
        limit: 3,
        scrapeOptions: { formats: ['markdown', 'html'] },
      });

      for (const item of result.results) {
        if (!item.url || !item.markdown) continue;

        // Try JSON-LD first (most reliable)
        if (item.html) {
          const jsonLdPrice = extractPriceFromJsonLd(item.html);
          if (jsonLdPrice && jsonLdPrice.amount >= 10) {
            return {
              ...jsonLdPrice,
              productUrl: item.url,
              source: 'firecrawl-search-jsonld',
            };
          }
        }

        // Fall back to markdown regex
        const markdownPrice = extractPriceFromMarkdown(item.markdown, preferredCurrency);
        if (markdownPrice && markdownPrice.amount >= 10) {
          return {
            ...markdownPrice,
            productUrl: item.url,
            source: 'firecrawl-search-markdown',
          };
        }
      }
    } catch {
      // Try next query
    }
  }

  return null;
}

/**
 * Direct scrape of a known product URL (fastest path).
 */
async function discoverFromKnownUrl(
  url: string,
  preferredCurrency: string
): Promise<DiscoveredPrice | null> {
  try {
    const firecrawl = createFirecrawlClient();
    const result = await firecrawl.scrape(url, { formats: ['markdown', 'html'] });

    if (result.data?.html) {
      const jsonLdPrice = extractPriceFromJsonLd(result.data.html);
      if (jsonLdPrice && jsonLdPrice.amount >= 10) {
        return { ...jsonLdPrice, productUrl: url, source: 'firecrawl-scrape-jsonld' };
      }
    }
    if (result.data?.markdown) {
      const markdownPrice = extractPriceFromMarkdown(result.data.markdown, preferredCurrency);
      if (markdownPrice) return { ...markdownPrice, productUrl: url, source: 'firecrawl-scrape-markdown' };
    }
  } catch {
    // fall through
  }
  return null;
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DiscoverMsrpRequest = await request.json();
    const { gearItemId, itemName, brandName, productUrl, brandUrl } = body;

    if (!gearItemId || !itemName) {
      return NextResponse.json({ error: 'gearItemId and itemName are required' }, { status: 400 });
    }

    // Verify ownership, skip if price already set
    const { data: gearItem } = await supabase
      .from('gear_items')
      .select('id, manufacturer_price, product_url')
      .eq('id', gearItemId)
      .eq('user_id', user.id)
      .single();

    if (!gearItem) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
    }
    if (gearItem.manufacturer_price !== null) {
      return NextResponse.json({ skipped: true, reason: 'price_already_set' });
    }

    const acceptLanguage = request.headers.get('accept-language') ?? 'de';
    const preferredCurrency = acceptLanguage.startsWith('de') ? 'EUR' : 'USD';
    const effectiveProductUrl = productUrl ?? gearItem.product_url ?? null;

    let discovered: DiscoveredPrice | null = null;

    // Strategy 1: Scrape known product URL directly
    if (effectiveProductUrl) {
      discovered = await discoverFromKnownUrl(effectiveProductUrl, preferredCurrency);
    }

    // Strategy 2: Firecrawl search + scrape in one call
    if (!discovered) {
      discovered = await discoverMsrpViaFirecrawl(
        itemName,
        brandName ?? null,
        brandUrl ?? null,
        preferredCurrency
      );
    }

    if (!discovered) {
      return NextResponse.json({ found: false, reason: 'no_price_found' });
    }

    const updatePayload: Record<string, unknown> = {
      manufacturer_price: discovered.amount,
      manufacturer_currency: discovered.currency,
    };
    if (discovered.productUrl && !effectiveProductUrl) {
      updatePayload.product_url = discovered.productUrl;
    }

    const { error: updateError } = await supabase
      .from('gear_items')
      .update(updatePayload)
      .eq('id', gearItemId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[MSRP Discovery] Failed to update gear_items:', updateError);
      return NextResponse.json({ error: 'Failed to save price' }, { status: 500 });
    }

    console.log(
      `[MSRP Discovery] ${itemName}: ${discovered.currency} ${discovered.amount} via ${discovered.source}`
    );

    return NextResponse.json({
      found: true,
      amount: discovered.amount,
      currency: discovered.currency,
      productUrl: discovered.productUrl,
      source: discovered.source,
    });
  } catch (error) {
    console.error('[MSRP Discovery] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
