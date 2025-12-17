# Research & Technology Decisions

**Feature**: Price Discovery & Monitoring for Wishlist Items
**Date**: 2025-12-17
**Purpose**: Resolve all NEEDS CLARIFICATION items from Technical Context

## Overview

This document captures research findings and technology decisions for implementing price tracking functionality. All decisions prioritize simplicity, existing project patterns, and avoiding over-engineering.

---

## Decision 1: Background Job Scheduler

**Context**: Need to run daily price checks for all tracked items (FR-024)

**Options Evaluated**:
1. Vercel Cron (built-in, free tier: 2 cron jobs)
2. Supabase pg_cron (PostgreSQL extension, unlimited jobs)
3. External service (BullMQ, Inngest, etc.)

**Decision**: **Vercel Cron**

**Rationale**:
- Native Next.js/Vercel integration - no additional dependencies
- Free tier provides 2 cron jobs (sufficient for MVP: daily checks + data purge)
- Simple API route implementation: `app/api/cron/check-prices/route.ts`
- Easy monitoring via Vercel dashboard
- Scales automatically with Vercel deployment

**Implementation Pattern**:
```typescript
// app/api/cron/check-prices/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all active tracking items
  // Run price checks
  // Send alerts for price drops
  return Response.json({ success: true });
}
```

**Alternatives Considered**:
- pg_cron: More complex setup, requires direct database access control
- External services: Over-engineering for MVP, adds cost and complexity

---

## Decision 2: External API Services

**Context**: Need to search prices from multiple sources (FR-002)

**Options Evaluated**:
1. Google Shopping API (official, paid)
2. SerpApi (aggregator, paid, includes Google Shopping, eBay, retailers)
3. Oxylabs/ScraperAPI (web scraping services)
4. Direct retailer APIs (case-by-case)

**Decision**: **SerpApi** (with fallback to direct scraping for specific retailers)

**Rationale**:
- Single API for multiple sources (Google Shopping, eBay, multiple retailers)
- Pay-as-you-go pricing (~$50/month for 5000 searches = $0.01/search)
- Handles rate limiting and proxy rotation automatically
- Returns structured JSON (no HTML parsing)
- 5-10 second response time targets achievable
- Reduces implementation complexity vs. managing multiple API clients

**Implementation Pattern**:
```typescript
// lib/external-apis/serp-api.ts
import axios from 'axios';

export async function searchGoogleShopping(query: string) {
  const response = await axios.get('https://serpapi.com/search', {
    params: {
      engine: 'google_shopping',
      q: query,
      api_key: process.env.SERPAPI_KEY,
      location: 'Germany', // or dynamic based on user location
      num: 10
    }
  });
  return response.data.shopping_results;
}

export async function searchEbay(query: string) {
  const response = await axios.get('https://serpapi.com/search', {
    params: {
      engine: 'ebay',
      q: query,
      api_key: process.env.SERPAPI_KEY,
      _nkw: query
    }
  });
  return response.data.organic_results;
}
```

**Rate Limits**:
- SerpApi: 100 requests/second (well above our needs)
- Daily batch processing: ~500k items × 3-5 sources = 1.5M-2.5M API calls/day
- Cost estimate: ~$15,000-$25,000/month at scale (requires optimization)

**Optimization Strategy**:
- Cache results for 6-12 hours (reduce duplicate searches)
- Smart batching: Only check items with active alerts
- Throttle requests to stay within free/low tiers initially

**Alternatives Considered**:
- Google Shopping API: Requires Google Merchant Center, complex setup
- Direct scraping: Fragile, high maintenance, legal risks
- Multiple direct APIs: Too complex to integrate and maintain

---

## Decision 3: Fuzzy Matching Library

**Context**: Match wishlist item names to retailer products when exact match fails (FR-030, FR-031)

**Options Evaluated**:
1. PostgreSQL pg_trgm (trigram similarity, built-in)
2. fuse.js (client-side fuzzy search library)
3. PostgreSQL pgvector (semantic/vector search)

**Decision**: **PostgreSQL pg_trgm** (with fuse.js for client-side filtering)

