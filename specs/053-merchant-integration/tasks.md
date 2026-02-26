# Tasks: Merchant Integration (Business Loadouts & Location-Based Offers)

**Input**: Design documents from `/specs/053-merchant-integration/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not explicitly requested in spec - test tasks excluded (add if needed).

**Organization**: Tasks grouped by user story (P1 → P2 → P3 → P4) for independent implementation.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3...) - Setup/Foundational phases have no label

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, and database foundation

- [x] T001 [P] Create merchant types in `types/merchant.ts` (Merchant, MerchantLocation, MerchantStatus enums)
- [x] T002 [P] Create merchant loadout types in `types/merchant-loadout.ts` (MerchantLoadout, LoadoutItem, LoadoutStatus, LoadoutPricing)
- [x] T003 [P] Create merchant offer types in `types/merchant-offer.ts` (MerchantOffer, OfferStatus with state transitions, UserOffer)
- [x] T004 [P] Create conversion types in `types/conversion.ts` (Conversion, MerchantTransaction, BillingCycle)
- [x] T005 Create Supabase migration file `supabase/migrations/20251229_merchant_integration.sql` with all tables from data-model.md
- [x] T006 Add PostGIS extension activation and spatial indexes in migration
- [x] T007 Add RLS policies for merchant tables in migration (merchants, merchant_loadouts, merchant_offers)
- [x] T008 Create proximity bucket function `get_proximity_bucket()` in migration
- [x] T009 Create merchant analytics function `get_merchant_analytics()` in migration
- [x] T010 Create view `merchant_loadout_pricing` for bundle price calculation in migration
- [x] T011 [P] Add i18n translations for merchant portal in `messages/en.json` and `messages/de.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T012 Create merchant Supabase queries in `lib/supabase/merchant-queries.ts` (fetchMerchant, updateMerchant)
- [x] T013 [P] Create merchant auth hook `hooks/merchant/useMerchantAuth.ts` (verify merchant role, check approval status)
- [x] T014 [P] Create merchant profile hook `hooks/merchant/useMerchantProfile.ts` (get/update merchant profile)
- [x] T015 Create merchant catalog hook `hooks/merchant/useMerchantCatalog.ts` (CRUD catalog items, search, pagination)
- [x] T016 Create MerchantBadge component in `components/merchant/MerchantBadge.tsx` (verified badge, business type indicator)
- [x] T017 [P] Create merchant portal layout `app/[locale]/merchant/layout.tsx` (sidebar nav, auth guard)
- [x] T018 Extend profiles table with role column via migration helper (if not in T005)
- [x] T019 Extend gear_items table with source attribution columns (source_merchant_id, source_offer_id, source_loadout_id)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Browse Merchant Loadouts (Priority: P1) 🎯 MVP

**Goal**: Users can discover professionally curated gear packages from trusted retailers

**Independent Test**: Navigate to merchant section, browse loadouts, view details, add items to wishlist

### Implementation for User Story 1

- [x] T020 [P] [US1] Create public loadout queries in `lib/supabase/merchant-loadout-queries.ts` (fetchPublishedLoadouts, fetchLoadoutBySlug)
- [x] T021 [P] [US1] Create useMerchantLoadoutsPublic hook in `hooks/merchant/useMerchantLoadoutsPublic.ts` (browse, filter, sort)
- [x] T022 [US1] Create MerchantLoadoutCard component in `components/merchant/MerchantLoadoutCard.tsx` (name, merchant, price, featured badge)
- [x] T023 [US1] Create MerchantLoadoutDetail component in `components/merchant/MerchantLoadoutDetail.tsx` (items, pricing, availability, merchant info)
- [x] T024 [US1] Create MerchantLoadoutGrid component in `components/merchant/MerchantLoadoutGrid.tsx` (responsive grid with filters)
- [x] T025 [US1] Create merchant loadouts browse page `app/[locale]/community/merchant-loadouts/page.tsx`
- [x] T026 [US1] Create merchant loadout detail page `app/[locale]/community/merchant-loadouts/[slug]/page.tsx`
- [x] T027 [US1] Implement "Add to Wishlist" with merchant attribution in MerchantLoadoutDetail
- [x] T028 [US1] Create LocationConsentDialog component in `components/merchant/LocationConsentDialog.tsx` (city/neighborhood/none options)
- [x] T029 [US1] Create useLocationSharing hook in `hooks/user/useLocationSharing.ts` (get/update per-merchant location consent)
- [x] T030 [US1] Integrate LocationConsentDialog when user adds merchant items to wishlist

**Checkpoint**: User Story 1 complete - users can browse and wishlist merchant loadouts

