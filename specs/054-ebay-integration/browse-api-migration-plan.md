# eBay Browse API Migration Plan

**Feature:** 054-ebay-integration
**Status:** Planning
**Created:** 2026-01-16
**Author:** Claude Code

---

## 1. Executive Summary

Migration der Wishlist-Preissuche von SerpAPI zur offiziellen eBay Browse API. Diese Migration bietet direkten Zugang zu eBay-Daten ohne Drittanbieter, bessere Datenqualitat, und offizielle API-Unterstutzung.

### Vorteile der Migration

| Aspekt | SerpAPI (aktuell) | eBay Browse API (neu) |
|--------|-------------------|----------------------|
| Datenquelle | Scraping via Drittanbieter | Offizielle API |
| Kosten | $75/Monat (5000 Searches) | Kostenlos (5000 calls/Tag) |
| Datenqualitat | Variabel, keine Garantie | Konsistent, garantiert |
| Rate Limits | 5000/Monat | 5000/Tag |
| Listing Details | Begrenzt | Vollstandig inkl. Seller, Shipping |
| Support | Community | Offizieller eBay Developer Support |

---

## 2. Current State Analysis

### 2.1 Betroffene Dateien

```
/app/api/ebay-search/route.ts          # API Route Handler
/lib/external-apis/serpapi-client.ts   # SerpAPI Client (zu ersetzen)
/lib/external-apis/ebay-filter.ts      # Filter Logic (bleibt erhalten)
/hooks/price-tracking/useEbaySearch.ts # React Hook (keine Anderung)
/types/ebay.ts                         # TypeScript Types
/lib/constants/ebay-sites.ts           # Site Config
```

### 2.2 Datenfluss (Aktuell)

```
[useEbaySearch Hook]
       |
       v
[GET /api/ebay-search] --> [Check Supabase Cache]
       |                          |
       | (cache miss)             | (cache hit)
       v                          v
[searchEbayLocalized()]     [Return cached]
       |
       v
[SerpAPI] --> [filterEbayListings()] --> [Cache in Supabase] --> [Response]
```

### 2.3 Aktuelle API Response Struktur (SerpAPI)

```typescript
interface SerpApiEbayOrganic {
  position: number;
  title: string;
  link: string;
  price?: { raw?: string; extracted?: number };
  thumbnail?: string;
  condition?: string;
  bid_count?: number;
  bids?: { count?: number; time_left?: string };
  shipping?: string;
  buy_it_now?: boolean;
  buy_it_now_price?: { raw?: string; extracted?: number };
  best_offer?: boolean;
  seller?: {
    name?: string;
    feedback_percentage?: number;
    feedback_count?: number;
    top_rated?: boolean;
  };
  item_location?: string;
}
```

---

## 3. eBay Browse API Specification

### 3.1 Authentication: OAuth 2.0 Client Credentials

**Endpoint (Production):**
```
POST https://api.ebay.com/identity/v1/oauth2/token
```

**Request:**
```http
POST /identity/v1/oauth2/token HTTP/1.1
Host: api.ebay.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <Base64(client_id:client_secret)>

grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope
```

**Response:**
```json
{
  "access_token": "v^1.1#i^1#I^3#p^3#r^1#f^0#t^H4sIAAAAAA...",
  "expires_in": 7200,
  "token_type": "Application Access Token"
}
```

**Token Caching Strategy:**
- Token gultig: 7200 Sekunden (2 Stunden)
- Refresh Threshold: 300 Sekunden vor Ablauf (5 Minuten Buffer)
- Storage: In-Memory Singleton + Optional Redis fuer Multi-Instance

### 3.2 Browse API: Search Endpoint

**Endpoint:**
```
GET https://api.ebay.com/buy/browse/v1/item_summary/search
```

