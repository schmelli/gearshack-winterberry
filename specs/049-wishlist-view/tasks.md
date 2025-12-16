# Tasks: Wishlist View with Community Availability and Price Monitoring

**Input**: Design documents from `/specs/049-wishlist-view/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/ (complete)

**Tests**: No automated tests requested for this feature - manual testing only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/[locale]/inventory/`, `components/wishlist/`, `hooks/`, `types/`, `lib/supabase/`
- Paths assume Next.js App Router structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and basic TypeScript configuration

- [X] T001 Create Supabase migration file at supabase/migrations/20251216_wishlist_functions.sql
- [X] T002 Add pg_trgm extension and fuzzy matching functions to migration (from data-model.md)
- [X] T003 [P] Add GIN indexes for trigram matching on gear_items.brand and gear_items.model_number
- [X] T004 [P] Add composite index for marketplace queries on gear_items table
- [ ] T005 Apply migration to local Supabase database using supabase db reset or supabase db push
- [ ] T006 Verify pg_trgm extension is enabled by querying pg_extension table
- [ ] T007 Test find_community_availability() function with sample data

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, validations, and database query functions that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 [P] Create types/wishlist.ts with WishlistItem, CommunityAvailabilityMatch, InventoryViewMode, UseWishlistReturn interfaces (from data-model.md)
- [X] T009 [P] Create lib/validations/wishlist-schema.ts with addToWishlistSchema and communityAvailabilityMatchSchema using Zod
- [X] T010 [P] Create lib/supabase/wishlist-queries.ts with fetchWishlistItems() function
- [X] T011 [P] Add addWishlistItem() function to lib/supabase/wishlist-queries.ts with duplicate checking
- [X] T012 [P] Add updateWishlistItem() function to lib/supabase/wishlist-queries.ts
- [X] T013 [P] Add deleteWishlistItem() function to lib/supabase/wishlist-queries.ts
- [X] T014 [P] Add moveWishlistItemToInventory() function to lib/supabase/wishlist-queries.ts
- [X] T015 [P] Add checkWishlistDuplicate() function to lib/supabase/wishlist-queries.ts with case-insensitive matching
- [X] T016 [P] Create lib/supabase/community-matching.ts with fetchCommunityAvailability() function calling RPC
- [X] T017 [P] Add refreshCommunityAvailability() function to lib/supabase/community-matching.ts
- [X] T018 [P] Add fetchAvailabilityForItem() function to lib/supabase/community-matching.ts with Zod validation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Manage Wishlist Items (Priority: P1) 🎯 MVP

**Goal**: Enable users to switch between inventory and wishlist views, add items to wishlist, and view them in all card sizes with search/filter/sort functionality

**Independent Test**: Create wishlist, add items, view in different card sizes (small/medium/large), switch between inventory and wishlist tabs, search/filter/sort items

### Implementation for User Story 1

- [X] T019 [P] [US1] Create hooks/useWishlist.ts implementing UseWishlistReturn interface with state management
- [X] T020 [US1] Implement fetchWishlistItems in useWishlist hook using lib/supabase/wishlist-queries
- [X] T021 [US1] Implement addToWishlist action in useWishlist with duplicate detection and toast notifications
- [X] T022 [US1] Implement removeFromWishlist action in useWishlist with confirmation and toast
- [X] T023 [US1] Implement search/filter/sort logic in useWishlist (reuse patterns from useInventory)
- [X] T024 [P] [US1] Create components/wishlist/WishlistToggle.tsx using shadcn/ui Tabs component
- [X] T025 [P] [US1] Create hooks/useInventoryView.ts for URL-based view state management (?view=wishlist)
- [X] T026 [US1] Extend components/inventory-gallery/GearCard.tsx to accept context prop ('inventory' | 'wishlist')
- [X] T027 [US1] Add conditional rendering in GearCard for wishlist context (hide availability markers)
- [X] T028 [US1] Modify app/[locale]/inventory/page.tsx to integrate WishlistToggle component
- [X] T029 [US1] Add view mode state management in inventory page using useInventoryView hook
- [X] T030 [US1] Implement conditional rendering in inventory page to show inventory or wishlist items based on view mode
- [X] T031 [US1] Verify GearCard displays correctly in all three sizes (compact, standard, detailed) for wishlist context
- [X] T032 [US1] Add "Add to Wishlist" button to inventory page toolbar when in wishlist view
- [X] T033 [US1] Connect "Add to Wishlist" button to existing GearItemEditor modal with mode prop
- [ ] T034 [US1] Test view switching preserves search/filter/sort state across inventory and wishlist views
- [ ] T035 [US1] Test duplicate detection prevents adding same item (brand + model) twice with warning toast

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can manage wishlist items, switch views, and use all existing inventory features on wishlist.

