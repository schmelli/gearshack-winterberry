# Data Model: Global Gear Catalog

**Feature**: 042-catalog-sync-api
**Date**: 2025-12-10

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────────────┐
│   catalog_brands    │       │      catalog_items          │
├─────────────────────┤       ├─────────────────────────────┤
│ id (uuid) PK        │──────<│ id (uuid) PK                │
│ external_id (text)  │       │ external_id (text) UNIQUE   │
│ name (text)         │       │ brand_id (uuid) FK          │
│ name_normalized     │       │ name (text)                 │
│ logo_url (text)     │       │ name_normalized (text)      │
│ website_url (text)  │       │ category (text)             │
│ created_at          │       │ description (text)          │
│ updated_at          │       │ specs_summary (text)        │
│                     │       │ embedding vector(1536)      │
│ UNIQUE(external_id) │       │ created_at                  │
└─────────────────────┘       │ updated_at                  │
                              │                             │
                              │ UNIQUE(external_id)         │
                              └─────────────────────────────┘
```

## Table Definitions

### catalog_brands

Stores canonical brand/manufacturer data synced from external master database.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Internal unique identifier |
| external_id | text | NOT NULL, UNIQUE | ID from external source (Memgraph) for sync deduplication |
| name | text | NOT NULL | Brand display name (e.g., "Hilleberg") |
| name_normalized | text | GENERATED | Lowercase, trimmed for search (e.g., "hilleberg") |
| logo_url | text | NULL | URL to brand logo image |
| website_url | text | NULL | Brand official website |
| created_at | timestamptz | DEFAULT NOW() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_catalog_brands_external_id` on `external_id` (UNIQUE)
- `idx_catalog_brands_name_trgm` on `name_normalized` using GIN (gin_trgm_ops)

### catalog_items

Stores canonical product data with semantic embeddings for search.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Internal unique identifier |
| external_id | text | NOT NULL, UNIQUE | ID from external source for sync deduplication |
| brand_id | uuid | FK → catalog_brands.id, NULL | Reference to brand (nullable for unknown brands) |
| name | text | NOT NULL | Product display name (e.g., "NeoAir XLite NXT") |
| name_normalized | text | GENERATED | Lowercase, trimmed for search |
| category | text | NULL | Product category (e.g., "Shelter", "Sleep System") |
| description | text | NULL | Full product description |
| specs_summary | text | NULL | Brief specifications summary |
| embedding | vector(1536) | NULL | Semantic embedding for vector search |
| created_at | timestamptz | DEFAULT NOW() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_catalog_items_external_id` on `external_id` (UNIQUE)
- `idx_catalog_items_name_trgm` on `name_normalized` using GIN (gin_trgm_ops)
- `idx_catalog_items_embedding` on `embedding` using HNSW (vector_cosine_ops)
- `idx_catalog_items_brand_id` on `brand_id` (for JOIN performance)

## Generated Columns

Both tables use generated columns for normalized search:

```sql
name_normalized text GENERATED ALWAYS AS (lower(trim(name))) STORED
```

This ensures consistent lowercase comparison without runtime transformation.

## Row Level Security (RLS)

### catalog_brands

```sql
-- Enable RLS
ALTER TABLE catalog_brands ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read brands"
  ON catalog_brands FOR SELECT
  TO authenticated
  USING (true);

-- No insert/update/delete policies for normal users
-- Service role key bypasses RLS for sync operations
```

### catalog_items

```sql
-- Enable RLS
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read items"
  ON catalog_items FOR SELECT
  TO authenticated
  USING (true);

-- No insert/update/delete policies for normal users
```

## Validation Rules

### catalog_brands

| Field | Rule | Error Message |
|-------|------|---------------|
| external_id | Required, non-empty string | "external_id is required" |
| name | Required, 1-200 characters | "name must be 1-200 characters" |
| logo_url | Optional, valid URL if provided | "logo_url must be a valid URL" |
| website_url | Optional, valid URL if provided | "website_url must be a valid URL" |

### catalog_items

| Field | Rule | Error Message |
|-------|------|---------------|
| external_id | Required, non-empty string | "external_id is required" |
| name | Required, 1-500 characters | "name must be 1-500 characters" |
| brand_id | Optional, valid UUID if provided | "brand_id must be a valid UUID" |
| category | Optional, max 100 characters | "category must be max 100 characters" |
| description | Optional, max 5000 characters | "description must be max 5000 characters" |
| embedding | Optional, exactly 1536 dimensions if provided | "embedding must have 1536 dimensions" |

## State Transitions

These tables are append/update only with no soft-delete or complex state machine:

```
┌─────────┐     UPSERT      ┌─────────┐
│ (none)  │ ───────────────>│ EXISTS  │
└─────────┘                 └────┬────┘
                                 │
                                 │ UPSERT (same external_id)
                                 ▼
                            ┌─────────┐
                            │ UPDATED │
                            └─────────┘
```

- Records are created via sync API
- Records are updated via sync API (upsert on external_id)
- Records are NOT deleted (master data persists)

## Migration SQL

See `supabase/migrations/20251210_catalog_tables.sql` for complete migration including:
1. Extension enablement (pg_trgm, pgvector)
2. Table creation with generated columns
3. Index creation (trigram + HNSW)
4. RLS policies
