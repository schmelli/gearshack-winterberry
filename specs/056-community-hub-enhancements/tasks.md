# Tasks: Community Hub Enhancements

**Feature**: 056-community-hub-enhancements
**Input**: Design documents from `/specs/056-community-hub-enhancements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- File paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database migrations, and shared type definitions

- [ ] T001 Install embla-carousel-autoplay dependency if not present (`npm install embla-carousel-autoplay`)
- [ ] T002 [P] Create database migration `supabase/migrations/20260104_create_community_banners.sql` with table, indexes, RLS policies, and triggers per data-model.md
- [ ] T003 [P] Create database migration `supabase/migrations/20260104_add_vip_featured_videos.sql` to add `featured_video_urls TEXT[]` column to vip_accounts
- [ ] T004 [P] Create database migration `supabase/migrations/20260104_create_marketplace_view.sql` with v_marketplace_listings view per data-model.md
- [ ] T005 Run `supabase db push` to apply migrations and regenerate types
- [ ] T006 [P] Create `types/marketplace.ts` with MarketplaceListing, MarketplaceFilters, MarketplaceState types and schemas per data-model.md
- [ ] T007 [P] Create `types/banner.ts` with CommunityBanner, CreateBannerInput, UpdateBannerInput types and schemas per data-model.md
- [ ] T008 Extend `types/vip.ts` to add `featuredVideoUrls: z.array(z.string().url()).default([])` to vipAccountSchema
- [ ] T009 [P] Add i18n translations for Marketplace namespace to `messages/en.json` per quickstart.md
- [ ] T010 [P] Add i18n translations for Marketplace namespace to `messages/de.json` per quickstart.md
- [ ] T011 [P] Add i18n translations for Banner.admin namespace to `messages/en.json` per quickstart.md
- [ ] T012 [P] Add i18n translations for Banner.admin namespace to `messages/de.json` per quickstart.md

**Checkpoint**: Database ready, types defined, i18n keys added. Feature implementation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Supabase query functions shared across user stories

**⚠️ CRITICAL**: Stories 1 and 2 depend on these query functions

- [ ] T013 Create `lib/supabase/marketplace-queries.ts` with `fetchMarketplaceListings(supabase, options)` function supporting type filter, sort, cursor pagination, and search
- [ ] T014 Create `lib/supabase/banner-queries.ts` with `fetchActiveBanners(supabase)`, `fetchAllBanners(supabase)`, `createBanner(supabase, input)`, `updateBanner(supabase, id, input)`, `deleteBanner(supabase, id)` functions

**Checkpoint**: Query layer ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Marketplace Browsing (Priority: P1) 🎯 MVP

**Goal**: Enable peer-to-peer gear exchange by allowing users to browse, filter, and contact sellers of marketplace items

**Independent Test**: Navigate to `/community/marketplace`, view gear cards, filter by type, click seller avatar, click Message button

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create `hooks/marketplace/index.ts` with barrel export
- [ ] T016 [P] [US1] Create `hooks/marketplace/useMarketplaceFilters.ts` with URL query param sync using useSearchParams, supporting type/sortBy/sortOrder/search filters
- [ ] T017 [US1] Create `hooks/marketplace/useMarketplace.ts` with infinite scroll state machine, using fetchMarketplaceListings and copying useBulletinBoard pattern (depends on T013, T016)
- [ ] T018 [P] [US1] Create `components/marketplace/MarketplaceSkeleton.tsx` with loading skeleton grid (12 items) using shadcn Skeleton
- [ ] T019 [P] [US1] Create `components/marketplace/MarketplaceFilters.tsx` with type filter buttons (All/For Sale/For Trade/For Borrow), sort dropdown, search input
- [ ] T020 [US1] Create `components/marketplace/MarketplaceCard.tsx` with item image, name, condition, price with currency formatting via Intl.NumberFormat, seller avatar (clickable → profile), seller name, listing type badges, Message Seller button (depends on T006)
- [ ] T021 [US1] Create `components/marketplace/MarketplaceGrid.tsx` with responsive grid, IntersectionObserver for infinite scroll, empty state, error state (depends on T020, T018)
- [ ] T022 [US1] Create `components/marketplace/index.ts` with barrel export for all marketplace components
- [ ] T023 [US1] Create `app/[locale]/community/marketplace/page.tsx` with MarketplaceFilters + MarketplaceGrid + useMarketplace hook integration (depends on T017, T019, T021)
- [ ] T024 [US1] Modify `components/community/CommunityNavTabs.tsx` to enable Marketplace tab (change `enabled: false` to `enabled: true` for marketplace)
- [ ] T025 [US1] Implement Message Seller functionality in MarketplaceCard using existing useConversations hook from Feature 046, opening conversation with gear item context

**Checkpoint**: Marketplace fully functional - users can browse, filter, sort, and message sellers independently.

---

## Phase 4: User Story 2 - Admin Banner Carousel (Priority: P1)

**Goal**: Allow admins to create promotional banners that display in an auto-rotating carousel on the community page

**Independent Test**: Create banner in `/admin/banners`, verify it appears in carousel on community page with 6s auto-rotation

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create `hooks/banner/index.ts` with barrel export
- [ ] T027 [US2] Create `hooks/banner/useBannerCarousel.ts` to fetch active banners using fetchActiveBanners, handle loading/error states (depends on T014)
- [ ] T028 [P] [US2] Create `hooks/banner/useBannerAdmin.ts` for admin CRUD operations using banner query functions
- [ ] T029 [US2] Create `components/community/BannerCarousel.tsx` using shadcn Carousel + embla-carousel-autoplay plugin, 6s interval, pause on hover, navigation dots/arrows, cinematic 21:9 aspect ratio, hidden when no banners (depends on T027)
- [ ] T030 [P] [US2] Create `components/admin/BannerForm.tsx` with react-hook-form + Zod validation, Cloudinary image upload, datetime pickers for visibility window, display order, active toggle
- [ ] T031 [P] [US2] Create `components/admin/BannerList.tsx` displaying all banners with status indicators (Active/Scheduled/Expired/Disabled), edit/delete actions
- [ ] T032 [US2] Create `app/[locale]/admin/banners/page.tsx` with BannerList + BannerForm in dialog/sheet for create/edit (depends on T028, T030, T031)
- [ ] T033 [US2] Modify `app/[locale]/community/page.tsx` to add BannerCarousel component above CommunityNavTabs (depends on T029)
- [ ] T034 [US2] Add "Manage Banners" link to admin dashboard at `app/[locale]/admin/page.tsx`

**Checkpoint**: Banner system complete - admins can manage banners, users see carousel on community page.

---

## Phase 5: User Story 3 - VIP Profile Modal (Priority: P2)

**Goal**: Display VIP profiles in a modal dialog for quick preview without page navigation

**Independent Test**: Click VIP name/avatar anywhere on community pages, modal opens with profile/loadouts, click outside to close

### Implementation for User Story 3

- [ ] T035 [P] [US3] Create `hooks/vip/useVipModal.ts` as Zustand store with isOpen, vipSlug, open(slug), close() methods
- [ ] T036 [US3] Create `components/vip/VipProfileModal.tsx` using shadcn Dialog, max-w-2xl max-h-[90vh] overflow-y-auto, fetching VIP data via existing useVipProfile hook, showing avatar/name/bio/social links/loadouts grid (depends on T035)
- [ ] T037 [US3] Add VipProfileModal to community layout at `app/[locale]/community/layout.tsx` so it's available on all community pages
- [ ] T038 [US3] Modify `components/vip/VipProfileCard.tsx` to call useVipModal.open(slug) instead of navigating to /vip/[slug]
- [ ] T039 [US3] Modify `components/vip/FeaturedVipsSection.tsx` to use modal for VIP clicks
- [ ] T040 [US3] Modify any other VIP name/avatar clickable elements in community to use modal (search codebase for Link href="/vip/")

**Checkpoint**: VIP modal functional - quick previews without navigation, existing /vip/[slug] page still works for SEO.

---

## Phase 6: User Story 4 - VIP Loadouts Tab Reorganization (Priority: P2)

**Goal**: Show only VIP loadouts on the VIP Loadouts page, with a disabled "Reseller Loadouts" tab marked "Soon"

**Independent Test**: Navigate to `/community/merchant-loadouts`, verify VIP Loadouts tab is active, Reseller Loadouts tab is greyed out with "Soon" badge

### Implementation for User Story 4

- [ ] T041 [US4] Modify `app/[locale]/community/merchant-loadouts/page.tsx` to update page title to "VIP Loadouts" (remove reseller references)
- [ ] T042 [US4] Add tab navigation component with "VIP Loadouts" (active) and "Reseller Loadouts" (disabled with Badge variant="secondary" showing "Soon")
- [ ] T043 [US4] Update page description/subtitle to reference only VIP loadouts
- [ ] T044 [US4] Add i18n keys for "Reseller Loadouts" and "Soon" badge to messages/en.json and messages/de.json

**Checkpoint**: VIP Loadouts page reorganized with clear disabled Reseller tab.

---

## Phase 7: User Story 5 - Filter Bug Fix (Priority: P2)

**Goal**: Fix bulletin board tag filter to work consistently with URL parameter persistence

**Independent Test**: Navigate to `/community?tag=gear_advice`, verify filtered posts show, refresh page and filter persists

### Implementation for User Story 5

- [ ] T045 [US5] Create `hooks/bulletin/useBulletinFilters.ts` using useSearchParams to read/write filter state to URL query params per research.md pattern
- [ ] T046 [US5] Modify `hooks/bulletin/useBulletinBoard.ts` to integrate with useBulletinFilters, reading initial tag from URL params
- [ ] T047 [US5] Modify `components/bulletin/BulletinBoard.tsx` to use URL-synced filter state, ensuring filter buttons update URL
- [ ] T048 [US5] Verify filter state persists across page refresh and is shareable via URL

**Checkpoint**: Filters work correctly and persist via URL parameters.

---

## Phase 8: User Story 6 - YouTube Embed Sizing (Priority: P3)

**Goal**: Constrain YouTube preview thumbnails to max 300px height for better scrolling

**Independent Test**: View a post with YouTube link, verify preview is compact (max 300px height)

### Implementation for User Story 6

- [ ] T049 [US6] Modify `components/bulletin/YouTubePreview.tsx` to add `max-h-[300px]` constraint to the AspectRatio container while maintaining 16:9 ratio

**Checkpoint**: YouTube previews are compact and scrollable.

---

## Phase 9: User Story 7 - Sidebar Spacing (Priority: P3)

**Goal**: Increase spacing between sidebar panels for better visual balance

**Independent Test**: View community page on desktop, verify sidebar panels have approximately 24px gap

### Implementation for User Story 7

- [ ] T050 [US7] Modify `components/community/CommunitySidebar.tsx` to increase gap from `gap-4` to `gap-6` (16px → 24px) between panels

**Checkpoint**: Sidebar has improved visual spacing.

---

## Phase 10: User Story 8 - Admin Featured Videos for VIPs (Priority: P3)

**Goal**: Allow admins to add featured videos to VIP profiles, displayed in the VIP modal

**Independent Test**: Add videos to VIP in admin, view VIP profile modal and see Featured Videos section

**Dependency**: Requires US3 (VIP Modal) to display videos

### Implementation for User Story 8

- [ ] T051 [P] [US8] Create `components/vip/VipFeaturedVideos.tsx` displaying YouTube video grid, hidden if no videos exist
- [ ] T052 [US8] Modify VipProfileModal to include VipFeaturedVideos section (depends on T036, T051)
- [ ] T053 [US8] Modify `app/[locale]/admin/vip/page.tsx` (or appropriate admin VIP management page) to add featured videos URL list management with add/remove functionality
- [ ] T054 [US8] Create `hooks/vip/useVipFeaturedVideos.ts` for admin CRUD of featured videos (update vip_accounts.featured_video_urls)

**Checkpoint**: VIP featured videos functional - admins can manage, users see in modal.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T055 Run `npm run lint` and fix any errors
- [ ] T056 Run `npm run build` and fix any build errors
- [ ] T057 Run `flutter analyze` equivalent checks (N/A for Next.js - use TypeScript strict mode validation)
- [ ] T058 [P] Verify responsive design on mobile for marketplace, banner carousel, VIP modal
- [ ] T059 [P] Verify accessibility: keyboard navigation for carousel, modal focus trap, aria labels
- [ ] T060 Run quickstart.md validation checklist items manually
- [ ] T061 Update CLAUDE.md with any new patterns discovered during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────────┐
                                                           │
Phase 2 (Foundational) ◄──────────────────────────────────┘
    │
    ├─► Phase 3 (US1: Marketplace) ─────┐
    │                                    │
    ├─► Phase 4 (US2: Banner Carousel) ─┤
    │                                    │
    ├─► Phase 5 (US3: VIP Modal) ───────┤
    │       │                            │
    │       └─► Phase 10 (US8: Videos)  │
    │                                    │
    ├─► Phase 6 (US4: Loadouts Tabs) ───┤
    │                                    │
    ├─► Phase 7 (US5: Filter Fix) ──────┤
    │                                    │
    ├─► Phase 8 (US6: YouTube Size) ────┤
    │                                    │
    └─► Phase 9 (US7: Sidebar Space) ───┤
                                         │
Phase 11 (Polish) ◄─────────────────────┘
```

