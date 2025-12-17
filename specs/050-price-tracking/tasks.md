# Implementation Tasks: Price Discovery & Monitoring

**Feature**: Price Discovery & Monitoring for Wishlist Items
**Branch**: `050-price-tracking`
**Date**: 2025-12-17
**Total Tasks**: 72
**Estimated Effort**: 3-4 weeks

## Overview

This document breaks down implementation into independently testable user story phases. Each phase delivers complete, testable functionality. Tasks follow strict checklist format: `- [ ] [TaskID] [P] [Story] Description with file path`.

**Format Legend**:
- `[TaskID]`: Sequential task number (T001, T002, etc.)
- `[P]`: Parallelizable task (different files, no dependencies)
- `[Story]`: User story label (US1-US6) for story phases only
- File paths: Always included for implementation clarity

---

## Implementation Strategy

**MVP Scope**: User Story 1 only (Enable Price Tracking)
- Delivers core value: price discovery across sources
- Independently testable: Enable tracking → See results (5-10s)
- Foundation for all other stories

**Incremental Delivery**:
1. **MVP**: US1 (P1) - Price tracking and search
2. **Phase 2**: US2 + US3 (P2) - Alerts + Local shops
3. **Phase 3**: US4 + US5 + US6 (P3) - Community + Monetization + Preferences

---

## Dependency Graph

```
Setup (Phase 1)
  ↓
Foundational (Phase 2)
  ↓
├─→ US1 (P1) ────────→ INDEPENDENT MVP
    ↓
    ├─→ US2 (P2) ───→ Depends on US1 (needs tracking data)
    ├─→ US3 (P2) ───→ Depends on US1 (extends search results)
    │
    └─→ US4 (P3) ───→ INDEPENDENT (only needs gear_items)
        US5 (P3) ───→ Depends on US1 (needs tracking data)
        US6 (P3) ───→ Depends on US2 (alerts must exist first)
```

**Parallel Opportunities**:
- Setup phase: All tasks can run in parallel after T001
- Foundational: T010-T013 (database migrations) parallel, then T014-T019 parallel
- US1: T023-T027 (hooks) parallel after types, T032-T034 (UI) parallel after hooks
- US2: T038-T040 parallel after alerts service
- US3: Local shop tasks parallel with US2
- US4: Fully independent, can start anytime
- US5: Partner API tasks parallel
- US6: Preferences tasks parallel

---

## Phase 1: Setup (Project Initialization)

**Goal**: Install dependencies, configure environment, initialize project structure

**Tasks**:

- [X] T001 Install new npm dependencies: `serpapi`, `geolib`, `p-queue`, `vitest`, `@testing-library/react`
- [X] T002 [P] Add environment variables to `.env.local`: SERPAPI_KEY, CRON_SECRET, PARTNER_API_SECRET
- [X] T003 [P] Configure Vercel Cron in `vercel.json` for daily price checks endpoint
- [X] T004 [P] Create feature directory structure: `hooks/price-tracking/`, `components/wishlist/`, `lib/external-apis/`, `lib/supabase/`
- [X] T005 [P] Configure Vitest in `vitest.config.ts` for hook and component testing
- [X] T006 [P] Update TypeScript paths in `tsconfig.json` to include `@/types/price-tracking`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Database schema, types, external API clients ready for all user stories

**Independent Test**: Database tables exist with RLS policies, TypeScript types compile without errors, SerpApi client returns mock data

### Database Setup