---

## Phase 4: User Story 2 - Merchant Creates Loadout (Priority: P1) 🎯 MVP

**Goal**: Merchants can create curated gear packages with bundle pricing

**Independent Test**: Merchant logs in, creates loadout wizard, sets pricing, publishes

### Implementation for User Story 2

- [x] T031 [P] [US2] Create merchant loadout CRUD queries in `lib/supabase/merchant-loadout-queries.ts` (create, update, delete, submit)
- [x] T032 [P] [US2] Create useMerchantLoadouts hook in `hooks/merchant/useMerchantLoadouts.ts` (CRUD, submit for review)
- [x] T033 [US2] Create LoadoutCreationWizard component in `components/merchant/LoadoutCreationWizard.tsx` (4-step wizard)
- [x] T034 [US2] Create wizard step 1: LoadoutBasicsStep in `components/merchant/wizard/LoadoutBasicsStep.tsx` (name, trip type, season, description)
- [x] T035 [US2] Create wizard step 2: LoadoutItemsStep in `components/merchant/wizard/LoadoutItemsStep.tsx` (catalog search, add items, expert notes)
- [x] T036 [US2] Create wizard step 3: LoadoutPricingStep in `components/merchant/wizard/LoadoutPricingStep.tsx` (bundle discount, price preview)
- [x] T037 [US2] Create wizard step 4: LoadoutAvailabilityStep in `components/merchant/wizard/LoadoutAvailabilityStep.tsx` (store stock selection)
- [x] T038 [US2] Create MerchantDashboard component in `components/merchant/MerchantDashboard.tsx` (KPIs: loadouts, views, conversions)
- [x] T039 [US2] Create merchant dashboard page `app/[locale]/merchant/page.tsx`
- [x] T040 [US2] Create merchant loadouts list page `app/[locale]/merchant/loadouts/page.tsx`
- [x] T041 [US2] Create merchant loadout create page `app/[locale]/merchant/loadouts/new/page.tsx`
- [x] T042 [US2] Create merchant loadout edit page `app/[locale]/merchant/loadouts/[id]/page.tsx`
- [x] T043 [US2] Create merchant locations management hook `hooks/merchant/useMerchantLocations.ts` (CRUD locations)
- [x] T044 [US2] Create merchant settings page `app/[locale]/merchant/settings/page.tsx` (profile, locations)

**Checkpoint**: User Story 2 complete - merchants can create and publish loadouts

---

## Phase 5: User Story 3 - Wishlist Brokering (Priority: P2)

**Goal**: Merchants can see aggregate demand and send personalized offers to users with matching wishlists

**Independent Test**: Merchant views wishlist insights, filters by radius, creates and sends offer

### Implementation for User Story 3

- [x] T045 [P] [US3] Create proximity query RPC in migration: `get_wishlist_users_nearby(merchant_lat, merchant_lng, radius_meters)`
- [x] T046 [P] [US3] Create useWishlistInsights hook in `hooks/merchant/useWishlistInsights.ts` (aggregate demand, proximity filters)
- [x] T047 [US3] Create WishlistInsightsPanel component in `components/merchant/WishlistInsightsPanel.tsx` (product cards with demand counts)
- [x] T048 [US3] Create WishlistInsightDetail component in `components/merchant/WishlistInsightDetail.tsx` (anonymized user list, proximity buckets)
- [x] T049 [P] [US3] Create useMerchantOffers hook in `hooks/merchant/useMerchantOffers.ts` (create, list, track offers)
- [x] T050 [US3] Create OfferCreationForm component in `components/merchant/OfferCreationForm.tsx` (price, message, expiration, batch send)
- [x] T051 [US3] Create merchant insights page `app/[locale]/merchant/insights/page.tsx`
- [x] T052 [US3] Create merchant offers list page `app/[locale]/merchant/offers/page.tsx`
- [x] T053 [US3] Create offer creation page `app/[locale]/merchant/offers/new/page.tsx`
- [x] T054 [US3] Implement offer fee calculation and transaction logging in useMerchantOffers
- [x] T055 [US3] Create notification trigger for offer_received in migration (database trigger or app logic)

**Checkpoint**: User Story 3 complete - merchants can broker wishlist demand

---

## Phase 6: User Story 4 - User Receives Offers (Priority: P2)

**Goal**: Users can receive, view, and respond to personalized offers from merchants

**Independent Test**: User receives notification, views offer details, accepts/declines, blocks merchant

### Implementation for User Story 4

