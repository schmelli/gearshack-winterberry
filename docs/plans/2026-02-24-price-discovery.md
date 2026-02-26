# Price Discovery via GearGraph — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically discover manufacturer prices and reseller prices for gear items by calling a new GearGraph workflow, storing history in MemGraph, and writing results back to Supabase.

**Architecture:** Gearshack sends a fire-and-forget POST to gearcrew-mastra's `/api/price-discovery` endpoint after saving a gear item. GearGraph runs a Mastra workflow that scrapes `product_url`, searches for resellers, writes `PricePoint` nodes to MemGraph, and writes-back to Supabase via REST API.

**Tech Stack:** Next.js 16 (Gearshack), Next.js + Mastra (gearcrew-mastra), MemGraph (neo4j-driver), Supabase REST API, Firecrawl local instance

**Design doc:** `docs/plans/2026-02-24-price-discovery-design.md`

---

## Context

Two repositories are involved:
- **Gearshack (this repo):** Add `lib/geargraph/price-discovery-client.ts` + trigger from `useSupabaseStore.ts`
- **gearcrew-mastra (on GearGraph server, path: `/opt/geargraph/gearcrew-mastra`):** Add workflow + API endpoint + scheduler entry

SSH access to GearGraph: `ssh root@geargraph.gearshack.app`
gearcrew-mastra container: `graph-gardener`
To run commands in container: `docker exec graph-gardener <cmd>`

---

## Task 1: Gearshack — Price Discovery Client

**Files:**
- Create: `lib/geargraph/price-discovery-client.ts`

**Step 1: Write the failing test**

Create `__tests__/unit/lib/geargraph/price-discovery-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Set env before importing module
process.env.GEARGRAPH_API_URL = 'https://geargraph.gearshack.app';
process.env.GEARGRAPH_API_KEY = 'test-key';

describe('triggerPriceDiscovery', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('POSTs to /api/price-discovery with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ runId: 'run-123' }) });

    const { triggerPriceDiscovery } = await import('@/lib/geargraph/price-discovery-client');

    await triggerPriceDiscovery({
      gearItemId: 'item-abc',
      brand: 'Durston Gear',
      name: 'X-Mid Pro 2',
      productUrl: 'https://durstondesigns.com/x-mid-pro-2',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://geargraph.gearshack.app/api/price-discovery');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toMatchObject({
      gearItemId: 'item-abc',
      brand: 'Durston Gear',
      name: 'X-Mid Pro 2',
      productUrl: 'https://durstondesigns.com/x-mid-pro-2',
    });
    expect(options.headers['Authorization']).toBe('Bearer test-key');
  });

  it('resolves without throwing if fetch fails (fire-and-forget)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { triggerPriceDiscovery } = await import('@/lib/geargraph/price-discovery-client');
    await expect(triggerPriceDiscovery({ gearItemId: 'x', brand: null, name: 'Y', productUrl: null })).resolves.toBeUndefined();
  });

  it('resolves without throwing if GearGraph returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    const { triggerPriceDiscovery } = await import('@/lib/geargraph/price-discovery-client');
    await expect(triggerPriceDiscovery({ gearItemId: 'x', brand: null, name: 'Y', productUrl: null })).resolves.toBeUndefined();
  });
});
```

**Step 2: Run test — verify it fails**

```bash
npm test -- __tests__/unit/lib/geargraph/price-discovery-client.test.ts
```

Expected: FAIL (module not found)

**Step 3: Create `lib/geargraph/price-discovery-client.ts`**

```typescript
/**
 * Price Discovery Client
 *
 * Fire-and-forget client for triggering price discovery in GearGraph (gearcrew-mastra).
 * Called after a gear item is saved to Supabase — never blocks the user operation.
 */

export interface PriceDiscoveryParams {
  gearItemId: string;
  brand: string | null;
  name: string;
  productUrl: string | null;
}

/**
 * Trigger async price discovery in GearGraph.
 * Never throws — errors are logged but do not affect the caller.
 */
export async function triggerPriceDiscovery(params: PriceDiscoveryParams): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_GEARGRAPH_API_URL ?? process.env.GEARGRAPH_API_URL;
  const apiKey = process.env.GEARGRAPH_API_KEY;

  if (!apiUrl || !apiKey) {
    console.warn('[PriceDiscovery] GEARGRAPH_API_URL or GEARGRAPH_API_KEY not configured — skipping');
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/api/price-discovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.warn(`[PriceDiscovery] GearGraph returned ${response.status} — price discovery skipped`);
    }
  } catch (error) {
    console.warn('[PriceDiscovery] Failed to trigger price discovery (non-blocking):', error);
  }
}
```