**Required Headers:**
```http
Authorization: Bearer <access_token>
X-EBAY-C-MARKETPLACE-ID: EBAY_DE
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search keywords |
| `category_ids` | string | No | Category IDs (comma-separated) |
| `filter` | string | No | Filter expression |
| `limit` | integer | No | Max items (1-200, default 50) |
| `offset` | integer | No | Pagination offset |
| `sort` | string | No | Sort order |

**Filter Expressions:**
```
filter=price:[10..100],priceCurrency:EUR,conditions:{NEW|USED}
filter=buyingOptions:{FIXED_PRICE|AUCTION}
filter=deliveryCountry:DE
```

**Sort Options:**
- `price` - Price ascending
- `-price` - Price descending
- `newlyListed` - Newest first
- `endingSoonest` - Auctions ending soon

### 3.3 Response Structure

```typescript
interface EbayBrowseSearchResponse {
  href: string;
  total: number;
  next?: string;
  prev?: string;
  limit: number;
  offset: number;
  itemSummaries?: EbayItemSummary[];
  warnings?: EbayWarning[];
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  itemHref: string;
  itemWebUrl: string;
  image?: { imageUrl: string };
  thumbnailImages?: Array<{ imageUrl: string }>;
  price?: {
    value: string;
    currency: string;
  };
  currentBidPrice?: {
    value: string;
    currency: string;
  };
  shippingOptions?: Array<{
    shippingCost?: { value: string; currency: string };
    shippingCostType: string;
  }>;
  condition: string;
  conditionId: string;
  seller?: {
    username: string;
    feedbackPercentage: string;
    feedbackScore: number;
    sellerAccountType: string;
  };
  itemLocation?: {
    city?: string;
    stateOrProvince?: string;
    postalCode?: string;
    country: string;
  };
  buyingOptions: string[]; // ["FIXED_PRICE", "AUCTION", "BEST_OFFER"]
  itemEndDate?: string; // ISO 8601
  bidCount?: number;
  topRatedBuyingExperience: boolean;
  adultOnly: boolean;
}
```

### 3.4 Marketplace IDs

| Locale | Marketplace ID | Currency |
|--------|---------------|----------|
| de | EBAY_DE | EUR |
| de-AT | EBAY_AT | EUR |
| de-CH | EBAY_CH | CHF |
| en-US | EBAY_US | USD |
| en-GB | EBAY_GB | GBP |
| en-AU | EBAY_AU | AUD |
| en-CA | EBAY_CA | CAD |
| fr | EBAY_FR | EUR |
| it | EBAY_IT | EUR |
| es | EBAY_ES | EUR |
| nl | EBAY_NL | EUR |
| pl | EBAY_PL | PLN |
| be | EBAY_BE | EUR |

---

## 4. New File Architecture

### 4.1 Neue Dateien

```
/lib/ebay/
  oauth.ts            # OAuth Token Service (Singleton)
  browse-api.ts       # Browse API Client
  types.ts            # eBay API Response Types
  mapper.ts           # Response -> EbayListing Mapper
```

### 4.2 Zu Modifizierende Dateien

```
/app/api/ebay-search/route.ts    # Import-Swap: serpapi-client -> browse-api
/lib/constants/ebay-sites.ts     # Add marketplaceId field
/types/ebay.ts                   # Add marketplaceId to EbaySiteConfig
```

### 4.3 Zu Entfernende Dateien (nach Migration)

```
/lib/external-apis/serpapi-client.ts   # Komplett entfernen
# Hinweis: searchGoogleShopping() wird noch woanders verwendet - prufen!
```

---

## 5. Implementation Details

### 5.1 OAuth Token Service (`/lib/ebay/oauth.ts`)

```typescript
/**
 * eBay OAuth Token Service
 *
 * Feature: 054-ebay-integration
 * Purpose: Manage OAuth 2.0 tokens for eBay Browse API
 *
 * Pattern: Singleton with automatic refresh
 * Token TTL: 7200s (2 hours)
 * Refresh Buffer: 300s (5 minutes before expiry)
 */

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