**Rationale**:
- pg_trgm already available in Supabase PostgreSQL (no new dependency)
- Server-side filtering reduces data transfer
- Trigram similarity scoring (`word1 <-> word2`) provides confidence metric
- GIN index support for fast searches
- Threshold-based matching (e.g., similarity > 0.3 = ambiguous, requires confirmation)

**Implementation Pattern**:
```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy search query
SELECT
  product_name,
  product_name <-> 'Arc''teryx Beta LT Jacket' AS distance,
  SIMILARITY(product_name, 'Arc''teryx Beta LT Jacket') AS similarity
FROM price_results
WHERE similarity > 0.3
ORDER BY similarity DESC
LIMIT 5;
```

```typescript
// lib/supabase/fuzzy-matcher.ts
export async function findFuzzyMatches(itemName: string) {
  const { data, error } = await supabase
    .rpc('fuzzy_search_products', { search_term: itemName, threshold: 0.3 });

  // High confidence: similarity > 0.7
  if (data[0]?.similarity > 0.7) {
    return { type: 'auto_match', matches: [data[0]] };
  }

  // Ambiguous: 0.3 < similarity < 0.7
  return { type: 'requires_confirmation', matches: data.slice(0, 5) };
}
```

**fuse.js for Client-Side**:
- Use fuse.js (already lightweight, no new dependency concern) for client-side filtering of match candidates
- Allows user to search/filter match options in confirmation dialog

**Alternatives Considered**:
- pgvector: Over-engineering for simple text matching, requires embeddings
- Pure fuse.js: Requires loading all product data to client, not scalable

---

## Decision 4: Geolocation Library

**Context**: Calculate distance to local shops for prioritization (FR-008)

**Options Evaluated**:
1. PostGIS (PostgreSQL extension, full GIS capabilities)
2. geolib (npm package, simple distance calculations)
3. turf.js (comprehensive geospatial library)

**Decision**: **geolib**

**Rationale**:
- Lightweight (~4KB minified)
- Simple API: `getDistance(coord1, coord2)` returns meters
- No database extension required
- Sufficient for distance-based sorting
- Works client-side and server-side

**Implementation Pattern**:
```typescript
import { getDistance } from 'geolib';

export function sortByDistance(
  shops: LocalShop[],
  userLocation: { latitude: number; longitude: number }
) {
  return shops
    .map(shop => ({
      ...shop,
      distance: getDistance(userLocation, {
        latitude: shop.latitude,
        longitude: shop.longitude
      }) / 1000 // Convert to km
    }))
    .sort((a, b) => a.distance - b.distance);
}
```

**Alternatives Considered**:
- PostGIS: Over-kill for simple distance calculations
- turf.js: Larger bundle size (~140KB), unnecessary features

---

## Decision 5: Testing Framework

**Context**: Need testing strategy for hooks and components

**Options Evaluated**:
1. Jest + React Testing Library (traditional React testing)
2. Vitest + React Testing Library (faster, better TypeScript support)
3. Playwright (E2E only)

**Decision**: **Vitest + React Testing Library** (with Playwright for E2E)

**Rationale**:
- Vitest: Faster than Jest (Vite-based), better TypeScript support
- React Testing Library: Standard for component testing, follows best practices
- Playwright: Already in use for E2E tests (follows existing project patterns)

**Test Coverage Targets**:
- Unit tests for hooks (`usePriceTracking`, `useFuzzyMatching`) - 80% coverage
- Component tests for UI (`PriceComparisonView`, `MatchConfirmationDialog`) - key interactions only
- E2E tests for critical flows (enable tracking → see results → confirm match)

**Implementation Pattern**:
```typescript
// __tests__/hooks/usePriceTracking.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { usePriceTracking } from '@/hooks/price-tracking/usePriceTracking';

describe('usePriceTracking', () => {
  it('enables tracking and fetches results', async () => {
    const { result } = renderHook(() => usePriceTracking('item-123'));

    act(() => {
      result.current.enableTracking();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
      expect(result.current.results).toHaveLength(3);
    });
  });
});
```

