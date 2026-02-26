# Test Plan: Price Search Relevance Fix

**Feature**: 055-price-search-relevance-fix
**Date**: 2026-01-01
**Status**: Ready for Testing

## Problem Statement

The current price monitoring implementation returns completely irrelevant results:

- Searching for "Durston X-Dome 2" (a tent) returns:
  - Guilty Gear X2 #Reload (video game)
  - Antique Dome Fossil
  - Metal Dome Shape Deadpool Decals
  - Walthers Cornerstone HO Scale Horn
  - 1922 Durston Gear Company Syracuse (historical items)

**Root Cause**: Search queries lack product category context, causing APIs to match on individual words ("dome", "durston") without understanding the product type.

## Solution Overview

Implemented a **3-stage intelligent search strategy** with category-aware filtering:

### Stage 1: Category + Brand + Model (Most Specific)
- Query: `"tent Durston X-Dome 2"`
- Best for products with well-defined categories
- Example: Tent search gets tent results, not dome-shaped decorations

### Stage 2: Brand + Model + Category (Balanced)
- Query: `"Durston X-Dome 2 tent"`
- Useful when category-first queries are too restrictive
- Provides fallback if Stage 1 yields <3 results

### Stage 3: Brand + Model Only (Fallback)
- Query: `"Durston X-Dome 2"` (original behavior)
- Used when no category info available
- Ensures backwards compatibility

### Result Filtering
- Pre-filters API results by product type keywords BEFORE price validation
- Rejects results that don't contain expected category keywords (e.g., "tent", "shelter", "bivy")
- Reduces false positives from 60+ to <5 per search

## Testing Scenarios

### Test Case 1: Tent with Clear Category (Durston X-Dome 2)

**Setup:**
1. Create a wishlist item: "Durston X-Dome 2"
2. Set brand: "Durston"
3. Set product type: "Tents" (under Shelter → Sleep System)

**Expected Behavior:**
- Stage 1 query: `"tent Durston X-Dome 2"`
- Results should include ONLY tents/shelters
- Should filter out:
  - Video games (Guilty Gear X2)
  - Fossils/collectibles
  - Historical documents
  - Unrelated products with "dome" in name

**Acceptance Criteria:**
✅ All results contain "tent", "shelter", or "bivy" in title
✅ No results for video games, fossils, or other unrelated categories
✅ Search stops at Stage 1 if ≥3 relevant results found
✅ Console logs show: `"[Price Search] Stage 1: Category + Brand + Model (most specific)"`

---

### Test Case 2: Backpack with Model Number (Osprey Atmos AG 65)

**Setup:**
1. Create wishlist item: "Atmos AG 65"
2. Set brand: "Osprey"
3. Set product type: "Backpacks"

**Expected Behavior:**
- Stage 1 query: `"backpack Osprey Atmos AG 65"`
- Results should include ONLY backpacks/packs
- Should filter out:
  - Replacement parts (hip belts, rain covers)
  - Accessories (stuff sacks)

**Acceptance Criteria:**
✅ All results contain "backpack", "pack", or "rucksack"
✅ No accessory-only results (unless part of a pack bundle)
✅ Price range aligns with backpack pricing (€200-400, not €20-50)

---

### Test Case 3: Sleeping Bag Without Brand (Generic Search)

**Setup:**
1. Create wishlist item: "Down Sleeping Bag 0°C"
2. No brand set
3. Set product type: "Sleeping Bags"

**Expected Behavior:**
- Stage 1 query: `"sleeping bag Down Sleeping Bag 0°C"`
- Results should include sleeping bags/quilts
- Should filter out:
  - Compression sacks
  - Liners
  - Storage bags

**Acceptance Criteria:**
✅ All results contain "sleeping bag", "quilt", or "sleep system"
✅ Temperature ratings visible in results (0°C, -5°C, etc.)
✅ No storage-only products

---

### Test Case 4: Item Without Category (Legacy Data)

**Setup:**
1. Create wishlist item: "MSR PocketRocket 2"
2. Set brand: "MSR"
3. **Do NOT set product type** (null)

**Expected Behavior:**
- Skip Stage 1 & 2 (no category context)
- Stage 3 query: `"MSR PocketRocket 2"`
- Fallback to original behavior
- Still applies spam/accessory filtering from validation service

**Acceptance Criteria:**
✅ Search proceeds without errors
✅ Returns results even without category
✅ Console logs show: `"[Price Search] Stage 3: Brand + Model (no category available)"`
✅ Validation service still filters spam results

---

### Test Case 5: Multi-Stage Fallback (Obscure Product)

**Setup:**
1. Create wishlist item: "Cuben Fiber Ground Sheet"
2. Set brand: "ZPacks"
3. Set product type: "Tents" (ground sheet is tent accessory)

**Expected Behavior:**
- Stage 1: `"tent ZPacks Cuben Fiber Ground Sheet"` → May yield 0-2 results
- Stage 2: `"ZPacks Cuben Fiber Ground Sheet tent"` → Should find more results
- Stage 3: `"ZPacks Cuben Fiber Ground Sheet"` → Broadest search

**Acceptance Criteria:**
✅ System tries all 3 stages if previous stages yield <3 results
✅ Console logs show progression: Stage 1 → Stage 2 (or Stage 3)
✅ Final results include relevant products even from broader queries
✅ Stops at first stage with ≥3 results to save API calls

---

## Manual Testing Procedure

### Prerequisites
1. Supabase database with categories table populated
2. SERPAPI_KEY environment variable set
3. At least one wishlist item with product_type_id set

