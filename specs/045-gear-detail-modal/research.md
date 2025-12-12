# Research: Gear Detail Modal with External Intelligence

**Feature**: 045-gear-detail-modal
**Date**: 2025-12-11

## Research Tasks

### 1. YouTube Data API v3 Integration

**Decision**: Use YouTube Data API v3 `search.list` endpoint with server-side API route

**Rationale**:
- Official Google API with reliable availability and documentation
- `search.list` supports filtering by `type=video` and relevance ranking
- Server-side route keeps API key secure (never exposed to client)
- Quota cost: 100 units per search (free tier = 10,000 units/day = ~100 searches)

**Alternatives Considered**:
- YouTube oEmbed API: Rejected - no search capability, only embedding existing video URLs
- Third-party scraping: Rejected - ToS violation, unreliable
- YouTube IFrame API: Rejected - requires video ID, no search

**Implementation Pattern**:
```typescript
// Server-side route: app/api/youtube/search/route.ts
// Uses googleapis package or fetch with API key
// Query format: "{brand} {model} review outdoor gear"
// Returns: top 5 videos with id, title, thumbnail, channelTitle
```

**API Key Management**:
- Store in `YOUTUBE_API_KEY` environment variable
- Never expose to client-side code
- Rate limit by checking cache before API call

---

### 2. Database Caching Strategy

**Decision**: Supabase table `api_cache` with composite key (service + query_hash)

**Rationale**:
- Shared cache across all users maximizes quota efficiency
- Database persistence survives deployments/restarts
- TTL implemented via `expires_at` timestamp column
- Simple query: `SELECT * FROM api_cache WHERE key = ? AND expires_at > NOW()`

**Alternatives Considered**:
- Redis/Upstash: Rejected - adds infrastructure complexity for simple cache
- Next.js `unstable_cache`: Rejected - per-deployment, not shared across instances
- Browser localStorage: Rejected - per-user, doesn't share cache benefits

**Cache Schema**:
```sql
CREATE TABLE api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,        -- 'youtube' | 'geargraph'
  cache_key TEXT NOT NULL,      -- SHA256 hash of query params
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(service, cache_key)
);

CREATE INDEX idx_api_cache_lookup ON api_cache(service, cache_key, expires_at);
```

**Cache Key Generation**:
- YouTube: `sha256(brand + model + "review outdoor gear")`
- GearGraph: `sha256(productTypeId + categoryId)`

---

### 3. GearGraph API Integration

**Decision**: Connect to existing Memgraph/GearGraph endpoint via server-side API route

**Rationale**:
- GearGraph is the project's knowledge graph for gear ontology
- Contains relationships: seasonality, compatibility, weight class
- Full implementation now (per clarification) requires real API connection

**Alternatives Considered**:
- Mock data only: Rejected - user requested full implementation
- Client-side direct connection: Rejected - exposes graph credentials

**Implementation Pattern**:
```typescript
// Server-side route: app/api/geargraph/insights/route.ts
// Query by: productTypeId, categoryId, or brand+name
// Returns: array of GearInsight { type, label, confidence }
```

**Graceful Degradation**:
- If GearGraph unavailable: return empty array, UI shows "Insights not available"
- No blocking of modal - insights section is non-critical

---

### 4. Responsive Modal Pattern

**Decision**: shadcn/ui Dialog (desktop) + Sheet (mobile) with media query detection

**Rationale**:
- Dialog provides standard modal behavior for desktop (overlay, escape to close)
- Sheet provides mobile-native drawer pattern (full height, swipe gestures)
- shadcn/ui components are already in the design system (constitution III)

**Alternatives Considered**:
- Single Dialog component: Rejected - poor mobile UX
- Custom modal: Rejected - violates constitution III (must use shadcn/ui)

**Implementation Pattern**:
```typescript
// useMediaQuery hook detects viewport
// Render Dialog or Sheet based on breakpoint (md: 768px)
// Both share GearDetailContent as children
```

---

### 5. Modal State Management

**Decision**: zustand store slice for modal state, URL param for deep linking

**Rationale**:
- Consistent with existing state management (useSupabaseStore)
- URL param `?gear=<id>` enables shareable links
- State includes: isOpen, selectedGearId, activeTab (if tabbed)

**Alternatives Considered**:
- React Context: Rejected - zustand already in use
- URL-only state: Rejected - requires router navigation for open/close

**Implementation Pattern**:
```typescript
// hooks/useGearDetailModal.ts
// State: { isOpen, gearId, open(id), close() }
// Sync with URL searchParams for deep linking
```

---

## Key Findings Summary

| Topic | Decision | Impact |
|-------|----------|--------|
| YouTube API | Server-side search.list | Secure, 100 searches/day quota |
| Caching | Supabase api_cache table | Shared across users, 7-day TTL |
| GearGraph | Full implementation via API | Real insights when available |
| Modal UI | Dialog + Sheet (responsive) | Native UX per device |
| State | zustand + URL params | Shareable deep links |

## Dependencies to Add

No new npm dependencies required:
- YouTube API: Use native `fetch` with API key
- GearGraph: Use native `fetch` (Memgraph Bolt or REST)
- Dialog/Sheet: Already in shadcn/ui
- Caching: Use existing Supabase client

## Environment Variables Required

```env
# YouTube Data API v3
YOUTUBE_API_KEY=AIza...

# GearGraph (if separate from Supabase)
GEARGRAPH_API_URL=https://...
GEARGRAPH_API_KEY=...
```
