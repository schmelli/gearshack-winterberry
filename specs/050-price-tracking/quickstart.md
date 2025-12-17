# Quickstart: Price Discovery & Monitoring Implementation

**Feature**: Price Discovery & Monitoring for Wishlist Items
**Date**: 2025-12-17
**Estimated Effort**: 3-4 weeks (full-stack, P1-P3 stories)

## Overview

This guide provides a step-by-step implementation roadmap following the Feature-Sliced Light architecture and constitution principles. Implementation follows priority order: P1 (core) → P2 (alerts + local) → P3 (community + monetization).

---

## Pre-Implementation Checklist

- [ ] Read `/specs/050-price-tracking/spec.md` (functional requirements)
- [ ] Read `/specs/050-price-tracking/research.md` (technology decisions)
- [ ] Read `/specs/050-price-tracking/data-model.md` (database schema)
- [ ] Review `/specs/050-price-tracking/contracts/api-spec.yaml` (API contracts)
- [ ] Verify environment variables configured (see Environment Setup below)

---

## Environment Setup

### Required Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SerpApi (price search)
SERPAPI_KEY=your-serpapi-key

# Vercel Cron (background jobs)
CRON_SECRET=random-secret-string

# Partner API (for retailers)
PARTNER_API_SECRET=random-secret-string
```

### Install New Dependencies

```bash
npm install serpapi geolib p-queue
npm install -D vitest @testing-library/react @testing-library/react-hooks
```

---

## Implementation Phases

### Phase 0: Database Setup

**Effort**: 1-2 days

#### Step 1: Run Supabase Migrations

```bash
cd supabase/migrations

# Create migration files (in order)
touch 20251217000001_enable_extensions.sql
touch 20251217000002_price_tracking_tables.sql
touch 20251217000003_partner_retailers.sql
touch 20251217000004_alerts.sql
touch 20251217000005_views_functions.sql
touch 20251217000006_rls_policies.sql
```

Copy SQL from `/specs/050-price-tracking/data-model.md` into each migration file.

#### Step 2: Apply Migrations

```bash
# Local development
npx supabase db push

# Production (via Supabase Dashboard)
# Copy-paste each migration file into SQL Editor → Run
```

#### Step 3: Seed Partner Retailers (Optional)

```bash
# supabase/seed.sql
INSERT INTO partner_retailers (name, website_url, api_key, api_secret_hash, rate_limit_per_hour, rate_limit_per_day)
VALUES
  ('Bergfreunde.de', 'https://www.bergfreunde.de', 'test-key-1', 'hashed-secret-1', 100, 1000),
  ('Bergzeit.de', 'https://www.bergzeit.de', 'test-key-2', 'hashed-secret-2', 100, 1000);
```

---

### Phase 1: Core Type Definitions

**Effort**: 1 day

#### Step 1: Create TypeScript Interfaces

File: `types/price-tracking.ts`

```typescript
// Core entities
export interface PriceTracking {
  id: string;
  userId: string;
  gearItemId: string;
  enabled: boolean;
  alertsEnabled: boolean;
  confirmedProductId?: string;
  matchConfidence?: number;
  manualProductUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
}

export interface PriceResult {
  id: string;
  trackingId: string;
  sourceType: 'google_shopping' | 'ebay' | 'retailer' | 'local_shop';
  sourceName: string;
  sourceUrl: string;
  priceAmount: number;
  priceCurrency: string;
  shippingCost?: number;
  totalPrice: number;
  productName: string;
  productImageUrl?: string;
  productCondition?: 'new' | 'used' | 'refurbished';
  isLocal: boolean;
  shopLatitude?: number;
  shopLongitude?: number;
  distanceKm?: number;
  fetchedAt: string;
  expiresAt: string;
}

export interface PersonalOffer {
  id: string;
  partnerRetailerId: string;
  userId: string;
  gearItemId: string;
  originalPrice: number;
  offerPrice: number;
  offerCurrency: string;
  savingsAmount: number;
  savingsPercent: number;
  productName: string;
  productUrl: string;
  productImageUrl?: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface AlertPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  priceDropEnabled: boolean;
  localShopEnabled: boolean;
  communityEnabled: boolean;
  personalOfferEnabled: boolean;
}

// Search & matching
export interface FuzzyMatch {
  productName: string;
  similarity: number;
  sourceName: string;
  sourceUrl: string;
  priceAmount: number;
}

export interface PriceSearchResults {
  trackingId: string;
  status: 'success' | 'partial' | 'error';
  results: PriceResult[];
  failedSources: Array<{ sourceName: string; error: string }>;
  fuzzyMatches?: FuzzyMatch[];
  searchedAt: string;
}

// State machine states
export type PriceSearchStatus = 'idle' | 'loading' | 'success' | 'partial' | 'error';
```

---

### Phase 2: External API Clients

**Effort**: 2-3 days

#### Step 1: SerpApi Integration

File: `lib/external-apis/serpapi-client.ts`

```typescript
import axios from 'axios';

const serpApiClient = axios.create({
  baseURL: 'https://serpapi.com',
  params: {
    api_key: process.env.SERPAPI_KEY,
  },
});

