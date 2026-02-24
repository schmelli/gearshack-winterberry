/**
 * MSRP Auto-Discovery API
 *
 * Automatically finds and stores the manufacturer's suggested retail price
 * for a gear item. Called as a fire-and-forget background task when the
 * wishlist loads and an item has no manufacturer_price set.
 *
 * Strategy (in order):
 * 1. Firecrawl: scrape the product_url or brand_url to find the price directly
 * 2. Serper organic: search brand site to find the product page + price
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
  productUrl: string | null;
  source: string;
}

// =============================================================================
// Price extraction from scraped markdown
// =============================================================================

/**
 * Extract the most likely product price from scraped markdown.
 * Looks in the first 4000 chars (product header / above-the-fold area).
 */
function extractPriceFromMarkdown(
  markdown: string,
  preferredCurrency: string
): { amount: number; currency: string } | null {
  const text = markdown.slice(0, 4000);

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
    while ((match = re.exec(text)) !== null) {
      const raw = (match[1] ?? match[0]).replace(/[^0-9,.']/g, '');
      const amount = normalizePrice(raw);
      // Sanity: gear prices are between 10 and 10,000
      if (amount >= 10 && amount <= 10000) {
        candidates.push({ amount, currency: code });
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates.find((c) => c.currency === preferredCurrency) ?? candidates[0];
}

function normalizePrice(raw: string): number {
  let s = raw;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot > lastComma) {
    s = s.replace(/,/g, ''); // US: 1,234.56
  } else if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.'); // DE: 1.234,56
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// =============================================================================
// Serper organic search for product URL
// =============================================================================

async function findProductUrlViaSerper(
  itemName: string,
  brandName: string | null,
  brandUrl: string | null
): Promise<{ url: string; snippet: string } | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  let brandDomain: string | null = null;
  if (brandUrl) {
    try {
      brandDomain = new URL(brandUrl).hostname.replace(/^www\./, '');
    } catch {
      // ignore
    }
  }

  const query = brandDomain
    ? `site:${brandDomain} ${itemName}`
    : `"${brandName ? brandName + ' ' : ''}${itemName}" buy price`;

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 5 }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const organic: Array<{ link: string; snippet?: string }> = data.organic ?? [];

    const brandResult = brandDomain
      ? organic.find((r) => {
          try {
            return new URL(r.link).hostname.replace(/^www\./, '').includes(brandDomain!);
          } catch {
            return false;
          }
        })
      : null;

    const best = brandResult ?? organic[0];
    return best ? { url: best.link, snippet: best.snippet ?? '' } : null;
  } catch {
    return null;
  }
}

// =============================================================================
// Discovery strategies
// =============================================================================

async function discoverFromUrl(
  url: string,
  preferredCurrency: string
): Promise<DiscoveredPrice | null> {
  try {
    const firecrawl = createFirecrawlClient();
    const result = await firecrawl.scrape(url, { formats: ['markdown'] });
    const markdown = result.data?.markdown;
    if (!markdown) return null;

    const price = extractPriceFromMarkdown(markdown, preferredCurrency);
    if (!price) return null;

    return { ...price, productUrl: url, source: 'firecrawl' };
  } catch {
    return null;
  }
}

async function discoverViaSerper(
  itemName: string,
  brandName: string | null,
  brandUrl: string | null,
  preferredCurrency: string
): Promise<DiscoveredPrice | null> {
  const found = await findProductUrlViaSerper(itemName, brandName, brandUrl);
  if (!found) return null;

  // Try Firecrawl on the found URL
  const fromScrape = await discoverFromUrl(found.url, preferredCurrency);
  if (fromScrape) return { ...fromScrape, productUrl: found.url };

  // Fallback: parse price from Serper snippet
  if (found.snippet) {
    const price = extractPriceFromMarkdown(found.snippet, preferredCurrency);
    if (price) return { ...price, productUrl: found.url, source: 'serper-snippet' };
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

    // Verify ownership and check if price already exists
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

    // Strategy 1: Firecrawl the known product URL
    if (effectiveProductUrl && !discovered) {
      discovered = await discoverFromUrl(effectiveProductUrl, preferredCurrency);
    }

    // Strategy 2: Serper organic → Firecrawl
    if (!discovered && (brandUrl || brandName)) {
      discovered = await discoverViaSerper(
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