**Alternatives Considered**:
- Jest: Slower, less TypeScript support than Vitest
- Cypress (E2E): Playwright already in use, no need to switch

---

## Decision 6: Rate Limiting Strategy

**Context**: External API rate limits and cost control (from constraints)

**Options Evaluated**:
1. Redis-based rate limiting (upstash/ratelimit)
2. Supabase Edge Functions with in-memory limiting
3. Application-level throttling (p-queue)

**Decision**: **Application-level throttling with p-queue** + **Supabase Row-Level Security (RLS) for user limits**

**Rationale**:
- p-queue: Simple concurrency control, no additional infrastructure
- Supabase RLS: Database-level enforcement (max N tracking items per user)
- No Redis required for MVP (reduces complexity)
- Can upgrade to Redis later if needed

**Implementation Pattern**:
```typescript
import PQueue from 'p-queue';

const priceSearchQueue = new PQueue({ concurrency: 5 });

export async function searchAllSources(itemName: string) {
  const sources = [
    () => searchGoogleShopping(itemName),
    () => searchEbay(itemName),
    () => searchRetailer1(itemName),
  ];

  // Limit to 5 concurrent API calls
  const results = await Promise.allSettled(
    sources.map(fn => priceSearchQueue.add(fn))
  );

  return results;
}
```

**RLS Policy** (user tracking limits):
```sql
-- Limit users to 50 tracked items
CREATE POLICY user_tracking_limit ON price_tracking
  FOR INSERT TO authenticated
  USING (
    (SELECT COUNT(*) FROM price_tracking WHERE user_id = auth.uid()) < 50
  );
```

**Alternatives Considered**:
- Redis: Over-engineering for MVP, adds hosting cost
- Edge Function limiting: More complex deployment

---

## Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| Background Jobs | Vercel Cron | Native, free tier sufficient, simple |
| External APIs | SerpApi | Multi-source aggregator, structured data |
| Fuzzy Matching | pg_trgm + fuse.js | Built-in PostgreSQL, no new dependencies |
| Geolocation | geolib | Lightweight, simple API, sufficient |
| Testing | Vitest + RTL + Playwright | Fast, TypeScript-first, existing E2E |
| Rate Limiting | p-queue + Supabase RLS | Simple, database-enforced limits |

**Total New Dependencies**:
1. `serpapi` (npm package for API client)
2. `geolib` (distance calculations)
3. `p-queue` (concurrency control)
4. `vitest` + `@testing-library/react` (testing)

**No New Infrastructure**:
- Uses existing Supabase PostgreSQL (pg_trgm extension)
- Uses existing Vercel deployment (Cron)
- No Redis, no additional databases, no external queues

---

## Technical Risks & Mitigation

### Risk 1: External API Costs at Scale
**Impact**: High (could exceed $25k/month at full scale)
**Mitigation**:
- Implement aggressive caching (6-12 hour TTL)
- Smart batching (only check items with active alerts)
- Rate limit users to 50 tracked items initially
- Monitor API usage and costs daily

### Risk 2: 5-10 Second Response Time Target
**Impact**: Medium (affects user experience)
**Mitigation**:
- Parallel API calls (Promise.allSettled)
- Show partial results immediately as sources respond
- Loading skeleton with progressive disclosure
- Cache previous results during search

### Risk 3: Fuzzy Matching Accuracy
**Impact**: Medium (user frustration with incorrect matches)
**Mitigation**:
- Require user confirmation for similarity < 0.7
- Show product images in confirmation dialog
- Allow manual product URL entry as fallback
- Collect user feedback on match quality

### Risk 4: Background Job Failures
**Impact**: Medium (missed price drops, no alerts sent)
**Mitigation**:
- Implement retry logic with exponential backoff
- Dead letter queue for failed items
- Monitor job success rate (alert if < 95%)
- Manual trigger endpoint for debugging

---

## Next Steps

1. ✅ Decisions documented
2. → Phase 1: Create data-model.md with database schema
3. → Phase 1: Create API contracts (OpenAPI spec)
4. → Phase 1: Generate quickstart.md for implementation