class EbayOAuthService {
  private static instance: EbayOAuthService;
  private tokenCache: TokenCache | null = null;
  private refreshPromise: Promise<string> | null = null;

  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
  private readonly TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
  private readonly SCOPE = 'https://api.ebay.com/oauth/api_scope';

  static getInstance(): EbayOAuthService {
    if (!EbayOAuthService.instance) {
      EbayOAuthService.instance = new EbayOAuthService();
    }
    return EbayOAuthService.instance;
  }

  async getAccessToken(): Promise<string> {
    // Return cached token if valid
    if (this.tokenCache && this.isTokenValid()) {
      return this.tokenCache.accessToken;
    }

    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchNewToken();
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private isTokenValid(): boolean {
    if (!this.tokenCache) return false;
    return Date.now() < this.tokenCache.expiresAt - this.REFRESH_BUFFER_MS;
  }

  private async fetchNewToken(): Promise<string> {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(this.SCOPE)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`eBay OAuth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return this.tokenCache.accessToken;
  }

  // For testing: clear cache
  clearCache(): void {
    this.tokenCache = null;
  }
}

export const ebayOAuth = EbayOAuthService.getInstance();
export { EbayOAuthService }; // For testing
```

### 5.2 Browse API Client (`/lib/ebay/browse-api.ts`)

```typescript
/**
 * eBay Browse API Client
 *
 * Feature: 054-ebay-integration
 * Purpose: Search eBay listings via official Browse API
 */

import { ebayOAuth } from './oauth';
import { mapBrowseResponseToListings } from './mapper';
import type { EbayListing, EbaySiteConfig } from '@/types/ebay';
import type { EbayBrowseSearchResponse } from './types';

const BROWSE_API_BASE = 'https://api.ebay.com/buy/browse/v1';

interface BrowseSearchOptions {
  query: string;
  siteConfig: EbaySiteConfig;
  limit?: number;
  filter?: string;
  sort?: string;
}

/**
 * Search eBay via Browse API
 * Replaces: searchEbayLocalized() from serpapi-client.ts
 */
export async function searchEbayBrowse(
  options: BrowseSearchOptions
): Promise<EbayListing[]> {
  const { query, siteConfig, limit = 20, filter, sort } = options;

  const token = await ebayOAuth.getAccessToken();

  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  if (filter) {
    params.set('filter', filter);
  }

  if (sort) {
    params.set('sort', sort);
  }

  const response = await fetch(
    `${BROWSE_API_BASE}/item_summary/search?${params}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': siteConfig.marketplaceId,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    // Handle specific error codes
    if (response.status === 401) {
      // Token expired mid-request, clear cache and retry once
      ebayOAuth.clearCache();
      throw new Error('eBay authentication expired. Please retry.');
    }

    const errorBody = await response.text();
    throw new Error(`eBay Browse API error: ${response.status} - ${errorBody}`);
  }

  const data: EbayBrowseSearchResponse = await response.json();

  return mapBrowseResponseToListings(data, siteConfig);
}
```

### 5.3 Response Mapper (`/lib/ebay/mapper.ts`)

```typescript
/**
 * eBay Browse API Response Mapper
 *
 * Feature: 054-ebay-integration
 * Purpose: Convert Browse API response to internal EbayListing format
 */

import type { EbayListing, EbayCondition, EbayListingType, EbaySiteConfig } from '@/types/ebay';
import type { EbayBrowseSearchResponse, EbayItemSummary } from './types';

/**
 * Map eBay condition string to our EbayCondition type
 */
function mapCondition(condition: string): EbayCondition {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('new')) return 'new';
  if (conditionLower.includes('open box')) return 'open_box';
  if (conditionLower.includes('refurbished') || conditionLower.includes('renewed')) return 'refurbished';
  if (conditionLower.includes('parts')) return 'for_parts';
  return 'used';
}

/**
 * Map buying options to our EbayListingType
 */