**Step 4: Run test — verify it passes**

```bash
npm test -- __tests__/unit/lib/geargraph/price-discovery-client.test.ts
```

Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add lib/geargraph/price-discovery-client.ts __tests__/unit/lib/geargraph/price-discovery-client.test.ts
git commit -m "feat(price-discovery): add fire-and-forget client for GearGraph"
```

---

## Task 2: Gearshack — Add Trigger to useSupabaseStore

**Files:**
- Modify: `hooks/useSupabaseStore.ts` (line ~125, after `gear_items.insert`)

**Step 1: Locate the addItem function**

In `hooks/useSupabaseStore.ts`, find the `addItem` method. After line 126 (`if (error) throw error;`), add the fire-and-forget trigger:

```typescript
// After: if (error) throw error;
// Add:
// Fire-and-forget price discovery (non-blocking)
if (!insertData.manufacturer_price) {
  triggerPriceDiscovery({
    gearItemId: id,
    brand: insertData.brand ?? null,
    name: insertData.name ?? '',
    productUrl: insertData.product_url ?? null,
  }).catch(() => {/* intentionally non-blocking */});
}
```

Also add the import at the top of the file:
```typescript
import { triggerPriceDiscovery } from '@/lib/geargraph/price-discovery-client';
```

**Step 2: Verify no TypeScript errors**

```bash
npm run build 2>&1 | head -50
```

Expected: Build succeeds (or only pre-existing errors)

**Step 3: Commit**

```bash
git add hooks/useSupabaseStore.ts
git commit -m "feat(price-discovery): trigger price discovery on gear item creation"
```

---

## Task 3: Gearshack — Add GEARGRAPH_API_KEY to .env.local template

**Files:**
- Modify: `.env.local.example` (or `.env.example` if that exists)

**Step 1: Add env var documentation**

Find the existing `.env.local.example` or similar template file. If it doesn't exist, skip creating one (no new files for one-time use). Instead, add a comment to the README or just add it to `.env.local` directly.

Add to `.env.local`:
```
NEXT_PUBLIC_GEARGRAPH_API_URL=https://geargraph.gearshack.app
GEARGRAPH_API_KEY=<ask schmelli for the key>
```

**Step 2: Verify the variable is loaded**

```bash
npm run dev
```

Check browser console — should not show `[PriceDiscovery] ... not configured` when adding a gear item.

**Step 3: Commit env template if file exists**

```bash
# Only if .env.local.example exists:
git add .env.local.example
git commit -m "docs: add GEARGRAPH_API_KEY env var documentation"
```

---

## Task 4: gearcrew-mastra — Price Discovery Workflow

> **SSH required:** `ssh root@geargraph.gearshack.app`
> **Working directory:** `/opt/geargraph/gearcrew-mastra/src/mastra/workflows/`

**Files:**
- Create: `src/mastra/workflows/price-discovery.ts`

**Step 1: Study existing gap-filling workflow for patterns**

```bash
ssh root@geargraph.gearshack.app "cat /opt/geargraph/gearcrew-mastra/src/mastra/workflows/gap-filling.ts"
```

**Step 2: Study existing Firecrawl tools**

```bash
ssh root@geargraph.gearshack.app "cat /opt/geargraph/gearcrew-mastra/src/mastra/tools/firecrawl/content-extractor.ts | head -80"
ssh root@geargraph.gearshack.app "cat /opt/geargraph/gearcrew-mastra/src/mastra/tools/firecrawl/web-search.ts | head -80"
```

**Step 3: Check MemGraph client availability**

```bash
ssh root@geargraph.gearshack.app "cat /opt/geargraph/gearcrew-mastra/package.json | grep -E 'neo4j|memgraph|bolt'"
ssh root@geargraph.gearshack.app "ls /opt/geargraph/gearcrew-mastra/src/lib/"
```

**Step 4: Create `src/mastra/workflows/price-discovery.ts`**

The workflow structure (adapt to actual Mastra API found in gap-filling.ts):

```typescript
/**
 * Price Discovery Workflow
 *
 * Triggered by Gearshack when a gear item is created without manufacturer_price.
 * 1. Scrapes product_url for manufacturer price
 * 2. Web-searches for reseller prices (up to 3)
 * 3. Writes PricePoint nodes to MemGraph (price history)
 * 4. Writes-back to Supabase (gear_items + reseller_price_results)
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Input schema
const PriceDiscoveryInput = z.object({
  gearItemId: z.string(),
  brand: z.string().nullable(),
  name: z.string(),
  productUrl: z.string().nullable(),
  supabaseUrl: z.string(),
  supabaseServiceKey: z.string(),
});

// ─── Step 1: Scrape Manufacturer Price ───────────────────────────────────────

const scrapeManufacturerPrice = createStep({
  id: 'scrape-manufacturer-price',
  inputSchema: PriceDiscoveryInput,
  outputSchema: z.object({
    manufacturerPrice: z.number().nullable(),
    currency: z.string().nullable(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData.productUrl) {
      return { manufacturerPrice: null, currency: null };
    }
    try {
      // Use existing content-extractor tool
      const { extractContent } = await import('../tools/firecrawl/content-extractor');
      const result = await extractContent(inputData.productUrl, {
        schema: {
          price: 'number | null — current product price',
          currency: 'string | null — ISO 4217 currency code',
        },
      });
      return {
        manufacturerPrice: result?.price ?? null,
        currency: result?.currency ?? null,
      };
    } catch (error) {
      mastra?.logger?.warn('[PriceDiscovery] Manufacturer scrape failed:', error);
      return { manufacturerPrice: null, currency: null };
    }
  },
});

// ─── Step 2: Search Reseller Prices ──────────────────────────────────────────

const searchResellerPrices = createStep({
  id: 'search-reseller-prices',
  inputSchema: PriceDiscoveryInput,
  outputSchema: z.object({
    resellers: z.array(z.object({
      name: z.string(),
      url: z.string(),
      price: z.number(),
      currency: z.string(),
    })),
  }),
  execute: async ({ inputData, mastra }) => {
    try {
      const { webSearch } = await import('../tools/firecrawl/web-search');
      const query = `buy ${inputData.brand ?? ''} ${inputData.name} outdoor gear`;
      const results = await webSearch(query, { maxResults: 5 });

      // Extract prices from top 3 results
      const { extractContent } = await import('../tools/firecrawl/content-extractor');
      const resellers = [];

      for (const result of results.slice(0, 3)) {
        try {
          const data = await extractContent(result.url, {
            schema: {
              price: 'number | null — product price on this page',
              currency: 'string | null — ISO 4217 currency code',
              storeName: 'string | null — name of the online store',
            },
          });
          if (data?.price) {
            resellers.push({
              name: data.storeName ?? new URL(result.url).hostname,
              url: result.url,
              price: data.price,
              currency: data.currency ?? 'USD',
            });
          }
        } catch {
          // Skip this reseller if scraping fails
        }
      }

      return { resellers };
    } catch (error) {
      mastra?.logger?.warn('[PriceDiscovery] Reseller search failed:', error);
      return { resellers: [] };
    }
  },
});

// ─── Step 3: Write to MemGraph ────────────────────────────────────────────────

const writeToMemGraph = createStep({
  id: 'write-to-memgraph',
  inputSchema: z.object({
    gearItemId: z.string(),
    brand: z.string().nullable(),
    name: z.string(),
    productUrl: z.string().nullable(),
    manufacturerPrice: z.number().nullable(),
    currency: z.string().nullable(),
    resellers: z.array(z.object({
      name: z.string(),
      url: z.string(),
      price: z.number(),
      currency: z.string(),
    })),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, mastra }) => {
    try {
      // Import MemGraph client (neo4j-driver bolt protocol)
      const neo4j = await import('neo4j-driver');
      const driver = neo4j.default.driver(
        process.env.MEMGRAPH_BOLT_URL ?? 'bolt://memgraph:7687',
        neo4j.default.auth.basic(
          process.env.MEMGRAPH_USER ?? '',
          process.env.MEMGRAPH_PASSWORD ?? ''
        )
      );
      const session = driver.session();

      try {
        // Upsert GearItem node
        await session.run(
          `MERGE (g:GearItem {gearshack_id: $id})
           SET g.brand = $brand, g.name = $name`,
          { id: inputData.gearItemId, brand: inputData.brand, name: inputData.name }
        );

        // Mark existing PricePoints as not current
        await session.run(
          `MATCH (g:GearItem {gearshack_id: $id})-[:HAS_PRICE]->(p:PricePoint {is_current: true})
           SET p.is_current = false`,
          { id: inputData.gearItemId }
        );

        // Create manufacturer PricePoint
        if (inputData.manufacturerPrice !== null) {
          await session.run(
            `MATCH (g:GearItem {gearshack_id: $id})
             CREATE (g)-[:HAS_PRICE]->(:PricePoint {
               value: $price, currency: $currency, type: 'manufacturer',
               reseller_name: null, source_url: $url,
               discovered_at: datetime(), is_current: true
             })`,
            {
              id: inputData.gearItemId,
              price: inputData.manufacturerPrice,
              currency: inputData.currency ?? 'USD',
              url: inputData.productUrl,
            }
          );
        }

        // Create reseller PricePoints
        for (const reseller of inputData.resellers) {
          await session.run(
            `MATCH (g:GearItem {gearshack_id: $id})
             CREATE (g)-[:HAS_PRICE]->(:PricePoint {
               value: $price, currency: $currency, type: 'reseller',
               reseller_name: $name, source_url: $url,
               discovered_at: datetime(), is_current: true
             })`,
            {
              id: inputData.gearItemId,
              price: reseller.price,
              currency: reseller.currency,
              name: reseller.name,
              url: reseller.url,
            }
          );
        }
      } finally {
        await session.close();
        await driver.close();
      }

      return { success: true };
    } catch (error) {
      mastra?.logger?.error('[PriceDiscovery] MemGraph write failed:', error);
      return { success: false };
    }
  },
});

// ─── Step 4: Write-back to Supabase ──────────────────────────────────────────

const writeBackToSupabase = createStep({
  id: 'write-back-to-supabase',
  inputSchema: z.object({
    gearItemId: z.string(),
    supabaseUrl: z.string(),
    supabaseServiceKey: z.string(),
    manufacturerPrice: z.number().nullable(),
    currency: z.string().nullable(),
    resellers: z.array(z.object({
      name: z.string(),
      url: z.string(),
      price: z.number(),
      currency: z.string(),
    })),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ inputData, mastra }) => {
    const headers = {
      'Content-Type': 'application/json',
      apikey: inputData.supabaseServiceKey,
      Authorization: `Bearer ${inputData.supabaseServiceKey}`,
      Prefer: 'return=minimal',
    };

    // Update manufacturer price only if currently NULL
    if (inputData.manufacturerPrice !== null) {
      try {
        const res = await fetch(
          `${inputData.supabaseUrl}/rest/v1/gear_items?id=eq.${inputData.gearItemId}&manufacturer_price=is.null`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              manufacturer_price: inputData.manufacturerPrice,
              manufacturer_currency: inputData.currency ?? 'USD',
            }),
          }
        );
        if (!res.ok) {
          mastra?.logger?.warn('[PriceDiscovery] Supabase gear_items update failed:', res.status);
        }
      } catch (error) {
        mastra?.logger?.warn('[PriceDiscovery] Supabase manufacturer price update error:', error);
      }
    }

    // Upsert reseller prices
    for (const reseller of inputData.resellers) {
      try {
        // Upsert reseller by domain
        const domain = new URL(reseller.url).hostname;
        const upsertRes = await fetch(
          `${inputData.supabaseUrl}/rest/v1/resellers`,
          {
            method: 'POST',
            headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify({
              name: reseller.name,
              website_url: `https://${domain}`,
              is_active: true,
            }),
          }
        );
        if (!upsertRes.ok) {
          mastra?.logger?.warn('[PriceDiscovery] Reseller upsert failed:', upsertRes.status);
          continue;
        }

        const upserted = await upsertRes.json();
        const resellerId = Array.isArray(upserted) ? upserted[0]?.id : upserted?.id;
        if (!resellerId) continue;

        // Upsert reseller_price_results
        await fetch(
          `${inputData.supabaseUrl}/rest/v1/reseller_price_results`,
          {
            method: 'POST',
            headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({
              gear_item_id: inputData.gearItemId,
              reseller_id: resellerId,
              price_amount: reseller.price,
              price_currency: reseller.currency,
              product_url: reseller.url,
              in_stock: true,
              fetched_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }),
          }
        );
      } catch (error) {
        mastra?.logger?.warn('[PriceDiscovery] Supabase reseller price upsert error:', error);
      }
    }

    return { success: true };
  },
});

// ─── Workflow Definition ──────────────────────────────────────────────────────

export const priceDiscoveryWorkflow = createWorkflow({
  id: 'price-discovery',
  inputSchema: PriceDiscoveryInput,
  outputSchema: z.object({ success: z.boolean() }),
})
  .then(scrapeManufacturerPrice)
  .then(searchResellerPrices)
  .then(writeToMemGraph)
  .then(writeBackToSupabase)
  .commit();
```

**Step 5: Register workflow in Mastra index**

Find the Mastra index file (likely `src/mastra/index.ts`) and add the workflow:

```typescript
import { priceDiscoveryWorkflow } from './workflows/price-discovery';

// Add to workflows array:
workflows: [
  // ... existing workflows ...
  priceDiscoveryWorkflow,
],
```

**Step 6: Build to verify no TypeScript errors**

```bash
ssh root@geargraph.gearshack.app "cd /opt/geargraph/gearcrew-mastra && docker exec graph-gardener npm run build 2>&1 | tail -20"
```

Expected: Build succeeds

**Step 7: Commit (on GearGraph server)**

```bash
ssh root@geargraph.gearshack.app "cd /opt/geargraph/gearcrew-mastra && git add src/mastra/workflows/price-discovery.ts src/mastra/index.ts && git commit -m 'feat(price-discovery): add Mastra price discovery workflow'"
```

---

## Task 5: gearcrew-mastra — Price Discovery API Endpoint

**Files:**
- Create: `app/api/price-discovery/route.ts`

**Step 1: Study existing enrichment endpoint for patterns**

```bash
ssh root@geargraph.gearshack.app "cat /opt/geargraph/gearcrew-mastra/app/api/enrichment/route.ts"
```

**Step 2: Create `app/api/price-discovery/route.ts`**

```typescript
/**
 * Price Discovery API Endpoint
 *
 * POST /api/price-discovery
 *   Triggers the price-discovery Mastra workflow (async).
 *   Returns 202 Accepted with runId.
 *
 * GET /api/price-discovery?runId=xxx
 *   Returns workflow run status.
 *
 * Authorization: Bearer {GEARGRAPH_API_KEY}
 */