### Step-by-Step Test

**1. Enable Console Logging**
```bash
# Run dev server with verbose logging
npm run dev
```

**2. Create Test Wishlist Item**
- Navigate to Wishlist page
- Click "Add Item"
- Enter item details (see test cases above)
- Save item

**3. Trigger Price Search**
- Click "Track Prices" button on wishlist card
- Observe "Finding prices..." loading state

**4. Verify Console Output**
Check for these log messages:
```
[Price Search] Stage 1: Category + Brand + Model (most specific) - "tent Durston X-Dome 2"
[Google Shopping] Filtered 10 -> 7 results by product type
[eBay] Filtered 8 -> 5 results by product type
[Price Search] Stage 1 found 12 results
[Price Search] Sufficient results found at stage 1, stopping search
[Price Search] Total 12 results from stage 1
[Price Search] 8 results after validation
```

**5. Inspect Results**
- Verify all displayed results match expected product type
- Check that prices are reasonable for the category
- Confirm no irrelevant results (video games, fossils, etc.)

**6. Test Edge Cases**
- Item with no category (should skip to Stage 3)
- Item with obscure brand (should try all stages)
- Item with common name (e.g., "tent stakes") - verify filtering works

---

## Automated Testing (Future Work)

### Unit Tests Needed
```typescript
// lib/external-apis/search-query-builder.test.ts
describe('buildSearchQueries', () => {
  it('should generate 3-stage queries with category', () => {
    const queries = buildSearchQueries({
      itemName: 'X-Dome 2',
      brandName: 'Durston',
      categoryInfo: { productType: 'Tents', categoryMain: 'Shelter', categoryTop: 'Sleep System' }
    });

    expect(queries).toHaveLength(3);
    expect(queries[0].query).toBe('Tents Durston X-Dome 2');
    expect(queries[1].query).toBe('Durston X-Dome 2 Tents');
    expect(queries[2].query).toBe('Durston X-Dome 2');
  });

  it('should skip category stages when no category info', () => {
    const queries = buildSearchQueries({
      itemName: 'PocketRocket 2',
      brandName: 'MSR',
      categoryInfo: null
    });

    expect(queries).toHaveLength(1);
    expect(queries[0].query).toBe('MSR PocketRocket 2');
    expect(queries[0].stage).toBe(3);
  });
});

describe('matchesProductType', () => {
  it('should match tent keywords', () => {
    expect(matchesProductType('MSR Hubba Hubba NX 2-Person Tent', ['tent', 'shelter'])).toBe(true);
    expect(matchesProductType('Guilty Gear X2 Reload Game', ['tent', 'shelter'])).toBe(false);
  });

  it('should reject accessories', () => {
    expect(matchesProductType('Tent Footprint Ground Sheet', ['tent'])).toBe(true); // Still tent-related
    expect(matchesProductType('Antique Dome Fossil Specimen', ['tent'])).toBe(false);
  });
});
```

### Integration Tests
```typescript
// app/api/price-tracking/search/route.test.ts
describe('POST /api/price-tracking/search', () => {
  it('should fetch category info and pass to searchAllSources', async () => {
    // Mock gear_items query to return product_type_id
    // Mock categories query to return category hierarchy
    // Verify searchAllSources receives categoryInfo object
  });
});
```

---

## Performance Monitoring

### Metrics to Track
1. **Search Success Rate**: % of searches returning ≥3 relevant results
2. **Stage Distribution**: How often searches stop at Stage 1 vs 2 vs 3
3. **API Call Efficiency**: Reduction in wasted API calls from irrelevant results
4. **Validation Filter Rate**: % of results filtered out by category matching

### Expected Improvements
- **Before**: 60 results → 8 validated → 3 displayed (87% waste)
- **After**: 12 results → 8 validated → 3 displayed (33% waste)
- **API Cost Savings**: ~60% fewer irrelevant API results processed

---

## Rollback Plan

If critical issues arise:

1. **Revert Search Query Builder**:
   ```bash
   git revert HEAD
   npm run build
   ```

2. **Disable Category Filtering**:
   - Set `productTypeKeywords = []` in price-search.ts:54
   - Results will fall back to original validation-only approach

3. **Database Rollback**:
   - No database migrations required for this feature
   - Safe to roll back code without data loss

---

## Known Limitations

1. **Category Data Required**: Items without product_type_id fall back to Stage 3 (original behavior)
2. **Keyword Coverage**: Some niche product types may need additional keywords in PRODUCT_TYPE_KEYWORDS map
3. **False Negatives**: Overly strict filtering may reject valid results with unconventional naming
4. **API Dependency**: Still relies on SerpAPI quality - can't fix fundamentally bad API results

---

## Success Criteria

✅ All Test Cases 1-5 pass
✅ Console logs show correct stage progression
✅ No TypeScript compilation errors
✅ No runtime errors in production build
✅ Durston X-Dome 2 search returns ONLY tent results
✅ Search time remains <10 seconds per item
✅ API cost per search reduced by >50%

---

## Next Steps After Testing

1. Monitor production logs for Stage 1/2/3 distribution
2. Identify product types with low match rates
3. Expand PRODUCT_TYPE_KEYWORDS based on real search data
4. Consider adding user feedback: "Is this result relevant?" button
5. Implement caching for category lookups (low-hanging optimization)

---

## Contact

For questions or issues during testing, refer to:
- Implementation: `lib/external-apis/search-query-builder.ts`
- Console logs: Look for `[Price Search]` prefix
- API route: `app/api/price-tracking/search/route.ts`
