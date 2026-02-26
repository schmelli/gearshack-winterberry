# Price Discovery via GearGraph — Design

> **Status:** Approved
> **Date:** 2026-02-24
> **Branch:** development

## Goal

Automatically discover and display manufacturer prices and reseller prices for wishlist items. Prices are discovered by GearGraph (gearcrew-mastra), stored in MemGraph for long-term price history, and written back to Supabase for display in Gearshack.

## Problem

- `gear_items.manufacturer_price` is NULL for most items — even when `product_url` is stored
- Reseller prices are only available if pre-configured retailers happen to list the item
- No automatic price discovery happens when an item is created
- Users must manually navigate to the manufacturer site to see the price

## Architecture

```
Gearshack (Winterberry)              GearGraph (gearcrew-mastra)
─────────────────────────            ────────────────────────────
User creates gear item
  → gear_items saved (Supabase)
  → IF manufacturer_price IS NULL:
      POST /api/price-discovery ──→  Receives: { brand, name,
        (fire-and-forget)                         productUrl, gearItemId }
                                        ↓ async Mastra workflow
                                     Step 1: Scrape productUrl
                                       → manufacturer price + currency
                                     Step 2: Web-search "buy [brand] [name]"
                                       → up to 3 reseller URLs
                                       → scrape prices from each
                                     Step 3: Write PricePoint nodes
                                       → MemGraph (with timestamps)
                                     Step 4: Write-back to Supabase
                                       → gear_items.manufacturer_price
                                       → reseller_price_results (upsert)

Gearshack displays prices ←──────
(existing WishlistCard UI,
 no UI changes needed)
```

## GearGraph Infrastructure (existing, on geargraph.gearshack.app)

| Container | Role |
|-----------|------|
| `graph-gardener` (gearcrew-mastra) | Next.js + Mastra — runs workflows |
| `memgraph` | MemGraph graph database — stores PricePoint history |
| `firecrawl-api` + `firecrawl-worker` | Local Firecrawl instance for scraping |
| `firecrawl-playwright` | Puppeteer for JavaScript-heavy pages |
| `geargraph-api` (Python) | Read-only Cypher query endpoint |

Firecrawl tools already exist in gearcrew-mastra:
- `src/mastra/tools/firecrawl/web-search.ts` — web search + content extraction
- `src/mastra/tools/firecrawl/content-extractor.ts` — structured data extraction
- `src/mastra/tools/firecrawl/cache.ts` — result caching

## MemGraph Schema — PricePoint Nodes

Each price discovery run creates new `PricePoint` nodes (never updates existing ones — full history preserved):

```cypher
// GearItem node (created on first price discovery if not exists)
(:GearItem {
  gearshack_id: "uuid",
  brand: "Durston Gear",
  name: "X-Mid Pro 2"
})

// PricePoint node linked to GearItem
(:GearItem)-[:HAS_PRICE]->(:PricePoint {
  value: 599.95,
  currency: "USD",
  type: "manufacturer",           // or "reseller"
  reseller_name: null,            // set for reseller type
  source_url: "https://durstondesigns.com/...",
  discovered_at: datetime(),
  is_current: true                // false on subsequent discoveries
})
```

On refresh: existing `PricePoint` nodes with `is_current: true` are set to `false`, then new node with `is_current: true` is created. This builds an automatic price history over time.

## New Files — GearGraph (gearcrew-mastra)

| File | Purpose |
|------|---------|
| `src/mastra/workflows/price-discovery.ts` | New Mastra workflow: scrape + write to MemGraph + Supabase |
| `app/api/price-discovery/route.ts` | `POST` to trigger, `GET` for status |

### Workflow Steps

```typescript
// price-discovery.ts
async function priceDiscoveryWorkflow(params: {
  gearItemId: string;
  brand: string;
  name: string;
  productUrl: string | null;
  supabaseUrl: string;
  supabaseServiceKey: string;
}) {
  // Step 1: Manufacturer price (only if productUrl provided)
  const manufacturerPrice = productUrl
    ? await scrapeManufacturerPrice(productUrl)   // content-extractor
    : null;

  // Step 2: Reseller prices (web search → scrape up to 3)
  const query = `buy ${brand} ${name}`;
  const resellerResults = await findResellerPrices(query);  // web-search

  // Step 3: Write to MemGraph
  await upsertGearItemNode(brand, name, gearItemId);
  await createPricePoints(gearItemId, manufacturerPrice, resellerResults);

  // Step 4: Write-back to Supabase
  if (manufacturerPrice) {
    await updateSupabaseManufacturerPrice(gearItemId, manufacturerPrice);
  }
  for (const reseller of resellerResults) {
    await upsertSupabaseResellerPrice(gearItemId, reseller);
  }
}
```

### API Endpoint

```
POST /api/price-discovery
Authorization: Bearer {GEARGRAPH_API_KEY}
Body: { gearItemId, brand, name, productUrl }
→ 202 Accepted + { runId }

GET /api/price-discovery?runId=xxx
→ { status: "running" | "completed" | "failed", result? }
```

## Supabase Write-back

| Discovered | Supabase Target | Condition |
|-----------|-----------------|-----------|
| Manufacturer price | `gear_items.manufacturer_price` + `gear_items.manufacturer_currency` | Only if currently NULL — never overwrite user data |
| Reseller price | `reseller_price_results` (upsert by reseller_id + gear_item_id) | Always upsert with new price + timestamp |
| New reseller | `resellers` (insert) | Only if not already in table (match by domain) |

gearcrew-mastra calls Supabase REST API directly using `SUPABASE_SERVICE_ROLE_KEY` stored in its `.env`.

## New Files — Gearshack (Winterberry)

| File | Purpose |
|------|---------|
| `lib/geargraph/price-discovery-client.ts` | Client: POST to gearcrew-mastra, fire-and-forget |

### Trigger Point

After gear item is saved in the create/update API route:

```typescript
// app/api/gear/route.ts (or wherever items are created)
// After saving to Supabase:
if (!item.manufacturer_price) {
  // Fire-and-forget — do NOT await
  triggerPriceDiscovery({
    gearItemId: savedItem.id,
    brand: savedItem.brand ?? '',
    name: savedItem.name,
    productUrl: savedItem.product_url ?? null,
  }).catch(() => {/* non-blocking, log only */});
}
```

## Periodic Refresh

New scheduler entry in `gearcrew-mastra/src/lib/scheduler.ts`:

- Daily at 04:00 UTC
- Queries MemGraph for `GearItem` nodes where newest `PricePoint.discovered_at` > 7 days ago
- Triggers `price-discovery` workflow for each (rate-limited: 10 items/minute)
- Complements existing `morning-hygiene` and `gap-filling` schedules

## Error Handling

- Price scraping fails → log to audit logger, no Supabase update, retry next daily run
- Supabase write-back fails → log, MemGraph data is preserved (source of truth)
- Firecrawl local unhealthy → falls back to cloud API (already implemented in existing tools)
- GearGraph unreachable → Gearshack continues normally (fire-and-forget, no user impact)

## Success Criteria

- [ ] `gear_items.manufacturer_price` is populated within ~30s of item creation (if `product_url` exists)
- [ ] `reseller_price_results` has ≥1 entry per item within ~60s of creation
- [ ] MemGraph `PricePoint` nodes accumulate over time (price history)
- [ ] Stale prices (>7 days) are refreshed automatically
- [ ] No impact on Gearshack if GearGraph is unreachable