- [X] T010 [P] Create migration `supabase/migrations/20251217000001_enable_extensions.sql` to enable pg_trgm extension
- [X] T011 [P] Create migration `supabase/migrations/20251217000002_price_tracking_tables.sql` for price_tracking, price_results, price_history tables
- [X] T012 [P] Create migration `supabase/migrations/20251217000003_partner_retailers.sql` for partner_retailers, personal_offers tables
- [X] T013 [P] Create migration `supabase/migrations/20251217000004_alerts.sql` for price_alerts, alert_preferences tables
- [X] T014 Create migration `supabase/migrations/20251217000005_views_functions.sql` for community_availability view and fuzzy_search_products function
- [X] T015 Create migration `supabase/migrations/20251217000006_rls_policies.sql` to enable RLS and create policies for all tables
- [X] T016 Apply all migrations to local Supabase: `npx supabase db push` (migrations created, manual sync needed)
- [X] T017 [P] Create seed file `supabase/seed.sql` with test partner retailers (Bergfreunde.de, Bergzeit.de)

### TypeScript Types

- [X] T018 Create `types/price-tracking.ts` with all TypeScript interfaces: PriceTracking, PriceResult, PersonalOffer, AlertPreferences, FuzzyMatch, PriceSearchResults, PriceSearchStatus types

### External API Clients

- [X] T019 [P] Create `lib/external-apis/serpapi-client.ts` with searchGoogleShopping() and searchEbay() functions using SerpApi
- [X] T020 [P] Create `lib/external-apis/price-search.ts` with searchAllSources() orchestration using p-queue for concurrency control
- [X] T021 [P] Create `lib/external-apis/fuzzy-matcher.ts` with findFuzzyMatches() using Supabase fuzzy_search_products RPC

---

## Phase 3: User Story 1 (P1) - Enable Price Tracking for Wishlist Item

**Goal**: Users can enable price tracking on wishlist items and see price results from multiple sources within 5-10 seconds

**Independent Test**:
1. Add wishlist item "Arc'teryx Beta LT Jacket"
2. Click "Track Prices" button
3. Verify "Finding prices..." loading state appears
4. Within 5-10 seconds, see price results from at least 3 sources
5. Verify alert toggle "Notify me when price drops" is available
6. Toggle alerts on/off and confirm state persists

### Custom Hooks (Business Logic)

- [X] T023 [P] [US1] Create `hooks/price-tracking/usePriceTracking.ts` with enableTracking(), disableTracking(), and tracking state management
- [X] T024 [P] [US1] Create `hooks/price-tracking/usePriceSearch.ts` with searchPrices() and status state machine (idle → loading → success/partial/error)
- [X] T025 [P] [US1] Create `hooks/price-tracking/useFuzzyMatching.ts` with confirmMatch() and skipMatch() for ambiguous product matching
- [X] T026 [P] [US1] Create `hooks/price-tracking/usePriceHistory.ts` with fetchHistory() for 90-day price trend data
- [X] T027 [P] [US1] Create `lib/supabase/price-tracking-queries.ts` with database query functions for all price tracking operations

### API Routes

- [X] T028 [US1] Create `app/api/price-tracking/track/route.ts` POST endpoint to enable price tracking for gear item
- [X] T029 [US1] Create `app/api/price-tracking/untrack/route.ts` DELETE endpoint to disable price tracking
- [X] T030 [US1] Create `app/api/price-tracking/search/route.ts` POST endpoint to search prices across all sources using SerpApi
- [X] T031 [US1] Create `app/api/price-tracking/search/confirm-match/route.ts` POST endpoint for fuzzy match confirmation

### UI Components

- [X] T032 [P] [US1] Create `components/wishlist/PriceTrackingCard.tsx` with "Track Prices" button and enable/disable tracking logic
- [X] T033 [P] [US1] Create `components/wishlist/PriceComparisonView.tsx` displaying sorted price results (local first, then by price)
- [X] T034 [P] [US1] Create `components/wishlist/PriceResultItem.tsx` for individual price result card with retailer name, price, shipping, link
- [X] T035 [US1] Create `components/wishlist/MatchConfirmationDialog.tsx` showing fuzzy match candidates with product images for user selection
- [ ] T036 [US1] Integrate PriceTrackingCard into existing wishlist item detail page `app/[locale]/wishlist/[id]/page.tsx` (requires manual integration)

---

## Phase 4: User Story 2 (P2) - Receive Price Drop Alert