function mapListingType(buyingOptions: string[]): EbayListingType {
  if (buyingOptions.includes('BEST_OFFER')) return 'best_offer';
  if (buyingOptions.includes('FIXED_PRICE')) return 'buy_it_now';
  if (buyingOptions.includes('AUCTION')) return 'auction';
  return 'buy_it_now';
}

/**
 * Parse price from eBay response
 */
function parsePrice(item: EbayItemSummary): number {
  // Prefer current price, fallback to bid price
  const priceStr = item.price?.value || item.currentBidPrice?.value || '0';
  return parseFloat(priceStr) || 0;
}

/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse shipping cost from shipping options
 */
function parseShippingCost(item: EbayItemSummary): number | null {
  if (!item.shippingOptions || item.shippingOptions.length === 0) {
    return null;
  }

  const firstOption = item.shippingOptions[0];
  if (firstOption.shippingCostType === 'FREE') {
    return 0;
  }

  if (firstOption.shippingCost?.value) {
    return parseFloat(firstOption.shippingCost.value) || null;
  }

  return null;
}

/**
 * Map Browse API response to EbayListing array
 */
export function mapBrowseResponseToListings(
  response: EbayBrowseSearchResponse,
  siteConfig: EbaySiteConfig
): EbayListing[] {
  if (!response.itemSummaries || response.itemSummaries.length === 0) {
    return [];
  }

  return response.itemSummaries.map((item): EbayListing => {
    const price = parsePrice(item);
    const currency = item.price?.currency || siteConfig.currency;

    return {
      id: item.itemId,
      title: item.title,
      url: item.itemWebUrl,
      thumbnailUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || null,
      price,
      currency,
      priceFormatted: formatPrice(price, currency),
      listingType: mapListingType(item.buyingOptions || []),
      condition: mapCondition(item.condition || 'used'),
      shippingCost: parseShippingCost(item),
      seller: item.seller ? {
        username: item.seller.username,
        feedbackPercent: item.seller.feedbackPercentage
          ? parseFloat(item.seller.feedbackPercentage)
          : null,
        feedbackCount: item.seller.feedbackScore || null,
        badge: item.topRatedBuyingExperience ? 'Top Rated' : undefined,
      } : null,
      bidCount: item.bidCount,
      timeLeft: item.itemEndDate ? calculateTimeLeft(item.itemEndDate) : undefined,
      shipsToUser: true, // Browse API respects marketplace, so assume true
      location: item.itemLocation
        ? formatLocation(item.itemLocation)
        : null,
    };
  });
}

/**
 * Calculate human-readable time left from ISO date
 */
function calculateTimeLeft(endDateISO: string): string {
  const endDate = new Date(endDateISO);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();

  if (diffMs <= 0) return 'Ended';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;

  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
}

/**
 * Format item location from eBay response
 */
function formatLocation(location: EbayItemSummary['itemLocation']): string {
  if (!location) return '';

  const parts: string[] = [];
  if (location.city) parts.push(location.city);
  if (location.stateOrProvince) parts.push(location.stateOrProvince);
  if (location.country) parts.push(location.country);

  return parts.join(', ');
}
```

### 5.4 Updated Site Config (`/lib/constants/ebay-sites.ts`)

**Changes Required:**
- Add `marketplaceId` field to each site config
- Keep `serpApiDomain` for backwards compatibility during transition

```typescript
// Add to EbaySiteConfig interface in /types/ebay.ts
export interface EbaySiteConfig {
  site: string;
  currency: string;
  country: string;
  serpApiDomain?: string;      // Legacy (SerpAPI)
  marketplaceId: string;       // NEW: eBay Browse API
}