export async function searchGoogleShopping(query: string, location: string = 'Germany') {
  const response = await serpApiClient.get('/search', {
    params: {
      engine: 'google_shopping',
      q: query,
      location,
      num: 10,
    },
  });
  return response.data.shopping_results || [];
}

export async function searchEbay(query: string) {
  const response = await serpApiClient.get('/search', {
    params: {
      engine: 'ebay',
      _nkw: query,
    },
  });
  return response.data.organic_results || [];
}
```

#### Step 2: Price Search Orchestration

File: `lib/external-apis/price-search.ts`

```typescript
import { searchGoogleShopping, searchEbay } from './serpapi-client';
import PQueue from 'p-queue';
import type { PriceResult, PriceSearchResults } from '@/types/price-tracking';

const queue = new PQueue({ concurrency: 5 });

export async function searchAllSources(
  itemName: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<PriceSearchResults> {
  const sources = [
    { name: 'Google Shopping', fn: () => searchGoogleShopping(itemName) },
    { name: 'eBay', fn: () => searchEbay(itemName) },
    // Add retailer-specific searches here
  ];

  const results = await Promise.allSettled(
    sources.map(({ name, fn }) => queue.add(fn).catch(err => ({ error: name, message: err.message })))
  );

  const successResults: PriceResult[] = [];
  const failedSources: Array<{ sourceName: string; error: string }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      // Transform SerpApi results to PriceResult format
      successResults.push(...transformResults(result.value, sources[index].name));
    } else {
      failedSources.push({
        sourceName: sources[index].name,
        error: result.status === 'rejected' ? result.reason.message : result.value.message,
      });
    }
  });

  const status = failedSources.length === sources.length
    ? 'error'
    : failedSources.length > 0
    ? 'partial'
    : 'success';

  return {
    trackingId: '', // Will be set by caller
    status,
    results: successResults,
    failedSources,
    searchedAt: new Date().toISOString(),
  };
}

function transformResults(rawResults: any[], sourceName: string): PriceResult[] {
  // Transform SerpApi response to PriceResult format
  // Implementation depends on SerpApi response structure
  return rawResults.map(item => ({
    // Map fields appropriately
  }));
}
```

#### Step 3: Fuzzy Matching

File: `lib/supabase/fuzzy-matcher.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

export async function findFuzzyMatches(itemName: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('fuzzy_search_products', {
      search_term: itemName,
      threshold: 0.3,
    });

  if (error) throw error;

  // High confidence auto-match
  if (data[0]?.similarity > 0.7) {
    return {
      type: 'auto_match' as const,
      matches: [data[0]],
    };
  }

  // Ambiguous - requires confirmation
  return {
    type: 'requires_confirmation' as const,
    matches: data.slice(0, 5),
  };
}
```

---

### Phase 3: Custom Hooks (Business Logic)

**Effort**: 3-4 days

#### Step 1: Main Price Tracking Hook

File: `hooks/price-tracking/usePriceTracking.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PriceTracking } from '@/types/price-tracking';

export function usePriceTracking(gearItemId: string) {
  const [tracking, setTracking] = useState<PriceTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTracking() {
      const { data } = await supabase
        .from('price_tracking')
        .select('*')
        .eq('gear_item_id', gearItemId)
        .single();

      setTracking(data);
      setLoading(false);
    }

    fetchTracking();
  }, [gearItemId]);

  async function enableTracking() {
    const { data, error } = await supabase
      .from('price_tracking')
      .insert({
        gear_item_id: gearItemId,
        enabled: true,
        alerts_enabled: true,
      })
      .select()
      .single();

    if (error) throw error;
    setTracking(data);
  }

  async function disableTracking() {
    if (!tracking) return;

    await supabase
      .from('price_tracking')
      .delete()
      .eq('id', tracking.id);

    setTracking(null);
  }

  return {
    tracking,
    loading,
    isEnabled: !!tracking?.enabled,
    enableTracking,
    disableTracking,
  };
}
```

#### Step 2: Price Search Hook

File: `hooks/price-tracking/usePriceSearch.ts`

```typescript
'use client';

import { useState } from 'react';
import type { PriceSearchResults, PriceSearchStatus } from '@/types/price-tracking';