- [x] T056 [P] [US4] Create useUserOffers hook in `hooks/offers/useUserOffers.ts` (fetch offers, accept, decline, mark viewed)
- [x] T057 [P] [US4] Create useOfferBlocking hook in `hooks/offers/useOfferBlocking.ts` (block/unblock merchant)
- [x] T058 [US4] Create OfferCard component in `components/offers/OfferCard.tsx` (merchant, product, price, discount, expiration)
- [x] T059 [US4] Create OfferDetailSheet component in `components/offers/OfferDetailSheet.tsx` (full details, distance, nearest store)
- [x] T060 [US4] Create OfferResponseActions component in `components/offers/OfferResponseActions.tsx` (accept, decline, block, report)
- [x] T061 [US4] Create user offers page `app/[locale]/offers/page.tsx`
- [x] T062 [US4] Implement offer status transitions with validation in useUserOffers
- [x] T063 [US4] Integrate with existing messaging system: auto-create DM on offer accept
- [x] T064 [US4] Create offer report functionality (spam, misleading) in OfferResponseActions
- [x] T065 [US4] Add offer notification handling (link from notification to offer detail)

**Checkpoint**: User Story 4 complete - users can receive and respond to offers

---

## Phase 7: User Story 5 - Conversion Tracking (Priority: P3)

**Goal**: Track purchases and calculate commissions for merchant billing

**Independent Test**: User marks purchase, conversion logged, merchant sees analytics, commission calculated

### Implementation for User Story 5

- [x] T066 [P] [US5] Create useConversionTracking hook in `hooks/merchant/useConversionTracking.ts` (log conversion, analytics)
- [x] T067 [P] [US5] Create useMerchantBilling hook in `hooks/merchant/useMerchantBilling.ts` (transactions, cycles, summary)
- [x] T068 [US5] Create ConversionDashboard component in `components/merchant/ConversionDashboard.tsx` (rates, trends, value charts)
- [x] T069 [US5] Create BillingOverview component in `components/merchant/BillingOverview.tsx` (fees, commissions, totals)
- [x] T070 [US5] Create merchant analytics page `app/[locale]/merchant/analytics/page.tsx`
- [x] T071 [US5] Create merchant billing page `app/[locale]/merchant/billing/page.tsx`
- [x] T072 [US5] Implement "Mark as Purchased from Merchant" in wishlist item actions
- [x] T073 [US5] Implement conversion logging with fraud detection flags
- [x] T074 [US5] Create conversion dispute flow for users (contest incorrect attribution)
- [x] T075 [US5] Implement monthly billing cycle calculation and transaction generation

**Checkpoint**: User Story 5 complete - full conversion tracking and billing

---

## Phase 8: User Story 6 - Compare Loadouts (Priority: P3)

**Goal**: Users can compare merchant loadouts to community loadouts for informed decisions

**Independent Test**: User views merchant loadout, clicks compare, selects community loadout, sees differences

### Implementation for User Story 6

- [x] T076 [P] [US6] Create useLoadoutComparison hook in `hooks/merchant/useLoadoutComparison.ts` (fetch both loadouts, calculate diffs)
- [x] T077 [US6] Create LoadoutComparisonModal component in `components/merchant/LoadoutComparisonModal.tsx` (side-by-side view)
- [x] T078 [US6] Create LoadoutComparisonTable component in `components/merchant/LoadoutComparisonTable.tsx` (weight, price, item diffs)
- [x] T079 [US6] Add "Compare" button to MerchantLoadoutDetail with loadout selector
- [x] T080 [US6] Implement category-based item matching for comparison highlights

**Checkpoint**: User Story 6 complete - comparison feature available

---

## Phase 9: User Story 7 - Merchant Onboarding (Priority: P4)

**Goal**: Admins can review and approve merchant applications

**Independent Test**: Admin sees applications, reviews credentials, approves/rejects, merchant receives access

### Implementation for User Story 7

- [x] T081 [P] [US7] Create useAdminMerchants hook in `hooks/admin/useAdminMerchants.ts` (list, approve, reject)
- [x] T082 [US7] Create AdminMerchantList component in `components/admin/AdminMerchantList.tsx` (filterable table)
- [x] T083 [US7] Create AdminMerchantDetail component in `components/admin/AdminMerchantDetail.tsx` (application review)
- [x] T084 [US7] Create admin merchants page `app/[locale]/admin/merchants/page.tsx`
- [x] T085 [US7] Create merchant application form for users wanting to become merchants
- [x] T086 [US7] Implement merchant_approved and merchant_rejected notification triggers

**Checkpoint**: User Story 7 complete - admin can onboard merchants

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements, edge cases, and integration