// Update EBAY_SITES in /lib/constants/ebay-sites.ts
export const EBAY_SITES: EbaySiteMap = {
  de: {
    site: 'ebay.de',
    currency: 'EUR',
    country: 'Germany',
    serpApiDomain: 'EBAY_DE',
    marketplaceId: 'EBAY_DE',   // NEW
  },
  'de-AT': {
    site: 'ebay.at',
    currency: 'EUR',
    country: 'Austria',
    serpApiDomain: 'EBAY_AT',
    marketplaceId: 'EBAY_AT',   // NEW
  },
  // ... etc for all locales
};
```

### 5.5 Updated API Route (`/app/api/ebay-search/route.ts`)

**Key Changes:**
- Replace `searchEbayLocalized` import from serpapi-client
- Import `searchEbayBrowse` from browse-api
- Update error handling for eBay-specific errors
- Maintain same response format for frontend compatibility

```typescript
// BEFORE
import { searchEbayLocalized } from '@/lib/external-apis/serpapi-client';

// AFTER
import { searchEbayBrowse } from '@/lib/ebay/browse-api';

// In route handler, replace:
// const rawListings = await searchEbayLocalized(query, siteConfig, 20);

// With:
// const rawListings = await searchEbayBrowse({
//   query,
//   siteConfig,
//   limit: 20,
// });
```

---

## 6. Environment Variables

### 6.1 Neue Variablen

```env
# eBay API Credentials (Production)
EBAY_CLIENT_ID=your-ebay-client-id
EBAY_CLIENT_SECRET=your-ebay-client-secret

# Optional: Sandbox for testing
EBAY_SANDBOX_CLIENT_ID=your-sandbox-client-id
EBAY_SANDBOX_CLIENT_SECRET=your-sandbox-client-secret
EBAY_USE_SANDBOX=false
```

### 6.2 Zu Entfernende Variablen (nach Migration)

```env
# Kann nach vollstandiger Migration entfernt werden
# ACHTUNG: Prufen ob SERPAPI_KEY noch fuer Google Shopping verwendet wird!
SERPAPI_KEY=xxx
```

---

## 7. Error Handling Strategy

### 7.1 OAuth Errors

| Error Code | Cause | Action |
|------------|-------|--------|
| 401 | Invalid credentials | Log error, return 503 to client |
| 403 | App not approved | Log error, return 503 to client |
| 500 | eBay server error | Retry with backoff (max 3) |

### 7.2 Browse API Errors

| Error Code | Cause | Action |
|------------|-------|--------|
| 400 | Invalid query params | Return 400 with error message |
| 401 | Token expired | Clear cache, retry once |
| 403 | Forbidden marketplace | Fallback to EBAY_US |
| 404 | No results | Return empty array |
| 429 | Rate limited | Return 429, suggest retry later |
| 500-503 | eBay server error | Retry with backoff |

### 7.3 Retry Configuration

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialBackoffMs: 500,
  maxBackoffMs: 5000,
  retryableStatuses: [500, 502, 503, 504],
};
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```
/lib/ebay/__tests__/
  oauth.test.ts       # Token caching, refresh logic
  browse-api.test.ts  # API calls, error handling
  mapper.test.ts      # Response mapping