import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';

const API_KEY = process.env.GEARGRAPH_API_KEY;

function authenticate(request: NextRequest): boolean {
  const auth = request.headers.get('Authorization');
  return !!API_KEY && auth === `Bearer ${API_KEY}`;
}

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { gearItemId, brand, name, productUrl } = body as {
    gearItemId?: string;
    brand?: string | null;
    name?: string;
    productUrl?: string | null;
  };

  if (!gearItemId || !name) {
    return NextResponse.json({ error: 'gearItemId and name are required' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[PriceDiscovery] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const workflow = mastra.getWorkflow('price-discovery');
    const run = await workflow.createRun();

    // Start async — do not await
    run.start({
      inputData: {
        gearItemId,
        brand: brand ?? null,
        name,
        productUrl: productUrl ?? null,
        supabaseUrl,
        supabaseServiceKey,
      },
    }).catch((error: unknown) => {
      console.error(`[PriceDiscovery] Workflow run ${run.runId} failed:`, error);
    });

    return NextResponse.json({ runId: run.runId }, { status: 202 });
  } catch (error) {
    console.error('[PriceDiscovery] Failed to create workflow run:', error);
    return NextResponse.json({ error: 'Failed to start price discovery' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  try {
    const workflow = mastra.getWorkflow('price-discovery');
    const run = await workflow.getRun(runId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({ status: run.status, result: run.result ?? null });
  } catch (error) {
    console.error('[PriceDiscovery] Failed to get run status:', error);
    return NextResponse.json({ error: 'Failed to get run status' }, { status: 500 });
  }
}
```

**Step 3: Build to verify**

```bash
ssh root@geargraph.gearshack.app "cd /opt/geargraph/gearcrew-mastra && docker exec graph-gardener npm run build 2>&1 | tail -20"
```

**Step 4: Commit**

```bash
ssh root@geargraph.gearshack.app "cd /opt/geargraph/gearcrew-mastra && git add app/api/price-discovery/route.ts && git commit -m 'feat(price-discovery): add POST/GET API endpoint'"
```

---

## Task 6: gearcrew-mastra — Scheduler Entry for Daily Refresh

**Files:**
- Modify: `src/lib/scheduler.ts`

**Step 1: Read the scheduler to understand its structure**

```bash
ssh root@geargraph.gearshack.app "cat /opt/geargraph/gearcrew-mastra/src/lib/scheduler.ts"
```

**Step 2: Add daily price refresh schedule**

Add to the scheduler (adapt to actual structure found in Step 1):

```typescript
// Daily price refresh: 04:00 UTC
// Re-discovers prices for items where last PricePoint is older than 7 days
{
  name: 'price-discovery-refresh',
  cron: '0 4 * * *', // daily at 04:00 UTC
  handler: async () => {
    const logger = console; // or use existing logger
    logger.info('[Scheduler] Starting daily price refresh');

    try {
      // Query MemGraph for stale GearItems (last price > 7 days ago)
      const neo4j = await import('neo4j-driver');
      const driver = neo4j.default.driver(
        process.env.MEMGRAPH_BOLT_URL ?? 'bolt://memgraph:7687',
        neo4j.default.auth.basic(
          process.env.MEMGRAPH_USER ?? '',
          process.env.MEMGRAPH_PASSWORD ?? ''
        )
      );
      const session = driver.session();

      const result = await session.run(
        `MATCH (g:GearItem)-[:HAS_PRICE]->(p:PricePoint {is_current: true})
         WHERE p.discovered_at < datetime() - duration('P7D')
         RETURN g.gearshack_id AS id, g.brand AS brand, g.name AS name
         LIMIT 100`
      );

      await session.close();
      await driver.close();

      const staleItems = result.records.map((r) => ({
        gearItemId: r.get('id'),
        brand: r.get('brand'),
        name: r.get('name'),
      }));

      logger.info(`[Scheduler] Found ${staleItems.length} stale items to refresh`);

      // Trigger price discovery for each (rate-limited to 10/minute)
      const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      const workflow = mastra.getWorkflow('price-discovery');

      for (let i = 0; i < staleItems.length; i++) {
        const item = staleItems[i];
        if (i > 0 && i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 60_000)); // 1 min pause
        }
        const run = await workflow.createRun();
        run.start({
          inputData: {
            gearItemId: item.gearItemId,
            brand: item.brand,
            name: item.name,
            productUrl: null, // No URL stored in MemGraph — skip manufacturer scrape
            supabaseUrl,
            supabaseServiceKey,
          },
        }).catch((err: unknown) => {
          logger.warn(`[Scheduler] Price refresh failed for ${item.gearItemId}:`, err);
        });
      }
    } catch (error) {
      logger.error('[Scheduler] Daily price refresh failed:', error);
    }
  },
},
```

**Step 3: Build to verify**

```bash
ssh root@geargraph.gearshack.app "cd /opt/geargraph/gearcrew-mastra && docker exec graph-gardener npm run build 2>&1 | tail -20"
```

**Step 4: Commit**

```bash
ssh root@geargraph.gearshack.app "cd /opt/geargraph/gearcrew-mastra && git add src/lib/scheduler.ts && git commit -m 'feat(price-discovery): add daily 04:00 UTC refresh scheduler'"
```

---

## Task 7: gearcrew-mastra — Deploy and Smoke Test

**Step 1: Deploy the updated container**

```bash
ssh root@geargraph.gearshack.app "cd /opt/geargraph && docker compose pull graph-gardener && docker compose up -d graph-gardener"
```

Wait ~30s for startup, then verify:

```bash
ssh root@geargraph.gearshack.app "docker logs graph-gardener --tail 20"
```

Expected: No errors, service started successfully.

**Step 2: Smoke test the endpoint**

```bash
ssh root@geargraph.gearshack.app "curl -s -X POST https://geargraph.gearshack.app/api/price-discovery \
  -H 'Authorization: Bearer <GEARGRAPH_API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{\"gearItemId\": \"test-smoke-$(date +%s)\", \"brand\": \"Durston Gear\", \"name\": \"X-Mid Pro 2\", \"productUrl\": \"https://durstondesigns.com/products/x-mid-pro-2\"}'"
```

Expected: `{"runId":"<some-uuid>"}` with HTTP 202

**Step 3: Check run status after 60s**

```bash
# Replace <runId> with value from Step 2
ssh root@geargraph.gearshack.app "curl -s 'https://geargraph.gearshack.app/api/price-discovery?runId=<runId>' \
  -H 'Authorization: Bearer <GEARGRAPH_API_KEY>'"
```

Expected: `{"status":"completed","result":{"success":true}}` or at minimum no crash.

---

## Task 8: Gearshack — End-to-End Verification

**Step 1: Set env vars in .env.local (if not done in Task 3)**

```
NEXT_PUBLIC_GEARGRAPH_API_URL=https://geargraph.gearshack.app
GEARGRAPH_API_KEY=<key from schmelli>
```

**Step 2: Create a test wishlist item with product_url**

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Add new gear item with `product_url = https://durstondesigns.com/products/x-mid-pro-2`
4. Check browser console — should see NO `[PriceDiscovery]` warnings

**Step 3: Verify Supabase write-back after ~60s**

In Supabase dashboard (or via `psql`):
```sql
SELECT id, name, manufacturer_price, manufacturer_currency
FROM gear_items
WHERE name ILIKE '%X-Mid Pro 2%'
ORDER BY created_at DESC LIMIT 3;
```

Expected: `manufacturer_price` is now populated (e.g. 599.95)

```sql
SELECT r.name, rpr.price_amount, rpr.price_currency, rpr.fetched_at
FROM reseller_price_results rpr
JOIN resellers r ON r.id = rpr.reseller_id
WHERE rpr.gear_item_id = '<the-item-id>'
ORDER BY rpr.fetched_at DESC;
```

Expected: At least 1 reseller price row.

**Step 4: Verify MemGraph price history**

```bash
ssh root@geargraph.gearshack.app "docker exec memgraph mgclient --host localhost --port 7687 \
  --execute \"MATCH (g:GearItem)-[:HAS_PRICE]->(p:PricePoint) RETURN g.name, p.type, p.value, p.currency, p.is_current LIMIT 10;\""
```

Expected: PricePoint nodes with `is_current: true` for the test item.

---

## Task 9: Final Cleanup and Push (Gearshack)

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (no regressions)

**Step 2: Run lint**

```bash
npm run lint
```

Expected: No new errors

**Step 3: Push Gearshack changes**

```bash
git push origin development
```

---

## Success Criteria Checklist

- [ ] `lib/geargraph/price-discovery-client.ts` created + 3 tests passing
- [ ] `useSupabaseStore.ts` triggers price discovery on item creation (non-blocking)
- [ ] `GEARGRAPH_API_KEY` env var configured in `.env.local`
- [ ] gearcrew-mastra: `price-discovery` workflow created + registered
- [ ] gearcrew-mastra: `/api/price-discovery` POST + GET endpoint responds correctly
- [ ] gearcrew-mastra: Daily refresh scheduler entry added
- [ ] End-to-end: `gear_items.manufacturer_price` populated within ~60s of item creation
- [ ] End-to-end: `reseller_price_results` has ≥1 row within ~90s
- [ ] End-to-end: MemGraph has `PricePoint` nodes accumulating
- [ ] No Gearshack functionality broken if GearGraph is unreachable