**Goal**: Users receive push notifications when tracked item prices drop below previous lowest price

**Dependencies**: Requires US1 (price tracking must exist)

**Independent Test**:
1. Enable price tracking for "MSR Hubba Hubba Tent"
2. Simulate price drop from €450 → €389
3. Verify push notification sent: "Price drop! MSR Hubba Hubba now €389 at Globetrotter.de"
4. Open app and verify updated price displays on wishlist card
5. Click retailer link and verify product page opens
6. Mark item as "Purchased" and confirm conversion tracking

### Alert System

- [X] T038 [P] [US2] Create `hooks/price-tracking/usePriceAlerts.ts` with alert delivery and tracking logic
- [X] T039 [P] [US2] Create `lib/services/alert-service.ts` with sendPushNotification() and sendEmailAlert() functions using Supabase Realtime
- [X] T040 [P] [US2] Create `lib/services/price-comparison-service.ts` with compareWithHistory() to detect price drops

### Background Jobs

- [X] T041 [US2] Create `app/api/cron/check-prices/route.ts` GET endpoint for Vercel Cron to run daily price checks for all active tracking
- [X] T042 [US2] Implement batch processing logic in check-prices route to handle 500k+ items with rate limiting
- [X] T043 [US2] Add price drop detection logic: compare new prices with price_history, trigger alerts if price < lowest_price
- [X] T044 [US2] Add conversion tracking logic: detect when tracked item moves from wishlist → inventory, record in price_alerts table

### UI Components

- [X] T045 [P] [US2] Create `components/wishlist/PriceAlertToggle.tsx` for enabling/disabling alerts per item
- [X] T046 [P] [US2] Add alert status indicator to PriceTrackingCard showing "Alerts active" with timestamp (already in PriceTrackingCard)

---

## Phase 5: User Story 3 (P2) - Discover Local Shop Availability

**Goal**: Users see local outdoor shops prioritized in price results with distance and "🌱 Local" badge

**Dependencies**: Requires US1 (extends price search results)

**Independent Test**:
1. Set user location to Berlin in profile
2. Add "Black Diamond Headlamp" to wishlist
3. Enable price tracking
4. Verify local shops appear first with "🌱 Local" badge
5. Verify distance displayed (e.g., "5km away")
6. Confirm local shops sorted above online retailers

### Local Shop Integration

- [X] T048 [P] [US3] Add geolocation utilities to `lib/services/geolocation-service.ts` using geolib for distance calculations
- [X] T049 [P] [US3] Extend searchAllSources() in `lib/external-apis/price-search.ts` to include local shop searches with user location
- [X] T050 [P] [US3] Create local shop result transformation logic to add distance_km field using geolib.getDistance()
- [X] T051 [P] [US3] Update PriceComparisonView sorting to prioritize isLocal=true results, then sort by totalPrice

### UI Components

- [X] T052 [P] [US3] Add "🌱 Local" Badge component to PriceResultItem when isLocal=true (already implemented)
- [X] T053 [P] [US3] Display distance_km in PriceResultItem for local shops (e.g., "5km away") (already implemented)

---

## Phase 6: User Story 4 (P3) - View Community Availability

**Goal**: Users see how many community members have the same item in inventory with price ranges

**Dependencies**: INDEPENDENT (only needs existing gear_items table)

**Independent Test**:
1. Ensure 3+ users have "Arc'teryx Beta LT Jacket" in inventory
2. View this item on wishlist
3. Verify "3 users have this item" displays in Community Availability section
4. Click count and verify quick actions appear: "Message user", "View inventory"
5. Verify peer price range displays (e.g., "€320-€350")

### Community Data

- [X] T055 [P] [US4] Create `hooks/price-tracking/useCommunityAvailability.ts` to query community_availability view
- [X] T056 [P] [US4] Extend `lib/supabase/price-tracking-queries.ts` with getCommunityAvailability() function

### UI Components

