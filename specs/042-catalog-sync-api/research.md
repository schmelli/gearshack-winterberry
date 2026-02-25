# Research: Global Gear Catalog & Sync API

**Feature**: 042-catalog-sync-api
**Date**: 2025-12-10

## Technology Decisions

### 1. PostgreSQL Extensions for Search

**Decision**: Use `pg_trgm` for fuzzy text search and `pgvector` for semantic search

**Rationale**:
- `pg_trgm` provides trigram-based similarity matching out-of-the-box with PostgreSQL
- Supports `%` (similarity) and `<->` (distance) operators for fuzzy matching
- GIN index on trigrams enables sub-200ms queries even at 100k+ scale
- `pgvector` is the standard PostgreSQL extension for vector embeddings
- HNSW index type recommended for 1536-dimension vectors (better recall than IVFFlat)

**Alternatives Considered**:
- Elasticsearch: Overkill for this use case, adds operational complexity
- Meilisearch: Separate service to maintain, Supabase already has PostgreSQL
- pg_search (full-text): Good for linguistic search but doesn't handle typos as well as trigrams

### 2. Vector Index Type

**Decision**: Use HNSW (Hierarchical Navigable Small World) index for pgvector

**Rationale**:
- Better query performance than IVFFlat at scale
- Higher recall accuracy (fewer missed relevant results)
- Suitable for 1536-dimension embeddings
- Supabase supports HNSW natively with pgvector 0.5+

**Alternatives Considered**:
- IVFFlat: Faster to build, but lower recall and requires more tuning
- No index: Not viable for 100k+ vectors (would be too slow)

### 3. API Authentication

**Decision**: Supabase Service Role Key via Authorization header

**Rationale**:
- Leverages existing Supabase infrastructure
- Bypasses Row Level Security (RLS) for admin operations
- No additional secret management infrastructure needed
- Standard pattern for server-to-server Supabase communication

**Implementation**:
```typescript
// Validate in API route
const authHeader = request.headers.get('Authorization');
if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 4. Autocomplete Debouncing Strategy

**Decision**: 300ms debounce on client, server returns up to 5 results

**Rationale**:
- 300ms is standard UX balance between responsiveness and server load
- Prevents excessive queries during fast typing
- 5 results keeps response payload small and UI clean
- Client-side debounce using existing patterns (useDebouncedValue or lodash.debounce)

### 5. Hybrid Search Weighting

**Decision**: Default 70% text similarity / 30% semantic similarity for hybrid search

**Rationale**:
- Text similarity (trigram) is more predictable and user-expected
- Semantic adds value for conceptual queries but shouldn't dominate
- Configurable via query parameter for future tuning
- Can be adjusted based on user feedback post-launch

**Query Pattern**:
```sql
SELECT *,
  (0.7 * similarity(name, $1) + 0.3 * (1 - (embedding <=> $2))) as score
FROM catalog_items
WHERE similarity(name, $1) > 0.1 OR (embedding <=> $2) < 0.5
ORDER BY score DESC
LIMIT 5;
```

### 6. Batch Sync Strategy

**Decision**: Single transaction with UPSERT using `ON CONFLICT` clause

**Rationale**:
- PostgreSQL `ON CONFLICT DO UPDATE` provides atomic upsert
- Single transaction ensures consistency for batch operations
- `external_id` as conflict target for deduplication
- Batch size limit of 1000 records per request for timeout prevention

**Implementation**:
```sql
INSERT INTO catalog_items (external_id, name, brand_id, embedding, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (external_id)
DO UPDATE SET name = EXCLUDED.name, embedding = EXCLUDED.embedding, updated_at = NOW();
```

## Best Practices Applied

### Supabase + pgvector

1. **Enable extensions via migration** (not manually in dashboard)
2. **Use HNSW index** with appropriate `m` and `ef_construction` parameters
3. **Store embeddings as `vector(1536)`** type for OpenAI-compatible models
4. **Create composite indexes** for filtered vector searches if needed

### Trigram Search

1. **Create GIN index** on searchable text columns: `CREATE INDEX idx_name_trgm ON table USING GIN (name gin_trgm_ops)`
2. **Set similarity threshold** to filter noise: `WHERE similarity(name, query) > 0.1`
3. **Use `word_similarity`** for partial word matching if needed

### Next.js API Routes

1. **Validate all inputs** with Zod before database operations
2. **Return appropriate HTTP status codes** (400, 401, 500)
3. **Use edge runtime** if performance critical (consider for search endpoints)
4. **Log errors** but don't expose internal details to clients

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Embedding dimensions | 1536 (clarified in spec) |
| Auth method | Supabase Service Role Key (clarified in spec) |
| Result limit | 5 results (clarified in spec) |
| Index type for vectors | HNSW (research decision) |
| Debounce timing | 300ms client-side (research decision) |
| Hybrid search weighting | 70/30 text/semantic (research decision) |
