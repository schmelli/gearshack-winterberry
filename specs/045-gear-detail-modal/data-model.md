# Data Model: Gear Detail Modal with External Intelligence

**Feature**: 045-gear-detail-modal
**Date**: 2025-12-11

## Entities

### 1. GearItem (Existing)

The modal displays data from the existing `GearItem` entity. No modifications required.

**Reference**: `types/gear.ts`

```typescript
interface GearItem {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  primaryImageUrl: string | null;
  galleryImageUrls: string[];
  weightGrams: number | null;
  weightDisplayUnit: WeightUnit;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  pricePaid: number | null;
  currency: string | null;
  purchaseDate: Date | null;
  retailer: string | null;
  condition: GearCondition;
  status: GearStatus;
  notes: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  productTypeId: string | null;
  // ... additional fields
}
```

---

### 2. YouTubeVideo (New)

Represents a YouTube video search result for display in the carousel.

**Location**: `types/youtube.ts`

```typescript
interface YouTubeVideo {
  /** YouTube video ID (e.g., "dQw4w9WgXcQ") */
  videoId: string;
  /** Video title */
  title: string;
  /** Thumbnail URL (medium quality, 320x180) */
  thumbnailUrl: string;
  /** Channel name */
  channelTitle: string;
  /** Video publish date */
  publishedAt: string;
}

interface YouTubeSearchResponse {
  videos: YouTubeVideo[];
  /** Search query used */
  query: string;
  /** Total results available (may exceed returned count) */
  totalResults: number;
}
```

**Validation Rules**:
- `videoId`: Required, non-empty string
- `title`: Required, max 200 characters
- `thumbnailUrl`: Valid URL format
- `channelTitle`: Required

---

### 3. GearInsight (New)

Represents an insight from the GearGraph knowledge base.

**Location**: `types/geargraph.ts`

```typescript
type InsightType = 'seasonality' | 'weight_class' | 'compatibility' | 'category' | 'use_case';

interface GearInsight {
  /** Type of insight */
  type: InsightType;
  /** Human-readable label (e.g., "Winter Suitable", "Ultralight") */
  label: string;
  /** Confidence score 0-1 (optional, for ranked display) */
  confidence?: number;
  /** Related item IDs for compatibility insights */
  relatedIds?: string[];
}

interface GearInsightsResponse {
  insights: GearInsight[];
  /** Product type ID queried */
  productTypeId: string | null;
  /** Whether insights came from cache */
  cached: boolean;
}
```

**Insight Type Descriptions**:
- `seasonality`: Weather/season suitability (Spring, Summer, Fall, Winter)
- `weight_class`: Weight category (Ultralight, Lightweight, Standard, Heavy)
- `compatibility`: Works well with specific other gear
- `category`: Activity categories (Hiking, Camping, Climbing, etc.)
- `use_case`: Specific use scenarios

---

### 4. ApiCache (New)

Database table for caching external API responses.

**Location**: `types/database.ts` (add to Database interface)

```typescript
// Add to Database.public.Tables
api_cache: {
  Row: {
    id: string;
    service: 'youtube' | 'geargraph';
    cache_key: string;
    response_data: Json;
    created_at: string;
    expires_at: string;
  };
  Insert: {
    id?: string;
    service: 'youtube' | 'geargraph';
    cache_key: string;
    response_data: Json;
    created_at?: string;
    expires_at: string;
  };
  Update: {
    id?: string;
    service?: 'youtube' | 'geargraph';
    cache_key?: string;
    response_data?: Json;
    created_at?: string;
    expires_at?: string;
  };
  Relationships: [];
};
```

**Database Schema (SQL)**:

```sql
-- Migration: 20251211_api_cache_table.sql

CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('youtube', 'geargraph')),
  cache_key TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(service, cache_key)
);

-- Index for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_lookup
  ON api_cache(service, cache_key, expires_at);

-- Enable RLS
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (cache is shared across all users)
CREATE POLICY "api_cache_select" ON api_cache
  FOR SELECT USING (true);

-- Only authenticated users can insert/update (prevent abuse)
CREATE POLICY "api_cache_insert" ON api_cache
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "api_cache_update" ON api_cache
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Cleanup job hint (run periodically via cron or edge function)
-- DELETE FROM api_cache WHERE expires_at < NOW();
```

---

### 5. GearDetailModalState (New)

Client-side state for modal management.

**Location**: `types/gear-detail.ts` (or inline in hook)

```typescript
interface GearDetailModalState {
  /** Whether modal is open */
  isOpen: boolean;
  /** Currently selected gear item ID */
  gearId: string | null;
  /** Active tab in modal (if using tabs) */
  activeSection: 'details' | 'reviews' | 'insights';
}

interface GearDetailModalActions {
  /** Open modal for a specific gear item */
  open: (gearId: string) => void;
  /** Close modal */
  close: () => void;
  /** Set active section */
  setActiveSection: (section: GearDetailModalState['activeSection']) => void;
}
```

---

## Entity Relationships

```
┌─────────────────┐
│    GearItem     │ (existing)
│─────────────────│
│ id              │◄──────────────────────────────┐
│ brand           │───┐                           │
│ name            │───┼──► YouTube Search Query   │
│ categoryId      │───┤                           │
│ productTypeId   │───┼──► GearGraph Query        │
└─────────────────┘   │                           │
                      │                           │
                      ▼                           │
              ┌───────────────┐                   │
              │   ApiCache    │                   │
              │───────────────│                   │
              │ service       │                   │
              │ cache_key     │───► SHA256(query) │
              │ response_data │                   │
              │ expires_at    │                   │
              └───────────────┘                   │
                      │                           │
        ┌─────────────┴─────────────┐            │
        ▼                           ▼            │
┌───────────────────┐     ┌────────────────────┐│
│  YouTubeVideo[]   │     │  GearInsight[]     ││
│───────────────────│     │────────────────────││
│ videoId           │     │ type               ││
│ title             │     │ label              ││
│ thumbnailUrl      │     │ confidence         ││
│ channelTitle      │     │ relatedIds ────────┼┘
└───────────────────┘     └────────────────────┘
```

---

## State Transitions

### Modal State
```
CLOSED ──[open(gearId)]──► OPEN
  ▲                          │
  └───[close() | Escape]─────┘
```

### External Data Loading
```
IDLE ──[modal opens]──► LOADING ──[success]──► LOADED
                            │
                            └──[error]──► ERROR ──[retry]──► LOADING
```

### Cache State
```
MISS ──[fetch from API]──► CACHED (7 days)
                               │
                               └──[expires_at < NOW()]──► MISS
```