```

### 8.2 Test Cases

**OAuth Service:**
- [ ] Fetches new token on first call
- [ ] Returns cached token on subsequent calls
- [ ] Refreshes token before expiry (5 min buffer)
- [ ] Handles concurrent token requests (no race condition)
- [ ] Throws on missing credentials
- [ ] Handles 401/403 gracefully

**Browse API Client:**
- [ ] Constructs correct URL with params
- [ ] Sends correct headers (Bearer token, Marketplace ID)
- [ ] Maps response to EbayListing[]
- [ ] Handles empty results
- [ ] Retries on 5xx errors
- [ ] Clears token cache on 401

**Response Mapper:**
- [ ] Maps all fields correctly
- [ ] Handles missing optional fields
- [ ] Calculates timeLeft from endDate
- [ ] Formats prices correctly per currency
- [ ] Maps conditions correctly

### 8.3 Integration Tests

- [ ] End-to-end search with real eBay sandbox
- [ ] Verify cache behavior with Supabase
- [ ] Verify rate limiter integration

---

## 9. Migration Checklist

### Phase 1: Preparation (Day 1)

- [ ] Obtain eBay Developer Account and create Production App
- [ ] Get Client ID and Client Secret
- [ ] Add credentials to Vercel environment variables
- [ ] Add credentials to local .env.local

### Phase 2: Implementation (Day 2-3)

- [ ] Create `/lib/ebay/types.ts` with API response types
- [ ] Create `/lib/ebay/oauth.ts` with token service
- [ ] Create `/lib/ebay/mapper.ts` with response mapper
- [ ] Create `/lib/ebay/browse-api.ts` with search function
- [ ] Update `/types/ebay.ts` with marketplaceId
- [ ] Update `/lib/constants/ebay-sites.ts` with marketplaceId

### Phase 3: Integration (Day 3-4)

- [ ] Update `/app/api/ebay-search/route.ts`
- [ ] Update error messages for eBay-specific errors
- [ ] Test with all supported marketplaces
- [ ] Verify frontend still works without changes

### Phase 4: Cleanup (Day 5)

- [ ] Remove `searchEbayLocalized` from serpapi-client.ts
- [ ] Check if `searchGoogleShopping` is still used
- [ ] If not, delete serpapi-client.ts entirely
- [ ] Remove SERPAPI_KEY from environment (if unused)
- [ ] Update documentation

### Phase 5: Monitoring (Week 1-2)

- [ ] Monitor error rates in production
- [ ] Monitor API quota usage
- [ ] Set up alerts for rate limit warnings
- [ ] Gather user feedback

---

## 10. Rollback Plan

Falls kritische Probleme auftreten:

1. **Feature Flag Option:**
   ```typescript
   const USE_EBAY_BROWSE_API = process.env.USE_EBAY_BROWSE_API === 'true';

   if (USE_EBAY_BROWSE_API) {
     rawListings = await searchEbayBrowse({ query, siteConfig, limit: 20 });
   } else {
     rawListings = await searchEbayLocalized(query, siteConfig, 20);
   }
   ```

2. **Instant Rollback:**
   - Set `USE_EBAY_BROWSE_API=false` in Vercel
   - Redeploy (or wait for env var refresh)
   - SerpAPI weiterhin verfugbar als Fallback

3. **Data Consistency:**
   - Cache-Format bleibt identisch
   - Keine Datenbank-Migration notwendig
   - Rollback hat keine Auswirkung auf gespeicherte Daten

---

## 11. Dependencies and Risks

### 11.1 Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| eBay Developer Account | Required | Low - easy to obtain |
| Production App Approval | Required | Medium - may take 1-2 days |
| Environment Variables | Required | Low - straightforward |

### 11.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| eBay API Downtime | Low | High | Fallback to SerpAPI |
| Rate Limit Hit | Medium | Medium | Existing cache + rate limiter |
| Token Refresh Race | Low | Low | Singleton pattern with lock |
| Response Format Changes | Low | Medium | Versioned API, backwards compat |

---

## 12. Success Metrics

| Metric | Current (SerpAPI) | Target (Browse API) |
|--------|-------------------|---------------------|
| API Cost | $75/month | $0/month |
| Search Latency (p50) | ~800ms | <500ms |
| Data Freshness | Variable | Real-time |
| Error Rate | ~2% | <1% |
| Listing Detail Quality | Limited | Full |

---

## 13. Summary

Diese Migration ersetzt den indirekten SerpAPI-Zugang durch die offizielle eBay Browse API. Die Hauptvorteile sind:

1. **Kostenersparnis:** $75/Monat Einsparung
2. **Bessere Datenqualitat:** Direkte, konsistente Daten
3. **Hoheres Limit:** 5000 Calls/Tag statt 5000/Monat
4. **Offizieller Support:** eBay Developer Support statt Drittanbieter

Die Migration ist ruckwartskompatibel - das Frontend (useEbaySearch Hook) benotigt keine Anderungen. Ein Feature-Flag ermoglicht schnelles Rollback bei Problemen.
