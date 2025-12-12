# Tasks: Gear Detail Modal with External Intelligence

**Input**: Design documents from `/specs/045-gear-detail-modal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Note**: An existing `GearDetailModal.tsx` exists in `components/loadouts/` (175 lines) that displays local data. This implementation will **enhance and relocate** it to `components/gear-detail/` with YouTube and GearGraph integrations.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

This is a Next.js App Router project with:
- `hooks/` - Custom React hooks
- `components/` - UI components
- `lib/` - Utilities and services
- `app/api/` - API routes
- `types/` - TypeScript interfaces
- `supabase/` - Database migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create type definitions and database schema for external integrations

### Type Definitions

- [x] T001 [P] Create `types/youtube.ts` with YouTubeVideo and YouTubeSearchResponse interfaces (from data-model.md)
- [x] T002 [P] Create `types/geargraph.ts` with InsightType, GearInsight, and GearInsightsResponse interfaces (from data-model.md)
- [x] T003 [P] Update `types/database.ts` to add api_cache table type definition (from data-model.md)

### Database Migration

- [x] T004 Create `supabase/migrations/20251211_api_cache_table.sql` with api_cache table, indexes, and RLS policies (from data-model.md)
- [ ] T005 Deploy migration to Supabase by running SQL in Supabase dashboard SQL editor

**Checkpoint**: Types defined and api_cache table exists - external integrations can proceed

---

## Phase 2: Foundational (Cache Service)

**Purpose**: Create shared caching utility for external API responses (blocks Phase 4 and Phase 5)

**⚠️ CRITICAL**: Cache service must exist before YouTube or GearGraph API routes can be implemented

- [x] T006 Create `lib/supabase/cache.ts` with getFromCache(service, key) function
- [x] T007 Add setCache(service, key, data, ttlDays) function to `lib/supabase/cache.ts`
- [x] T008 Add generateCacheKey(params) utility using SHA256 hash to `lib/supabase/cache.ts`
- [x] T009 Add Zod schemas for cache validation to `lib/supabase/cache.ts`

**Checkpoint**: Cache service ready - YouTube and GearGraph routes can use shared caching

---

## Phase 3: User Story 1 + 2 - Core Modal (Priority: P1) 🎯 MVP

**Goal**: Users can click gear cards in inventory or loadouts to see full specifications in a modal

**Independent Test**: Click any gear card in inventory grid → modal opens with all stored data in <100ms

### Modal Hook

- [x] T010 [US1] Create `hooks/useGearDetailModal.ts` with React useState for isOpen/gearId state and open(id), close() actions (local state - no zustand needed for modal)
- [x] T011 [US1] Add URL param sync to `hooks/useGearDetailModal.ts` for deep linking (?gear=<id>)
- [x] T012 [US1] Add useMediaQuery for responsive detection (Dialog vs Sheet) in `hooks/useGearDetailModal.ts`

### Modal Component Reorganization

- [x] T013 [US1] Create `components/gear-detail/` directory structure
- [x] T014 [US1] Create `components/gear-detail/GearDetailContent.tsx` with shared content (extracted from existing GearDetailModal.tsx)
- [x] T015 [US1] Create `components/gear-detail/GearDetailModal.tsx` with Dialog (desktop) + Sheet (mobile) wrapper
- [x] T016 [US1] Create `components/gear-detail/ImageGallery.tsx` for browsing primary + gallery images
- [x] T017 [US1] Add skeleton loaders for YouTube and Insights sections in `components/gear-detail/GearDetailContent.tsx`
- [x] T017a [US1] Add text truncation with ellipsis for long item names/descriptions in `components/gear-detail/GearDetailContent.tsx`
- [x] T017b [US1] Add deleted item detection in `hooks/useGearDetailModal.ts` - close modal with error toast if item not found

### Integration Points - Inventory

- [x] T018 [US1] Update `components/inventory-gallery/GearCard.tsx` to open modal on click (onClick prop already exists)
- [x] T019 [US1] Add GearDetailModal to inventory page layout at `app/[locale]/inventory/page.tsx`
- [x] T020 [US1] Wire useGearDetailModal hook to inventory page for state management

### Integration Points - Loadouts

- [x] T021 [US2] Update loadout detail page at `app/[locale]/loadouts/[id]/page.tsx` to use new modal
- [x] T022 [US2] Ensure clicking gear items in loadout list opens the detail modal
- [x] T023 [US2] Preserve scroll position when modal closes on loadout page

### Remove/Migrate Old Modal

- [x] T024 [US1] Remove or redirect `components/loadouts/GearDetailModal.tsx` to new location
- [x] T025 [US1] Update any imports referencing old GearDetailModal path

**Checkpoint**: Core modal works from both inventory and loadouts - US1 and US2 complete

---

## Phase 4: User Story 3 - YouTube Integration (Priority: P2)

**Goal**: Users see relevant YouTube review videos in the detail modal

**Independent Test**: Open modal for gear with brand+name → see video thumbnails in carousel after loading

### API Route

- [x] T026 [US3] Create `app/api/youtube/search/route.ts` with GET handler
- [x] T027 [US3] Implement cache check using lib/supabase/cache.ts in YouTube route
- [x] T028 [US3] Add YouTube Data API v3 search.list call with query "{brand} {name} review outdoor gear"
- [x] T029 [US3] Store response in cache with 7-day TTL in YouTube route
- [x] T030 [US3] Add Zod validation for request params and response (from contracts/youtube-search.md)
- [x] T031 [US3] Handle missing name parameter with 400 error response
- [x] T032 [US3] Handle API quota exhaustion with 503 response (same as service unavailable per clarification)

### Client Hook

- [x] T033 [US3] Create `hooks/useYouTubeReviews.ts` with fetch logic for /api/youtube/search
- [x] T034 [US3] Add loading, error, and data states to useYouTubeReviews hook
- [x] T034a [US3] Add retry() function to useYouTubeReviews hook that clears error state and re-fetches
- [x] T035 [US3] Trigger fetch when modal opens and brand+name are available

### UI Component

- [x] T036 [US3] Create `components/gear-detail/YouTubeCarousel.tsx` horizontal scroll carousel
- [x] T037 [US3] Add video thumbnail cards with title and channel name
- [x] T038 [US3] Implement click-to-YouTube (opens video in new tab)
- [x] T039 [US3] Add loading skeleton state to YouTubeCarousel
- [x] T040 [US3] Add empty state message "No reviews found for this product"
- [x] T041 [US3] Add error state message "Unable to load reviews" with retry button

### Integration

- [x] T042 [US3] Add YouTubeCarousel to GearDetailContent.tsx as "Reviews" section
- [x] T043 [US3] Show "Product details needed" message when brand/name missing

**Checkpoint**: YouTube reviews appear in modal for items with brand+name - US3 complete

---

## Phase 5: User Story 4 - GearGraph Integration (Priority: P3)

**Goal**: Users see intelligent insights (seasonality, compatibility, weight class) from knowledge graph

**Independent Test**: Open modal for indexed gear → see insight badges in Insights section

### API Route

- [x] T044 [US4] Create `app/api/geargraph/insights/route.ts` with GET handler
- [x] T045 [US4] Implement cache check using lib/supabase/cache.ts in GearGraph route
- [x] T046 [US4] Add GearGraph API call with productTypeId/categoryId/brand+name lookup
- [x] T047 [US4] Store response in cache with 7-day TTL in GearGraph route
- [x] T048 [US4] Add Zod validation for request params and response (from contracts/geargraph-insights.md)
- [x] T049 [US4] Handle missing parameters with 400 error response
- [x] T050 [US4] Handle GearGraph unavailable gracefully - return 200 with empty insights array (per clarification)

### Client Hook

- [x] T051 [US4] Create `hooks/useGearInsights.ts` with fetch logic for /api/geargraph/insights
- [x] T052 [US4] Add loading, error, and data states to useGearInsights hook
- [x] T053 [US4] Trigger fetch when modal opens with productTypeId or categoryId

### UI Component

- [x] T054 [US4] Create `components/gear-detail/GearInsightsSection.tsx` for displaying insights
- [x] T055 [US4] Display insights as Badge components with type-specific styling (seasonality, weight_class, etc.)
- [x] T056 [US4] Add loading skeleton state to GearInsightsSection
- [x] T057 [US4] Add empty state message "Insights not yet available for this product"
- [x] T058 [US4] Add error state message "Insights temporarily unavailable"

### Integration

- [x] T059 [US4] Add GearInsightsSection to GearDetailContent.tsx as "Gear Insights" section

**Checkpoint**: GearGraph insights appear in modal when available - US4 complete

---

## Phase 6: User Story 5 - Edit Navigation (Priority: P2)

**Goal**: Users can quickly navigate to edit an item from the detail modal

**Independent Test**: Open modal → click Edit button → arrive at gear editor with data pre-populated

**Note**: Edit button already exists in current GearDetailModal.tsx - verify it works with new structure

- [x] T060 [US5] Verify Edit button in GearDetailContent.tsx navigates to /inventory/{id}/edit
- [x] T061 [US5] Ensure modal closes after Edit navigation begins
- [x] T062 [US5] Test that gear editor pre-populates with item data

**Checkpoint**: Edit navigation works seamlessly from modal - US5 complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance verification, cleanup, and final validation

### Mobile Verification

- [ ] T066 Test modal renders as full-screen Sheet on mobile viewport (<768px)
- [ ] T067 Test touch scrolling works correctly in mobile Sheet
- [ ] T068 Test all interactive elements are touch-friendly (44x44px tap targets)

### Build & Lint

- [x] T069 [P] Run `npm run lint` to verify no linting errors
- [x] T070 [P] Run `npm run build` to verify production build succeeds

### Success Criteria Validation

- [ ] T071 Verify SC-001: Modal opens with local data in <100ms (use Chrome DevTools Performance tab)
- [ ] T072 Verify SC-002: YouTube carousel loads in <3s (first request)
- [ ] T073 Verify SC-003: Repeated views use cache - instant load, no new YouTube API calls (verify via Network tab)
- [ ] T074 Verify SC-004: Modal accessible from inventory and loadouts
- [ ] T075 Verify SC-005: Edit button navigates in single click
- [ ] T076 Verify SC-006: Mobile users can view without horizontal scrolling
- [ ] T077 Verify SC-007: External service failures don't block local data display

### Documentation

- [x] T078 Update CLAUDE.md with Feature 045 technology entry
- [ ] T079 Run quickstart.md testing checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - type definitions and migration
- **Foundational (Phase 2)**: Depends on Phase 1 (needs database types)
- **User Story 1+2 (Phase 3)**: Depends on Phase 1 (needs types)
- **User Story 3 (Phase 4)**: Depends on Phase 2 (cache service) and Phase 3 (modal exists)
- **User Story 4 (Phase 5)**: Depends on Phase 2 (cache service) and Phase 3 (modal exists)
- **User Story 5 (Phase 6)**: Depends on Phase 3 (modal exists)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 1 (Types) ─────────────────┐
                                 │
Phase 2 (Cache) ─────────────────┼──► Phase 4 (YouTube)
                                 │
                                 ├──► Phase 5 (GearGraph)
Phase 3 (Core Modal) ────────────┤
                                 │
                                 └──► Phase 6 (Edit Nav)
```