### User Story Dependencies

| Story | Depends On | Can Run In Parallel With |
|-------|------------|--------------------------|
| US1 (Marketplace) | Phase 2 | US2, US4, US5, US6, US7 |
| US2 (Banner Carousel) | Phase 2 | US1, US3, US4, US5, US6, US7 |
| US3 (VIP Modal) | Phase 2 | US1, US2, US4, US5, US6, US7 |
| US4 (Loadouts Tabs) | Phase 2 | US1, US2, US3, US5, US6, US7 |
| US5 (Filter Fix) | Phase 2 | US1, US2, US3, US4, US6, US7 |
| US6 (YouTube Size) | Phase 2 | All others |
| US7 (Sidebar Space) | Phase 2 | All others |
| US8 (Featured Videos) | US3 | US1, US2, US4, US5, US6, US7 |

### Within Each User Story

- Types before hooks
- Hooks before components
- Components before pages
- Core implementation before integration

---

## Parallel Execution Examples

### Setup Phase (T002-T012 parallelizable)

```bash
# Group 1: Database migrations (can run in parallel)
Task: T002 - Create community_banners migration
Task: T003 - Create vip featured videos migration
Task: T004 - Create marketplace view migration

# Group 2: Type definitions (can run in parallel after migrations)
Task: T006 - Create types/marketplace.ts
Task: T007 - Create types/banner.ts

# Group 3: i18n (can run in parallel)
Task: T009 - Add en.json Marketplace translations
Task: T010 - Add de.json Marketplace translations
Task: T011 - Add en.json Banner translations
Task: T012 - Add de.json Banner translations
```