---

## Phase 4: User Story 2 - View Community Availability (Priority: P2)

**Goal**: Show which community members have matching wishlist items available for sale/trade/lending on medium-sized cards

**Independent Test**: View medium-sized wishlist cards and verify community availability panels display with quick actions to view items and message users

### Implementation for User Story 2

- [X] T036 [P] [US2] Create hooks/useCommunityAvailability.ts with 5-minute TTL cache using useRef
- [X] T037 [US2] Implement fetchAvailability action in useCommunityAvailability calling lib/supabase/community-matching
- [X] T038 [US2] Implement refreshAvailability action in useCommunityAvailability bypassing cache
- [X] T039 [US2] Add isStale() helper function in useCommunityAvailability checking TTL (5 minutes)
- [X] T040 [P] [US2] Create components/wishlist/CommunityAvailabilityPanel.tsx with loading/empty/matches states
- [X] T041 [US2] Add "View Item" quick action button in CommunityAvailabilityPanel opening detail modal
- [X] T042 [US2] Add "Message User" quick action button in CommunityAvailabilityPanel triggering messaging system
- [X] T043 [US2] Display availability badges (for sale, lendable, tradeable) in CommunityAvailabilityPanel
- [X] T044 [US2] Show similarity score in CommunityAvailabilityPanel for debugging (optional, can hide from users)
- [X] T045 [US2] Integrate CommunityAvailabilityPanel into GearCard component for medium/detailed view when context='wishlist'
- [X] T046 [US2] Lazy load community availability data only when medium/detailed cards are visible
- [X] T047 [US2] Handle "No community matches" state with appropriate message in panel
- [X] T048 [US2] Test fuzzy matching works correctly (e.g., "Osprey Atmos 65" matches "Atmos 65 AG")
- [X] T049 [US2] Test "View Item" action opens correct user's inventory card detail
- [X] T050 [US2] Test "Message User" action opens messaging with correct user pre-selected
- [X] T051 [US2] Verify community availability queries complete in under 3 seconds (performance target)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can see community availability on wishlist items.

---

## Phase 5: User Story 3 - Transfer Item from Wishlist to Inventory (Priority: P3)

**Goal**: Allow users to move acquired wishlist items to inventory with one click, preserving all data

**Independent Test**: Open wishlist item detail modal, click "Move to Inventory", verify item appears in inventory and disappears from wishlist

### Implementation for User Story 3

- [X] T052 [P] [US3] Create components/wishlist/MoveToInventoryButton.tsx with confirmation dialog using shadcn/ui AlertDialog
- [X] T053 [US3] Implement handleMove action in MoveToInventoryButton calling useWishlist moveToInventory function
- [X] T054 [US3] Add loading state and disabled state to MoveToInventoryButton during async operation
- [X] T055 [US3] Integrate MoveToInventoryButton into GearCard component for wishlist context (replace Edit button)
- [X] T056 [US3] Add MoveToInventoryButton to wishlist item detail modal (when opened from wishlist view)
- [X] T057 [US3] Implement moveToInventory action in useWishlist hook calling lib/supabase/wishlist-queries moveWishlistItemToInventory
- [X] T058 [US3] Update local state in both useWishlist and useInventory hooks after successful move
- [X] T059 [US3] Show success toast notification after move completes with item name
- [X] T060 [US3] Navigate to inventory view and highlight newly moved item after successful transfer
- [X] T061 [US3] Test move operation preserves all item data (images, notes, dependencies, etc.)
- [X] T062 [US3] Test confirmation dialog prevents accidental moves
- [X] T063 [US3] Test item disappears from wishlist view and appears in inventory view immediately

**Checkpoint**: All user stories (US1, US2, US3) should now be independently functional

---

## Phase 6: User Story 4 - View Price Information (Priority: P4 - Future) 🚧 STUB ONLY

**Goal**: Add clearly marked stub sections for future price monitoring features

**Independent Test**: View medium/large wishlist cards and verify stub indicators display with "coming soon" messaging

### Implementation for User Story 4 (Stub Sections Only)

- [X] T064 [P] [US4] Create components/wishlist/PriceStubIndicator.tsx with dashed border and "Price monitoring coming soon" message
- [X] T065 [US4] Integrate PriceStubIndicator into GearCard for medium view when context='wishlist' (below community availability panel)
- [X] T066 [P] [US4] Create components/wishlist/PriceHistoryStub.tsx with chart placeholder and "Price history coming soon" message
- [X] T067 [US4] Integrate PriceHistoryStub into GearCard for detailed/large view when context='wishlist'
- [X] T068 [US4] Test stub sections are clearly marked and don't confuse users (user testing feedback)