### Parallel Opportunities

- T001, T002, T003 can run in parallel (different type files)
- T010, T011, T012 are sequential (same hook file)
- Phase 4 and Phase 5 can run in parallel after Phase 2 and Phase 3 complete
- T063, T064, T065 can run in parallel (different performance tests)
- T069, T070 can run in parallel (different commands)

---

## New Files Summary

| File | Description | Phase |
|------|-------------|-------|
| `types/youtube.ts` | YouTube video/response types | 1 |
| `types/geargraph.ts` | GearGraph insight types | 1 |
| `supabase/migrations/20251211_api_cache_table.sql` | Cache table migration | 1 |
| `lib/supabase/cache.ts` | Shared cache service | 2 |
| `hooks/useGearDetailModal.ts` | Modal state management | 3 |
| `components/gear-detail/GearDetailModal.tsx` | Responsive modal wrapper | 3 |
| `components/gear-detail/GearDetailContent.tsx` | Shared modal content | 3 |
| `components/gear-detail/ImageGallery.tsx` | Image browsing component | 3 |
| `app/api/youtube/search/route.ts` | YouTube search API route | 4 |
| `hooks/useYouTubeReviews.ts` | YouTube data fetching hook | 4 |
| `components/gear-detail/YouTubeCarousel.tsx` | Video carousel component | 4 |
| `app/api/geargraph/insights/route.ts` | GearGraph insights API route | 5 |
| `hooks/useGearInsights.ts` | GearGraph data fetching hook | 5 |
| `components/gear-detail/GearInsightsSection.tsx` | Insights display component | 5 |

