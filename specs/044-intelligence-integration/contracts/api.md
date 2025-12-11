# API Contracts: Intelligence Integration

**Feature**: 044-intelligence-integration
**Date**: 2025-12-11

## Overview

All API endpoints already exist from Features 042 and 043. This document references the existing contracts and notes the enhancement needed for fuzzy search.

---

## Existing Endpoints

### GET /api/catalog/brands/search

**Source**: `app/api/catalog/brands/search/route.ts`

**Purpose**: Search for brand names with fuzzy matching

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Search query (min 2 chars) |
| limit | number | No | 5 | Max results to return |

**Response** (200 OK):

```typescript
interface BrandSearchResponse {
  results: BrandSearchResult[];
  query: string;
  count: number;
}

interface BrandSearchResult {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  similarity: number;  // 0.0 - 1.0
}
```

**Example Request**:
```
GET /api/catalog/brands/search?q=hill&limit=5
```

**Example Response**:
```json
{
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Hilleberg",
      "logoUrl": null,
      "websiteUrl": "https://hilleberg.com",
      "similarity": 0.92
    }
  ],
  "query": "hill",
  "count": 1
}
```

**Enhancement Needed**: Current implementation uses `ILIKE` substring match. Should use `pg_trgm` `similarity()` for typo tolerance.

---

### Categories (Client-Side via Supabase)

Categories are fetched directly via Supabase client, not through a Next.js API route.

**Service**: `lib/supabase/categories.ts`

**Functions**:

| Function | Description |
|----------|-------------|
| `fetchCategories()` | Get all categories, sorted by level and label |
| `fetchCategoriesByLevel(level)` | Get categories at specific level |
| `fetchCategoriesByParent(parentId)` | Get child categories |
| `fetchCategoryById(id)` | Get single category by UUID |
| `fetchCategoryBySlug(slug)` | Get single category by slug |

**No API route needed**: Direct Supabase queries are sufficient for this read-only data.

---

## No New Endpoints

This feature does not introduce new API endpoints. All functionality is served by existing infrastructure.