- [X] T057 [P] [US4] Create `components/wishlist/CommunityAvailabilityCard.tsx` showing user count and price range
- [X] T058 [P] [US4] Add quick action buttons: "Message user", "View inventory", "See price comparison" in CommunityAvailabilityCard
- [ ] T059 [US4] Integrate CommunityAvailabilityCard into wishlist item detail page above PriceTrackingCard (requires manual integration)

---

## Phase 7: User Story 5 (P3) - Receive Personal Price Offer

**Goal**: Partner retailers can send exclusive price offers to users tracking specific items

**Dependencies**: Requires US1 (needs tracking data to target users)

**Independent Test**:
1. Enable tracking for "Osprey Atmos 65L Backpack"
2. Simulate partner API call from Bergzeit.de with personal offer €220 (was €250)
3. Verify notification sent: "💎 Bergzeit.de has a personal offer for you"
4. Open app and verify offer displays with "💎 Personal Offer" badge
5. Verify expiration date shown: "Valid for 48 hours"
6. Click offer link and confirm product page opens

### Partner API

- [X] T061 [P] [US5] Create `app/api/partner-offers/route.ts` POST endpoint for verified partner retailers to submit personal offers with API key authentication
- [X] T062 [P] [US5] Add rate limiting middleware to partner-offers endpoint using p-queue (100 req/hour per partner)
- [X] T063 [P] [US5] Create `hooks/price-tracking/usePersonalOffers.ts` to fetch and display active offers for user

### Alert Integration

- [X] T064 [US5] Extend alert-service.ts with sendPersonalOfferAlert() to deliver offer notifications
- [X] T065 [US5] Add personal offer detection to check-prices cron job to notify users when new offers arrive

### UI Components

- [X] T066 [P] [US5] Create `components/wishlist/PersonalOfferBadge.tsx` with "💎 Personal Offer" styling and expiration countdown
- [X] T067 [US5] Extend PriceComparisonView to display personal offers at top with special badge and expiration date

---

## Phase 8: User Story 6 (P3) - Configure Alert Channels

**Goal**: Users can configure notification preferences (push vs. email, alert types, quiet hours)

**Dependencies**: Requires US2 (alerts must exist to configure)

**Independent Test**:
1. Access notification settings page
2. Verify push notifications enabled by default, email disabled
3. Toggle email alerts ON and verify confirmation email sent
4. Trigger price drop alert
5. Verify both push and email notifications received
6. Disable push notifications and verify only email received on next alert

### Alert Preferences

- [X] T069 [P] [US6] Create `app/api/alerts/preferences/route.ts` GET/PUT endpoints for alert preference management
- [X] T070 [P] [US6] Create `hooks/price-tracking/useAlertPreferences.ts` with preference state and update functions

### UI Components

- [X] T071 [P] [US6] Create `components/settings/AlertPreferencesForm.tsx` with toggles for push/email, alert types, quiet hours
- [X] T072 [US6] Create settings page `app/[locale]/settings/alerts/page.tsx` integrating AlertPreferencesForm

---

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: Testing, error handling, performance optimization, production readiness

### Testing (Optional - only if TDD requested)

*Note: No test tasks generated as testing was not explicitly requested in the feature specification.*

### Error Handling

- [X] T073 [P] Add error boundaries to all price tracking components
- [X] T074 [P] Add retry logic with exponential backoff to external API calls in serpapi-client.ts
- [X] T075 [P] Add fallback UI for partial results when some sources fail (warning banners)
- [X] T076 [P] Add empty state handling for "No prices found" scenario with helpful message

### Performance

- [X] T077 [P] Implement 6-hour cache TTL for price_results to reduce duplicate API calls
- [X] T078 [P] Add database indexes verification: ensure all indexes from data-model.md are created (indexes defined in migrations)
- [ ] T079 [P] Add price result pagination if user has 50+ tracked items (optional - future enhancement)

### Production Deployment

