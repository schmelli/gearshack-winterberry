# Research: Intelligence Integration (Categories & Autocomplete)

**Feature**: 044-intelligence-integration
**Date**: 2025-12-11

## Executive Summary

This feature has **minimal research needs** because the core infrastructure was built in Features 042 (Catalog Sync API) and 043 (Ontology i18n Import). The primary research items are:

1. Understanding the existing implementation to avoid duplication
2. Determining how to implement true fuzzy/typo-tolerant search
3. Identifying the correct list of outdoor brands for the seed script

## Research Items

### R1: Existing Category Infrastructure

**Question**: What category-related code already exists?

**Findings**:

| Component | Location | Status |
|-----------|----------|--------|
| `useCategories` hook | `hooks/useCategories.ts` | Complete |
| `TaxonomySelect` component | `components/gear-editor/TaxonomySelect.tsx` | Complete |
| `fetchCategories` service | `lib/supabase/categories.ts` | Complete |
| `Category` types | `types/category.ts` | Complete |
| Category helpers | `lib/utils/category-helpers.ts` | Complete |

**Decision**: No new category code needed. Existing implementation satisfies all spec requirements (FR-001 through FR-005, FR-009).

---

### R2: Existing Brand Autocomplete Infrastructure

**Question**: What brand autocomplete code already exists?

**Findings**:

| Component | Location | Status |
|-----------|----------|--------|
| `useBrandAutocomplete` hook | `hooks/useBrandAutocomplete.ts` | Complete |
| Brand search API | `app/api/catalog/brands/search/route.ts` | Complete |
| `BrandSuggestion` types | `types/catalog.ts` | Complete |

**Gap Identified**: The API uses `ILIKE` (substring match) rather than true fuzzy search with Levenshtein distance. Per the clarification session, users expect typo-tolerant search (e.g., "Hillberg" → "Hilleberg").

**Decision**: Enhance the brand search API to use PostgreSQL's `pg_trgm` similarity function for true fuzzy matching.

---

### R3: Fuzzy Search Implementation Options

**Question**: How to implement typo-tolerant fuzzy search in Supabase/PostgreSQL?

**Options Evaluated**:

| Option | Pros | Cons |
|--------|------|------|
| A: ILIKE (current) | Simple, no extension needed | Not typo-tolerant |
| B: pg_trgm similarity() | True fuzzy match, handles typos | Requires extension (already enabled) |
| C: Levenshtein distance | Precise edit distance | Slower for large datasets |
| D: Full-text search | Powerful for multi-word | Overkill for single-word brand names |

**Decision**: Use `pg_trgm` `similarity()` function. It's already available in Supabase and provides good typo tolerance.

**Implementation**:
```sql
-- Fuzzy search using trigram similarity
SELECT id, name, logo_url, website_url,
       similarity(name_normalized, 'hillberg') AS score
FROM catalog_brands
WHERE similarity(name_normalized, 'hillberg') > 0.3
ORDER BY score DESC
LIMIT 5;
```

---

### R4: Brand Seed Data

**Question**: Which outdoor brands should be seeded for testing?

**Research Method**: Common brands from the outdoor gear industry, focusing on diversity across categories.

**Decision**: Seed the following 25 brands covering tents, packs, sleep systems, cooking, and apparel:

| Brand | Country | Category Focus |
|-------|---------|----------------|
| Hilleberg | Sweden | Tents |
| Big Agnes | USA | Tents, Sleep |
| MSR | USA | Tents, Cooking |
| Zpacks | USA | Ultralight |
| Gossamer Gear | USA | Ultralight |
| Hyperlite Mountain Gear | USA | Packs, Shelters |
| Tarptent | USA | Tents |
| Six Moon Designs | USA | Tents |
| Nemo Equipment | USA | Tents, Sleep |
| Sea to Summit | Australia | Accessories |
| Thermarest | USA | Sleep |
| Western Mountaineering | USA | Sleep |
| Enlightened Equipment | USA | Quilts |
| ULA Equipment | USA | Packs |
| Granite Gear | USA | Packs |
| Osprey | USA | Packs |
| Gregory | USA | Packs |
| Jetboil | USA | Cooking |
| Snow Peak | Japan | Cooking |
| Toaks | China | Cooking |
| Black Diamond | USA | Climbing, Poles |
| Petzl | France | Climbing, Lights |
| Patagonia | USA | Apparel |
| Arc'teryx | Canada | Apparel |
| Rab | UK | Apparel, Sleep |

---

### R5: Brand Autocomplete UI Integration

**Question**: Is the brand autocomplete wired into the gear editor form?

**Findings**: Need to check `GeneralInfoSection.tsx` to see if it uses `useBrandAutocomplete`.

**Action**: Verify during implementation. If not integrated, create a `BrandInput` component that wraps the autocomplete functionality.

---

## Resolved Clarifications

All "NEEDS CLARIFICATION" items from the Technical Context have been resolved:

1. **Category selection flexibility**: Users can select at any level (Main, Sub, or Type)
2. **Brand search strategy**: Fuzzy/typo-tolerant using pg_trgm similarity

## Next Steps

1. Create `scripts/seed-brands-sample.ts` with the 25 brands listed above
2. Enhance brand search API to use `similarity()` function
3. Verify brand autocomplete UI integration in gear editor
4. Run E2E verification of category cascading selection
