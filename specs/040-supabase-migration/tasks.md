# Tasks: Migration from Firebase to Supabase (Greenfield)

**Input**: Design documents from `/specs/040-supabase-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **Supabase clients**: `lib/supabase/`
- **Hooks**: `hooks/`
- **Types**: `types/`
- **Auth pages**: `app/(auth)/`
- **Protected routes**: `app/(protected)/`
- **Middleware**: `middleware.ts` at root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, environment configuration

- [x] T001 Install Supabase dependencies: `npm install @supabase/supabase-js @supabase/ssr`
- [x] T002 Remove Firebase dependencies: `npm uninstall firebase firebase-admin`
- [x] T003 [P] Add Supabase environment variables to `.env.local` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [x] T004 [P] Add Supabase environment variables to `.env.example` for documentation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Supabase infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema Setup

**Note**: Database tasks T005-T013 have been prepared in `supabase/migrations/20251210_initial_schema.sql`.
Run this SQL in Supabase Dashboard > SQL Editor to complete these tasks.

- [ ] T005 Create PostgreSQL enums (gear_condition, gear_status, weight_unit, activity_type, season) via Supabase SQL Editor per `data-model.md`
- [ ] T006 Create `profiles` table with RLS policies per `data-model.md`
- [ ] T007 Create `categories` table with public read RLS policy per `data-model.md`
- [ ] T008 Create `gear_items` table with full schema (~30 fields) and RLS policies per `data-model.md`
- [ ] T009 Create `loadouts` table with RLS policies per `data-model.md`
- [ ] T010 Create `loadout_items` junction table with CASCADE deletes and RLS policies per `data-model.md`
- [ ] T011 Create `handle_new_user()` trigger function for auto-creating profiles on signup per `data-model.md`
- [ ] T012 Create `update_updated_at()` trigger function and apply to profiles, gear_items, loadouts per `data-model.md`
- [ ] T013 Seed categories table with gear taxonomy data (Shelter, Sleep System, Clothing, etc.)

### Supabase Client Infrastructure

- [x] T014 [P] Create browser client in `lib/supabase/client.ts` using createBrowserClient from @supabase/ssr
- [x] T015 [P] Create server client in `lib/supabase/server.ts` using createServerClient with cookie handling
- [x] T016 Create middleware for session refresh in `middleware.ts` at project root
- [x] T017 Generate TypeScript types from database schema: `npx supabase gen types typescript` to `types/database.ts`

### Type Updates

- [x] T018 Update `types/gear.ts` GearStatus enum to include 'lent' and 'retired' statuses, rename 'active' to 'own'
- [x] T019 [P] Create `types/supabase.ts` with Supabase-specific types (auth user, session, etc.)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - User Registration and Login (Priority: P1) 🎯 MVP

**Goal**: Users can register, login (email/password or magic link), and maintain sessions across page refreshes

**Independent Test**: Create a new account with email/password, log out, then log back in. Verify the user session persists across page refreshes.

### Implementation for User Story 1

- [x] T020 [US1] Create `hooks/useSupabaseAuth.ts` with signUp, signIn, signOut, signInWithOtp methods
- [x] T021 [US1] Add session state management and onAuthStateChange listener in `hooks/useSupabaseAuth.ts`
- [x] T022 [US1] Create auth callback route handler in `app/auth/callback/route.ts` for magic link exchange
- [ ] T023 [US1] Update login page to use Supabase auth in `app/[locale]/login/page.tsx`
- [ ] T024 [US1] Add magic link request form to login page in `app/[locale]/login/page.tsx`
- [x] T025 [US1] Create `hooks/useSupabaseProfile.ts` for fetching/updating user profile from profiles table
- [ ] T026 [US1] Add profile display name edit capability to user menu or settings (if settings UI exists)
- [x] T027 [US1] Create `components/auth/SupabaseAuthProvider.tsx` for protected route layouts
- [x] T028 [US1] Handle auth errors (duplicate email, expired magic link) with user-friendly messages

**Checkpoint**: At this point, User Story 1 should be fully functional - users can register, login, and sessions persist

---

## Phase 4: User Story 2 - Gear Item Management (Priority: P1)

**Goal**: Authenticated users can create, read, update, and delete gear items with full field parity

**Independent Test**: Create a gear item with all fields populated (including a Cloudinary image URL), verify it appears in the inventory list, edit it, then delete it.

### Implementation for User Story 2

- [x] T029 [US2] Create `hooks/useGearItems.ts` with fetchAll, create, update, delete methods using Supabase client
- [x] T030 [US2] Add real-time subscription for gear items in `hooks/useGearItems.ts` (optional optimization)
- [x] T031 [US2] Create helper functions for camelCase ↔ snake_case field mapping in `lib/supabase/transformers.ts`
- [x] T032 [US2] Implement weight unit conversion helpers (g↔oz↔lb) in `lib/utils/weight.ts` per FR-012
- [x] T033 [US2] Create `hooks/useSupabaseStore.ts` as Supabase-compatible replacement for useStore/useGearEditor
- [ ] T034 [US2] Update inventory page to fetch gear items via Supabase in `app/[locale]/inventory/page.tsx`
- [ ] T035 [US2] Update gear editor form to save via Supabase in `components/gear-editor/GearEditorForm.tsx`
- [ ] T036 [US2] Update gear card component to display Supabase data in `components/inventory-gallery/GearCard.tsx`
- [x] T037 [US2] Add category filtering via Supabase query in `hooks/useGearItems.ts`
- [ ] T038 [US2] Handle validation errors and network failures with toast notifications

**Checkpoint**: At this point, Users can manage gear items end-to-end with Supabase

---

## Phase 5: User Story 3 - Data Privacy and Security (Priority: P1)

**Goal**: Enforce strict data isolation via RLS - users can only access their own data

**Independent Test**: Create two test accounts, add items to each, then verify that User A cannot see or access User B's items through any means.

### Implementation for User Story 3

- [ ] T039 [US3] Verify RLS policies block cross-user SELECT queries in Supabase SQL Editor
- [ ] T040 [US3] Verify RLS policies block cross-user UPDATE/DELETE queries in Supabase SQL Editor
- [ ] T041 [US3] Add user_id to all gear item insert operations in `hooks/useGearItems.ts`
- [ ] T042 [US3] Ensure unauthenticated API requests return empty results (test via browser network tab)
- [ ] T043 [US3] Add error handling for authorization failures with appropriate user feedback

**Checkpoint**: At this point, all data access is properly isolated per user

---

## Phase 6: User Story 4 - Loadout Management (Priority: P2)

**Goal**: Users can create loadouts, add/remove gear items, and see weight calculations

**Independent Test**: Create a loadout, add existing gear items to it, verify weight calculations are correct, then remove items and delete the loadout.

### Implementation for User Story 4

- [x] T044 [US4] Create `hooks/useLoadouts.ts` with fetchAll, create, update, delete methods using Supabase client
- [x] T045 [US4] Add user_id to all loadout insert operations in `hooks/useLoadouts.ts`
- [x] T046 [US4] Add loadout items CRUD (addItem, removeItem, updateItemState) in `hooks/useLoadouts.ts`
- [x] T047 [US4] Implement weight calculation functions (total, base, worn, consumable) in `hooks/useLoadouts.ts`
- [ ] T048 [US4] Update loadouts page to fetch loadouts via Supabase in `app/[locale]/loadouts/page.tsx`
- [ ] T049 [US4] Update loadout editor to use new Supabase-backed useLoadouts hook
- [ ] T050 [US4] Verify CASCADE delete works when gear item is deleted (item removed from all loadouts)
- [ ] T051 [US4] Handle empty loadout state (0 items, 0 weight) gracefully in UI

**Checkpoint**: At this point, all four user stories are complete and independently testable

---

## Phase 7: Firebase Removal & Cleanup

**Purpose**: Complete removal of Firebase code and dependencies

- [ ] T052 Remove `lib/firebase/` directory completely
- [ ] T053 Remove `hooks/useAuth.ts` (replaced by useSupabaseAuth)
- [ ] T054 Remove `hooks/useGearInventory.ts` (replaced by useGearItems)
- [ ] T055 [P] Remove Firebase environment variables from `.env.local`
- [ ] T056 [P] Update `.env.example` to remove Firebase variables
- [ ] T057 Search codebase for remaining Firebase imports and remove them
- [ ] T058 Run `npm run build` to verify no Firebase references remain
- [ ] T059 Run `npm run lint` to ensure code quality

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and improvements

- [ ] T060 Validate quickstart.md checklist items work correctly
- [ ] T061 Test registration flow completes in under 60 seconds (SC-001)
- [ ] T062 Test session persistence across browser refresh (SC-005)
- [ ] T063 Test magic link email delivery time < 30s (SC-007)
- [ ] T064 Test inventory list load time < 2s for large datasets (SC-003)
- [ ] T065 Test gear item creation time < 5s (SC-002)
- [ ] T066 Verify Cloudinary image URLs display correctly after migration (SC-006)
- [ ] T067 Verify weight calculations are accurate to 0.1 grams (SC-008)
- [ ] T068 Update CLAUDE.md with Supabase technology references

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Auth foundation
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 auth working
- **User Story 3 (Phase 5)**: Depends on US1 + US2 for verification
- **User Story 4 (Phase 6)**: Depends on Foundational + US2 (needs gear items to exist)
- **Firebase Removal (Phase 7)**: After all user stories are verified working
- **Polish (Phase 8)**: Final phase after all implementation complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (Database + Clients)
    ↓
    ├── Phase 3: US1 - Auth (P1) 🎯 MVP
    │       ↓
    ├── Phase 4: US2 - Gear Items (P1)
    │       ↓
    ├── Phase 5: US3 - Security (P1)
    │       ↓
    └── Phase 6: US4 - Loadouts (P2)
            ↓
Phase 7: Firebase Removal
    ↓
Phase 8: Polish
```