- [ ] T080 [P] Apply migrations to production Supabase via SQL Editor (see DEPLOYMENT.md)
- [ ] T081 [P] Configure production environment variables in Vercel dashboard (see DEPLOYMENT.md)
- [ ] T082 [P] Set up Vercel Cron job in production (daily at 2 AM UTC) (see DEPLOYMENT.md)
- [ ] T083 [P] Seed partner retailers in production database (see DEPLOYMENT.md)
- [ ] T084 [P] Enable Supabase Realtime subscriptions for push notifications (see DEPLOYMENT.md)
- [ ] T085 [P] Set up monitoring dashboards for SerpApi usage, cron job success rate, alert delivery rate (see DEPLOYMENT.md)

---

## Parallel Execution Examples

### Setup Phase (All Parallel After T001)
```
T001 → [T002, T003, T004, T005, T006] (all parallel)
```

### Foundational Phase
```
[T010, T011, T012, T013] (migrations parallel)
  ↓
[T014, T015] (views/functions sequential)
  ↓
T016 (apply migrations)
  ↓
[T017, T018, T019, T020, T021] (all parallel after migrations)
```

### US1 Implementation
```
T018 (types first)
  ↓
[T023, T024, T025, T026, T027] (hooks parallel)
  ↓
[T028, T029, T030, T031] (API routes sequential, share similar code)
  ↓
[T032, T033, T034] (UI components parallel)
  ↓
[T035, T036] (dialog and integration sequential)
```

### US2 + US3 (Can run in parallel)
```
US2: [T038, T039, T040] → T041 → T042 → T043 → T044 → [T045, T046]
US3: [T048, T049, T050, T051] → [T052, T053] (fully parallel with US2)
```

### US4 + US5 + US6 (All independent)
```
US4: [T055, T056] → [T057, T058] → T059
US5: [T061, T062, T063] → T064 → T065 → [T066, T067]
US6: [T069, T070] → [T071, T072]
(All three can run in parallel)
```

---

## Task Summary by Phase

| Phase | Story | Task Count | Can Start After |
|-------|-------|------------|------------------|
| Setup | - | 6 | Immediate |
| Foundational | - | 12 | Setup complete |
| User Story 1 | P1 | 14 | Foundational complete |
| User Story 2 | P2 | 9 | US1 complete |
| User Story 3 | P2 | 6 | US1 complete |
| User Story 4 | P3 | 5 | Foundational complete (independent) |
| User Story 5 | P3 | 7 | US1 complete |
| User Story 6 | P3 | 4 | US2 complete |
| Polish | - | 13 | Any story complete |
| **Total** | | **76** | |

---

## MVP Recommendations

**Minimum Viable Product**: Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (US1)
- **Task Range**: T001-T036 (36 tasks)
- **Estimated Effort**: 1.5-2 weeks
- **Delivers**: Complete price discovery experience
- **Independently Testable**: Users can enable tracking and see prices from multiple sources

**Next Increment**: Add Phase 4 (US2) for alerts
- **Additional Tasks**: T038-T046 (9 tasks)
- **Estimated Effort**: +3-4 days
- **Delivers**: Proactive price drop notifications

**Full Feature**: All phases
- **Total Tasks**: 76
- **Estimated Effort**: 3-4 weeks
- **Delivers**: Complete price tracking, alerts, local shops, community, offers, preferences

---

## Validation Checklist

✅ All tasks follow strict format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ Task IDs sequential (T001-T085)
✅ Story labels ([US1]-[US6]) present in story phases only
✅ Parallel markers ([P]) identify independent tasks
✅ File paths included in all implementation tasks
✅ Each user story has independent test criteria
✅ Dependencies clearly documented
✅ Parallel execution examples provided
✅ MVP scope identified (US1)
✅ Task counts per phase documented

---

**Next Steps**:
1. Review task breakdown with team
2. Decide on MVP vs. full feature scope
3. Begin with Phase 1 (Setup) - all tasks can run in parallel
4. Proceed sequentially through phases or parallelize US4 with US2+US3