### P1 Features (US1 + US2 in parallel after Phase 2)

```bash
# Developer A: Marketplace (US1)
Task: T015-T025 in sequence

# Developer B: Banner Carousel (US2)
Task: T026-T034 in sequence
```

### P3 Features (all in parallel)

```bash
Task: T049 - YouTube sizing (US6)
Task: T050 - Sidebar spacing (US7)
```

---

## Implementation Strategy

### MVP First (P1 Features Only)

1. Complete Phase 1: Setup (T001-T012)
2. Complete Phase 2: Foundational (T013-T014)
3. Complete Phase 3: US1 Marketplace (T015-T025)
4. **STOP and VALIDATE**: Test marketplace independently
5. Complete Phase 4: US2 Banner Carousel (T026-T034)
6. **STOP and VALIDATE**: Test banners independently
7. Deploy/demo P1 features

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 + US2 = Core community commerce + communication
2. **Increment 2**: US3 + US8 = VIP modal experience
3. **Increment 3**: US4 + US5 = Navigation improvements
4. **Increment 4**: US6 + US7 = Visual polish
5. **Final**: Phase 11 polish

---

## Task Summary

| Phase | Story | Task Count | Parallelizable |
|-------|-------|------------|----------------|
| Phase 1: Setup | - | 12 | 10 |
| Phase 2: Foundational | - | 2 | 0 |
| Phase 3: US1 Marketplace | P1 | 11 | 5 |
| Phase 4: US2 Banner | P1 | 9 | 3 |
| Phase 5: US3 VIP Modal | P2 | 6 | 1 |
| Phase 6: US4 Loadouts Tabs | P2 | 4 | 0 |
| Phase 7: US5 Filter Fix | P2 | 4 | 0 |
| Phase 8: US6 YouTube Size | P3 | 1 | 0 |
| Phase 9: US7 Sidebar Space | P3 | 1 | 0 |
| Phase 10: US8 Featured Videos | P3 | 4 | 1 |
| Phase 11: Polish | - | 7 | 2 |
| **Total** | | **61** | **22** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- P1 stories (US1, US2) are MVP scope
- US8 depends on US3 being complete (VIP modal needed to display videos)
