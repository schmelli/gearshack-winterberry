# API Contract: Catalog Search Endpoints

**Feature**: 042-catalog-sync-api
**Date**: 2025-12-10

## Authentication

Search endpoints require standard Supabase authentication (user JWT).

---

## GET /api/catalog/brands/search

Fuzzy search for brands by name.

### Request

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Search query (min 1 char) |
| limit | number | No | 5 | Max results (1-20) |

**Example**:
```
GET /api/catalog/brands/search?q=hile&limit=5
```

### Response

**Success (200 OK)**:
```json
{
  "results": [
    {
      "id": "uuid-123",
      "name": "Hilleberg",
      "logo_url": "https://...",
      "website_url": "https://hilleberg.com",
      "similarity": 0.85
    }
  ],
  "query": "hile",
  "count": 1
}
```

**Empty Results (200 OK)**:
```json
{
  "results": [],
  "query": "xyz",
  "count": 0
}
```

**Validation Error (400)**:
```json
{
  "error": "Query parameter 'q' is required"
}
```

---

## GET /api/catalog/items/search

Fuzzy and/or semantic search for products.

### Request

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | Yes* | - | Text search query |
| embedding | string | No | - | Base64-encoded embedding for semantic search |
| mode | string | No | "fuzzy" | Search mode: "fuzzy", "semantic", "hybrid" |
| weight_text | number | No | 0.7 | Text weight for hybrid (0-1) |
| brand_id | uuid | No | - | Filter by brand |
| category | string | No | - | Filter by category |
| limit | number | No | 5 | Max results (1-20) |

*`q` required for "fuzzy" and "hybrid" modes; `embedding` required for "semantic" mode.

**Example (fuzzy)**:
```
GET /api/catalog/items/search?q=neoair&mode=fuzzy&limit=5
```

**Example (semantic)**:
```
GET /api/catalog/items/search?embedding=base64...&mode=semantic&limit=5
```

**Example (hybrid)**:
```
GET /api/catalog/items/search?q=ultralight+tent&embedding=base64...&mode=hybrid&weight_text=0.7
```

### Response

**Success (200 OK)**:
```json
{
  "results": [
    {
      "id": "uuid-789",
      "name": "NeoAir XLite NXT",
      "brand": {
        "id": "uuid-456",
        "name": "Therm-a-Rest"
      },
      "category": "Sleep System",
      "description": "Ultralight inflatable...",
      "specs_summary": "R-value 4.5, 340g",
      "score": 0.92
    }
  ],
  "query": "neoair",
  "mode": "fuzzy",
  "count": 1
}
```

---

## Client-Side Usage (Hooks)

### useBrandAutocomplete

```typescript
interface UseBrandAutocompleteOptions {
  debounceMs?: number;  // Default: 300
  minChars?: number;    // Default: 2
}

interface BrandSuggestion {
  id: string;
  name: string;
  logoUrl: string | null;
  similarity: number;
}

interface UseBrandAutocompleteReturn {
  suggestions: BrandSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}
```

### useCatalogSearch

```typescript
interface UseCatalogSearchOptions {
  mode?: 'fuzzy' | 'semantic' | 'hybrid';
  debounceMs?: number;
  limit?: number;
}

interface CatalogItem {
  id: string;
  name: string;
  brand: { id: string; name: string } | null;
  category: string | null;
  description: string | null;
  score: number;
}

interface UseCatalogSearchReturn {
  results: CatalogItem[];
  isLoading: boolean;
  error: string | null;
  search: (query: string, embedding?: number[]) => void;
  clear: () => void;
}
```

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Response time (p95) | < 200ms |
| Max concurrent searches | 100/user/minute |
| Result freshness | Real-time (no caching) |