**Checkpoint**: All user stories including future stub features are complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, i18n, performance optimization, edge case handling

- [ ] T069 [P] Add i18n translations for "Wishlist", "My Gear", "Move to Inventory", "Add to Wishlist" in messages/ directory
- [ ] T070 [P] Add i18n translations for community availability messages ("Not available in community", etc.)
- [ ] T071 [P] Add i18n translations for duplicate warning and error messages
- [ ] T072 Add empty state component for empty wishlist with "Add your first wishlist item" message
- [ ] T073 Add empty state component for zero search results in wishlist view
- [ ] T074 Test view switching completes in under 2 seconds (performance target from success criteria)
- [ ] T075 Test search/filter operations complete in under 2 seconds for 500 items (performance target)
- [ ] T076 Add error boundary handling for wishlist components to prevent full page crashes
- [ ] T077 Add retry logic for failed community availability queries with exponential backoff
- [ ] T078 Test edge case: User tries to move item to inventory when already exists in inventory
- [ ] T079 Test edge case: Community member deletes item that appeared in availability panel (stale data)
- [ ] T080 Test edge case: Very long item names and descriptions display correctly in all card sizes
- [ ] T081 Test edge case: Image load failures show fallback placeholders
- [ ] T082 Add ARIA labels and semantic HTML for accessibility (tabs, buttons, loading states)
- [ ] T083 Test keyboard navigation works for WishlistToggle (Tab, Arrow keys)
- [ ] T084 Add screen reader announcements for loading states and view changes (aria-live="polite")
- [ ] T085 Run npm run build and verify TypeScript compilation succeeds with no errors
- [ ] T086 Run npm run lint and fix any ESLint warnings/errors
- [ ] T087 Verify all constitution principles are followed (Feature-Sliced Light, no 'any' types, absolute imports)
- [ ] T088 Update CLAUDE.md with new patterns and components if not already done by speckit.plan

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - No dependencies on US1 (independent)
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion - Uses US1 hooks but can be tested independently
- **User Story 4 (Phase 6)**: Depends on Foundational phase completion - Stub only, minimal dependencies
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent from US1, tests separately
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses US1 moveToInventory hook but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Stub components only, no logic dependencies

### Within Each User Story

- **US1**: Setup → Hooks (useWishlist, useInventoryView) → GearCard extension → Page integration → Testing
- **US2**: Hook (useCommunityAvailability) → Panel component → GearCard integration → Testing
- **US3**: Button component → Hook action (moveToInventory) → Integration → Testing
- **US4**: Stub components → GearCard integration → User testing

### Parallel Opportunities

- **Phase 1**: All tasks except T007 can run in parallel (T001-T006 [P])
- **Phase 2**: All Supabase query tasks can run in parallel (T008-T018 [P])
- **US1**: T019-T020 and T024-T025 can run in parallel (hooks and components independent)
- **US2**: T036-T039 and T040-T044 can run in parallel (hook and component independent)
- **US3**: T052-T054 can run in parallel with T057 (button component and hook action)
- **US4**: All stub component creation can run in parallel (T064, T066 [P])
- **Phase 7**: All i18n translation tasks can run in parallel (T069-T071 [P])

---

## Parallel Example: User Story 1

```bash
# Launch hook creation and component creation together:
Task: "Create hooks/useWishlist.ts implementing UseWishlistReturn interface" (T019)
Task: "Create components/wishlist/WishlistToggle.tsx using shadcn/ui Tabs" (T024)
Task: "Create hooks/useInventoryView.ts for URL-based view state" (T025)

# These can all proceed independently since they work on different files
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database migrations)
2. Complete Phase 2: Foundational (types, validations, query functions)
3. Complete Phase 3: User Story 1 (wishlist CRUD and view switching)
4. **STOP and VALIDATE**: Test User Story 1 independently - users can manage wishlist
5. Deploy/demo if ready - this is a functional MVP!

### Incremental Delivery

1. Complete Setup + Foundational → Database and foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Community availability)
4. Add User Story 3 → Test independently → Deploy/Demo (Move to inventory)
5. Add User Story 4 → Test independently → Deploy/Demo (Future stubs)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T018)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T019-T035) - Core wishlist functionality
   - **Developer B**: User Story 2 (T036-T051) - Community availability
   - **Developer C**: User Story 3 (T052-T063) - Move to inventory
   - **Developer D**: User Story 4 (T064-T068) - Stub components
3. Stories complete and integrate independently
4. Team reconvenes for Phase 7 (Polish) together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No automated tests required per feature specification - manual testing only
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Follow Feature-Sliced Light architecture: Types → Hooks → Components
- Use TypeScript strict mode (no 'any' types)
- All imports must use @/* path alias
- Reuse existing components (GearCard) rather than creating new base components
