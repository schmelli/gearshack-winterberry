# Quickstart: Gear Detail Modal Implementation

**Feature**: 045-gear-detail-modal
**Estimated Effort**: 3-4 days
**Prerequisites**: Supabase access, YouTube API key

## Setup Checklist

- [ ] Add `YOUTUBE_API_KEY` to `.env.local`
- [ ] Run database migration for `api_cache` table
- [ ] Verify GearGraph API connectivity (or configure mock endpoint)

## Environment Variables

Add to `.env.local`:

```env
# YouTube Data API v3
YOUTUBE_API_KEY=AIza...your-key-here

# GearGraph API (if available)
GEARGRAPH_API_URL=https://your-geargraph-endpoint
GEARGRAPH_API_KEY=your-key-here
```

## Database Migration

Run in Supabase SQL Editor:

```sql
-- From: specs/045-gear-detail-modal/data-model.md

CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('youtube', 'geargraph')),
  cache_key TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(service, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_api_cache_lookup
  ON api_cache(service, cache_key, expires_at);

ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_cache_select" ON api_cache FOR SELECT USING (true);
CREATE POLICY "api_cache_insert" ON api_cache FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "api_cache_update" ON api_cache FOR UPDATE USING (auth.uid() IS NOT NULL);
```

## Implementation Order

### Phase 1: Core Modal (P1 - Day 1-2)

1. **Types** (`types/youtube.ts`, `types/geargraph.ts`)
   - Define YouTubeVideo, GearInsight interfaces
   - Add api_cache to database.ts

2. **Modal Hook** (`hooks/useGearDetailModal.ts`)
   - State: isOpen, gearId
   - Actions: open(id), close()
   - URL sync for deep linking

3. **Modal Components** (`components/gear-detail/`)
   - GearDetailModal.tsx (Dialog + Sheet responsive wrapper)
   - GearDetailContent.tsx (shared content)
   - ImageGallery.tsx (if not existing)

4. **Integration Points**
   - GearCard.tsx: Add onClick to open modal
   - Loadout item list: Add onClick to open modal

### Phase 2: YouTube Integration (P2 - Day 2-3)

1. **Cache Service** (`lib/supabase/cache.ts`)
   - getFromCache(service, key)
   - setCache(service, key, data, ttlDays)

2. **API Route** (`app/api/youtube/search/route.ts`)
   - Check cache first
   - Call YouTube API if miss
   - Store in cache
   - Return response

3. **Hook** (`hooks/useYouTubeReviews.ts`)
   - Fetch on modal open (when brand/name available)
   - Loading/error states

4. **Component** (`components/gear-detail/YouTubeCarousel.tsx`)
   - Horizontal scroll carousel
   - Video thumbnails with click-to-YouTube

### Phase 3: GearGraph Integration (P3 - Day 3-4)

1. **API Route** (`app/api/geargraph/insights/route.ts`)
   - Check cache first
   - Query GearGraph API
   - Handle unavailability gracefully

2. **Hook** (`hooks/useGearInsights.ts`)
   - Fetch on modal open
   - Graceful degradation

3. **Component** (`components/gear-detail/GearInsightsSection.tsx`)
   - Tag/badge display
   - Empty state message

## Testing Checklist

### Core Modal
- [ ] Click gear card in inventory → modal opens
- [ ] Click gear item in loadout → modal opens
- [ ] Press Escape → modal closes
- [ ] Click outside → modal closes
- [ ] Mobile: renders as full-screen sheet
- [ ] Desktop: renders as centered dialog
- [ ] All gear data fields display correctly
- [ ] Gallery images browsable

### YouTube Integration
- [ ] Modal with brand+name → videos load
- [ ] Modal without brand → shows "details needed" message
- [ ] Reload same item → instant load (cache hit)
- [ ] API error → shows "Unable to load" message
- [ ] Click thumbnail → opens YouTube in new tab

### GearGraph Integration
- [ ] Modal with productTypeId → insights load
- [ ] No insights available → shows friendly message
- [ ] API error → shows "temporarily unavailable"
- [ ] Insights display as badges/tags

### Performance
- [ ] Modal opens in <100ms (measure with DevTools)
- [ ] External data loads in <3s (first request)
- [ ] Cache TTL of 7 days verified

## File Checklist

```
New Files:
├── app/api/youtube/search/route.ts
├── app/api/geargraph/insights/route.ts
├── components/gear-detail/
│   ├── GearDetailModal.tsx
│   ├── GearDetailContent.tsx
│   ├── YouTubeCarousel.tsx
│   ├── GearInsightsSection.tsx
│   └── ImageGallery.tsx
├── hooks/useGearDetailModal.ts
├── hooks/useYouTubeReviews.ts
├── hooks/useGearInsights.ts
├── lib/supabase/cache.ts
├── types/youtube.ts
├── types/geargraph.ts
└── supabase/migrations/20251211_api_cache_table.sql

Modified Files:
├── types/database.ts (add api_cache table types)
├── components/inventory-gallery/GearCard.tsx (add onClick)
└── components/loadouts/LoadoutItemList.tsx (add onClick)
```

## Rollback Plan

If issues arise:
1. Remove onClick handlers from GearCard and LoadoutItemList
2. Delete new components in `components/gear-detail/`
3. Delete new API routes
4. Drop `api_cache` table: `DROP TABLE IF EXISTS api_cache;`