## Modified Files Summary

| File | Change | Phase |
|------|--------|-------|
| `types/database.ts` | Add api_cache table types | 1 |
| `components/inventory-gallery/GearCard.tsx` | Wire onClick to open modal | 3 |
| `app/[locale]/inventory/page.tsx` | Add modal and hook | 3 |
| `app/[locale]/loadouts/[id]/page.tsx` | Use new modal | 3 |
| `components/loadouts/GearDetailModal.tsx` | Remove or redirect | 3 |

---

## Implementation Strategy

### MVP First (Phase 1 → 2 → 3)

1. Complete Phase 1: Types and migration
2. Complete Phase 2: Cache service
3. Complete Phase 3: Core modal (US1 + US2)
4. **STOP and VALIDATE**: Modal should open instantly with local data

### Add YouTube (Phase 4)

1. Complete API route with caching
2. Complete hook and UI component
3. **STOP and VALIDATE**: Videos should appear for items with brand+name

### Add GearGraph (Phase 5)

1. Complete API route with caching
2. Complete hook and UI component
3. **STOP and VALIDATE**: Insights should appear for indexed items

### Final Polish (Phase 6 → 7)

1. Verify edit navigation
2. Performance testing
3. Mobile testing
4. Success criteria validation

---

## Notes

- Existing GearDetailModal.tsx has Edit button already - preserve this functionality
- GearCard.tsx already has onClick prop - just need to wire it up
- Cache service is shared between YouTube and GearGraph to reduce code duplication
- GearGraph may return empty insights initially - this is expected and handled gracefully
- YouTube API quota is limited (~100 searches/day) - caching is critical
- All external integrations are non-blocking - local data always shows first