- [x] T087 [P] Handle edge case: loadout unpublished while in user wishlist (show "No longer available")
- [x] T088 [P] Handle edge case: online-only merchants (show "Ships nationwide" instead of distance)
- [x] T089 [P] Handle edge case: offer spam prevention (rate limit 1 offer/product/user/30 days)
- [x] T090 Implement offer expiration cron job (auto-archive expired offers)
- [x] T091 [P] Add loading skeletons for merchant portal pages
- [x] T092 [P] Add error boundaries for merchant components
- [x] T093 Implement merchant loadout SEO metadata (Open Graph, structured data)
- [x] T094 Run quickstart.md validation - verify all setup steps work
- [x] T095 Performance optimization: add indexes for common queries
- [x] T096 Security review: verify RLS policies cover all access patterns

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 and US2 (both P1) can proceed in parallel after Foundation
  - US3 and US4 (both P2) can proceed in parallel after Foundation
  - US5 and US6 (both P3) can proceed in parallel after Foundation
  - US7 (P4) can proceed after Foundation
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundation (Phase 2)
├── US1: Browse Loadouts (P1) - Independent
├── US2: Create Loadouts (P1) - Independent (can run parallel with US1)
├── US3: Wishlist Brokering (P2) - Soft dependency on US1 (needs loadouts to exist)
├── US4: User Offers (P2) - Depends on US3 (needs offers to exist)
├── US5: Conversion Tracking (P3) - Depends on US4 (needs accepted offers)
├── US6: Compare Loadouts (P3) - Depends on US1 (needs loadouts to view)
└── US7: Admin Onboarding (P4) - Independent (can run anytime after Foundation)
```

### Within Each User Story

- Models/types before hooks
- Hooks before components
- Components before pages
- Core implementation before integrations

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001, T002, T003, T004 (all types) - parallel
- T011 (i18n) - parallel with migration work

**Phase 2 (Foundation)**:
- T013, T014 (auth hooks) - parallel
- T016 (component) and T017 (layout) - parallel

**Phase 3+ (User Stories)**:
- US1 and US2 can run entirely in parallel (different teams)
- Within each story, tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Phase 3 parallel opportunities:

# Launch queries and hooks together:
Task: T020 "Create public loadout queries in lib/supabase/merchant-loadout-queries.ts"
Task: T021 "Create useMerchantLoadoutsPublic hook in hooks/merchant/useMerchantLoadoutsPublic.ts"

# After hooks complete, launch components in parallel:
Task: T022 "Create MerchantLoadoutCard component"
Task: T023 "Create MerchantLoadoutDetail component"
Task: T024 "Create MerchantLoadoutGrid component"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (types, migration)
2. Complete Phase 2: Foundational (core hooks, layout)
3. Complete Phase 3: User Story 1 (browse loadouts)
4. Complete Phase 4: User Story 2 (create loadouts)
5. **STOP and VALIDATE**: Full MVP - merchants can create, users can browse
6. Deploy/demo if ready

**MVP Scope**: Tasks T001-T044 (44 tasks)

### Incremental Delivery

1. Setup + Foundation → Core infrastructure ready
2. Add US1 → Users can browse merchant loadouts → Demo
3. Add US2 → Merchants can create loadouts → Launch beta with merchants
4. Add US3 + US4 → Offer system complete → Launch offers feature
5. Add US5 → Conversion tracking → Enable billing
6. Add US6 → Comparison → Enhanced UX
7. Add US7 → Admin onboarding → Scale merchant acquisition

### Parallel Team Strategy

With 2+ developers after Foundation:

- **Developer A**: User Stories 1, 3, 5 (user-facing flow)
- **Developer B**: User Stories 2, 4, 7 (merchant-facing flow)
- **Both**: US6, Phase 10 (shared)

---

## Task Summary

| Phase | Story | Task Count | Parallelizable |
|-------|-------|------------|----------------|
| 1: Setup | - | 11 | 5 |
| 2: Foundational | - | 8 | 4 |
| 3: US1 Browse | P1 | 11 | 3 |
| 4: US2 Create | P1 | 14 | 2 |
| 5: US3 Brokering | P2 | 11 | 3 |
| 6: US4 User Offers | P2 | 10 | 2 |
| 7: US5 Conversions | P3 | 10 | 2 |
| 8: US6 Compare | P3 | 5 | 1 |
| 9: US7 Admin | P4 | 6 | 1 |
| 10: Polish | - | 10 | 6 |
| **Total** | | **96** | **29** |

---

## Notes

- [P] tasks = different files, no dependencies within that phase
- [Story] label maps task to user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths relative to repository root