export function usePriceSearch(gearItemId: string) {
  const [status, setStatus] = useState<PriceSearchStatus>('idle');
  const [results, setResults] = useState<PriceSearchResults | null>(null);

  async function searchPrices(itemName: string) {
    setStatus('loading');

    try {
      const response = await fetch('/api/price-tracking/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gearItemId, itemName }),
      });

      const data = await response.json();
      setResults(data);
      setStatus(data.status === 'partial' ? 'partial' : 'success');
    } catch (error) {
      setStatus('error');
    }
  }

  return {
    status,
    results,
    searchPrices,
  };
}
```

---

### Phase 4: API Routes

**Effort**: 2-3 days

#### Step 1: Price Search Endpoint

File: `app/api/price-tracking/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchAllSources } from '@/lib/external-apis/price-search';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { gearItemId, itemName } = await request.json();

  // Verify user owns this gear item
  const { data: gearItem } = await supabase
    .from('gear_items')
    .select('id, user_id')
    .eq('id', gearItemId)
    .single();

  if (!gearItem) {
    return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
  }

  // Perform search
  const results = await searchAllSources(itemName);

  // Store results in database
  // ... (insert into price_results table)

  return NextResponse.json(results);
}
```

#### Step 2: Vercel Cron Endpoint

File: `app/api/cron/check-prices/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  // Fetch all active tracking items
  const { data: trackingItems } = await supabase
    .from('price_tracking')
    .select('*')
    .eq('enabled', true);

  // Process each item (batch in chunks of 100)
  for (const item of trackingItems || []) {
    // Fetch prices, compare with history, send alerts if needed
    // ... implementation
  }

  return NextResponse.json({ success: true, processed: trackingItems?.length || 0 });
}
```

---

### Phase 5: UI Components

**Effort**: 3-4 days

#### Step 1: Price Tracking Card

File: `components/wishlist/PriceTrackingCard.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePriceTracking } from '@/hooks/price-tracking/usePriceTracking';

interface Props {
  gearItemId: string;
}

export function PriceTrackingCard({ gearItemId }: Props) {
  const { isEnabled, loading, enableTracking, disableTracking } = usePriceTracking(gearItemId);

  if (loading) return <Card className="p-4">Loading...</Card>;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2">Price Tracking</h3>
      {isEnabled ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Tracking enabled. You'll receive alerts when prices drop.
          </p>
          <Button variant="outline" onClick={disableTracking}>
            Disable Tracking
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Track prices across retailers, eBay, and local shops.
          </p>
          <Button onClick={enableTracking}>Track Prices</Button>
        </>
      )}
    </Card>
  );
}
```

#### Step 2: Price Comparison View

File: `components/wishlist/PriceComparisonView.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PriceResult } from '@/types/price-tracking';

interface Props {
  results: PriceResult[];
  failedSources?: Array<{ sourceName: string; error: string }>;
}

export function PriceComparisonView({ results, failedSources }: Props) {
  // Sort: local shops first, then by price
  const sortedResults = [...results].sort((a, b) => {
    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;
    return a.totalPrice - b.totalPrice;
  });

  return (
    <div className="space-y-4">
      {failedSources?.map(({ sourceName, error }) => (
        <Card key={sourceName} className="p-4 border-yellow-500">
          <p className="text-sm text-yellow-600">
            ⚠️ {sourceName} unavailable - showing other results
          </p>
        </Card>
      ))}

      {sortedResults.map(result => (
        <Card key={result.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{result.sourceName}</h4>
              {result.isLocal && (
                <Badge variant="secondary" className="mt-1">
                  🌱 Local
                </Badge>
              )}
              <p className="text-2xl font-bold mt-2">
                {result.totalPrice.toFixed(2)} {result.priceCurrency}
              </p>
              {result.shippingCost && (
                <p className="text-sm text-muted-foreground">
                  + {result.shippingCost.toFixed(2)} shipping
                </p>
              )}
            </div>
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View Product →
            </a>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

### Phase 6: Testing

**Effort**: 2-3 days

#### Step 1: Hook Tests

File: `__tests__/hooks/price-tracking/usePriceTracking.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePriceTracking } from '@/hooks/price-tracking/usePriceTracking';

describe('usePriceTracking', () => {
  it('fetches tracking status on mount', async () => {
    const { result } = renderHook(() => usePriceTracking('item-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('enables tracking', async () => {
    const { result } = renderHook(() => usePriceTracking('item-123'));

    await act(async () => {
      await result.current.enableTracking();
    });

    expect(result.current.isEnabled).toBe(true);
  });
});
```

#### Step 2: Component Tests

File: `__tests__/components/wishlist/PriceComparisonView.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { PriceComparisonView } from '@/components/wishlist/PriceComparisonView';

describe('PriceComparisonView', () => {
  it('displays price results', () => {
    const results = [
      {
        id: '1',
        sourceName: 'Bergfreunde.de',
        totalPrice: 399.99,
        priceCurrency: 'EUR',
        isLocal: false,
        // ... other required fields
      },
    ];

    render(<PriceComparisonView results={results} />);
    expect(screen.getByText('Bergfreunde.de')).toBeInTheDocument();
    expect(screen.getByText(/399.99/)).toBeInTheDocument();
  });
});
```

---

## Deployment Checklist

- [ ] Run all migrations in production Supabase
- [ ] Verify RLS policies active
- [ ] Configure environment variables in Vercel
- [ ] Set up Vercel Cron job (`vercel.json`)
- [ ] Test partner API endpoint with test key
- [ ] Enable Supabase Realtime for push notifications
- [ ] Monitor SerpApi usage and costs
- [ ] Set up error tracking (Sentry/similar)

---

## Next Steps

1. ✅ Implementation plan complete
2. → Generate `/speckit.tasks` for task breakdown
3. → Begin implementation Phase 0 (database setup)
4. → Iterate through phases P1 → P2 → P3