### Within Each User Story

- Hooks before UI components
- Core CRUD before advanced features
- Error handling after happy path works

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003 and T004 can run in parallel (different files)

**Phase 2 (Foundational)**:
- T014 and T015 can run in parallel (different client files)
- T018 and T019 can run in parallel (different type files)

**Phase 7 (Cleanup)**:
- T055 and T056 can run in parallel (different env files)

---

## Parallel Example: Phase 2 - Foundational

```bash
# Database schema tasks must be sequential (table dependencies):
T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013

# Supabase clients can run in parallel:
Task: "Create browser client in lib/supabase/client.ts" (T014)
Task: "Create server client in lib/supabase/server.ts" (T015)

# Type updates can run in parallel:
Task: "Update types/gear.ts GearStatus enum" (T018)
Task: "Create types/supabase.ts" (T019)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Authentication
4. **STOP and VALIDATE**: Test registration, login, magic link, session persistence
5. Demo MVP: Users can create accounts and login

### Incremental Delivery

1. Setup + Foundational → Database and clients ready
2. Add User Story 1 → Auth works → MVP Demo
3. Add User Story 2 → Gear items CRUD works
4. Add User Story 3 → Security verified
5. Add User Story 4 → Loadouts work
6. Remove Firebase → Clean codebase
7. Polish → Production ready

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1)**

This delivers:
- Working Supabase authentication
- User registration with email/password
- Magic link passwordless login
- Session persistence
- Profile auto-creation

Users can log in and see an empty inventory - foundation for all subsequent features.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Database tasks (T005-T013) should be run in Supabase Dashboard or via migrations
- Offline/network retry handling deferred to future enhancement (spec edge case noted but not in MVP scope)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
