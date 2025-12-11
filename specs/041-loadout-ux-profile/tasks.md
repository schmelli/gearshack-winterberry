# Tasks: Loadout UX & Profile Identity

**Input**: Design documents from `/specs/041-loadout-ux-profile/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual testing only (no automated tests in scope per plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

**Note**: User Story 1 (Loadout Search & Filter) is **already implemented** and skipped.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US2, US3, or US2+US3 for shared)
- Include exact file paths in descriptions

## Path Conventions

- **App Router**: `app/[locale]/` for pages
- **Components**: `components/` for UI components
- **Hooks**: `hooks/` for business logic
- **Types**: `types/` for TypeScript interfaces
- **Lib**: `lib/` for utilities
- **Supabase**: `supabase/migrations/` for database changes

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure environment

- [x] T001 Install @react-google-maps/api dependency via `npm install @react-google-maps/api`
- [x] T002 [P] Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.example
- [x] T003 [P] Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local (get from Google Cloud Console)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and type updates that MUST be complete before user story implementation

**CRITICAL**: No user story work can begin until this phase is complete

### Database Migration

- [x] T004 Create database migration file at supabase/migrations/20251211_profile_location.sql with location columns (location_name, latitude, longitude) and constraints

### Type Updates

- [x] T005 [P] Update Profile interface in types/supabase.ts to add locationName, latitude, longitude fields
- [x] T006 [P] Update profiles table types in types/database.ts (Row, Insert, Update) with location columns
- [x] T007 [P] Update MergedUser interface in types/auth.ts to add providerAvatarUrl, locationName, latitude, longitude fields
- [x] T008 [P] Create LocationSelection interface in types/profile.ts for autocomplete results

### Utility Functions

- [x] T009 Create avatar utility functions (getDisplayAvatarUrl, getUserInitials) in lib/utils/avatar.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 2 & 3 - Shared Updates

**Purpose**: Updates to shared files that serve both user stories (prevents merge conflicts)

- [x] T010 [P] [US2+US3] Update profile validation schema in lib/validations/profile-schema.ts to add avatarUrl, locationName, latitude, longitude field validations
- [x] T011 [US2+US3] Update useSupabaseProfile hook in hooks/useSupabaseProfile.ts to handle avatarUrl and location fields (location_name, latitude, longitude) in mapDbRowToProfile and updateProfile
- [x] T012 [US2+US3] Update SupabaseAuthProvider in components/auth/SupabaseAuthProvider.tsx to include providerAvatarUrl, locationName, latitude, longitude in mergedUser

**Checkpoint**: Shared infrastructure updated - story-specific work can now proceed

---

## Phase 4: User Story 2 - Profile Avatar Management (Priority: P2)

**Goal**: Allow users to upload custom profile avatars with fallback chain (custom → provider → initials)

**Independent Test**: Sign in with Google (see provider avatar), upload custom avatar (replaces provider), remove custom avatar (falls back to provider), sign out and back in (avatar persists)

### Implementation for User Story 2

- [x] T013 [US2] Create AvatarUploadInput component in components/profile/AvatarUploadInput.tsx with circular preview, upload button, remove button, and fallback chain display
- [x] T014 [US2] Update ProfileEditForm in components/profile/ProfileEditForm.tsx to include AvatarUploadInput at top of form
- [x] T015 [US2] Update ProfileView in components/profile/ProfileView.tsx to use avatar utilities for proper fallback chain display
- [x] T016 [US2] Update UserMenu in components/layout/UserMenu.tsx to use avatar utilities for header avatar display

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently
- Can upload custom avatar via Cloudinary
- Custom avatar takes precedence over provider avatar
- Removing custom avatar shows provider avatar
- No avatar shows initials
- Avatar persists across sessions

---

## Phase 5: User Story 3 - Profile Location Setting (Priority: P3)

**Goal**: Allow users to set their home location via autocomplete with coordinates for future proximity features

**Independent Test**: Open profile settings, type "Ber", select "Berlin, Germany", save, reload page (location persists), clear location, save (coordinates removed from database)

### Implementation for User Story 3

- [x] T017 [US3] Create useLocationAutocomplete hook in hooks/useLocationAutocomplete.ts with Google Places API integration, debounced search, and place details fetch
- [x] T018 [US3] Create LocationAutocomplete component in components/profile/LocationAutocomplete.tsx with input field, suggestions dropdown, clear button, and error handling
- [x] T019 [US3] Update ProfileEditForm in components/profile/ProfileEditForm.tsx to replace location text field with LocationAutocomplete component

**Checkpoint**: At this point, User Stories 2 AND 3 should both work independently
- Can search and select location via autocomplete
- Location name and coordinates saved to database
- Location persists across sessions
- Can clear location (removes from database)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error handling, and documentation

- [x] T020 Add error handling for network failures in LocationAutocomplete (display retry option, don't block form)
- [x] T021 Add loading state indicators for avatar upload and location search
- [x] T022 Verify avatar displays correctly in all locations (ProfileModal, UserMenu, future components)
- [ ] T023 Run database migration on Supabase dashboard and verify constraints work
- [x] T024 Run npm run build to verify no TypeScript errors
- [x] T025 Run npm run lint to verify code quality
- [ ] T026 Manual testing per quickstart.md checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **Shared Updates (Phase 3)**: Depends on Foundational - updates files used by both stories
- **User Story 2 (Phase 4)**: Depends on Shared Updates completion
- **User Story 3 (Phase 5)**: Depends on Shared Updates completion
- **Polish (Phase 6)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 2 (P2 - Avatar)**: Can start after Shared Updates (Phase 3)
- **User Story 3 (P3 - Location)**: Can start after Shared Updates (Phase 3)

Both user stories can be implemented in parallel after Shared Updates phase completes.

### Within Each User Story

- Hook implementations before component implementations
- Core components before integration updates
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase**:
- T002 and T003 can run in parallel (different files)

**Foundational Phase**:
- T005, T006, T007, T008 can all run in parallel (different type files)

**Shared Updates Phase**:
- T010 can run in parallel with other phases (different file)

**Cross-Story Parallelism**:
- After Shared Updates completes, User Story 2 and User Story 3 can be worked on simultaneously by different developers

---

## Parallel Example: Foundational Phase

```bash
# Launch all type updates together:
Task: "Update Profile interface in types/supabase.ts"
Task: "Update profiles table types in types/database.ts"
Task: "Update MergedUser interface in types/auth.ts"
Task: "Create LocationSelection interface in types/profile.ts"
```

## Parallel Example: User Stories 2 and 3

```bash
# After Shared Updates completes, launch both stories:
# Developer A - User Story 2:
Task: "Create AvatarUploadInput component in components/profile/AvatarUploadInput.tsx"

# Developer B - User Story 3:
Task: "Create LocationAutocomplete component in components/profile/LocationAutocomplete.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: Shared Updates
4. Complete Phase 4: User Story 2 (Avatar)
5. **STOP and VALIDATE**: Test avatar upload/fallback chain
6. Deploy if ready

### Full Implementation

1. Complete Setup + Foundational + Shared Updates → Foundation ready
2. Add User Story 2 (Avatar) → Test independently
3. Add User Story 3 (Location) → Test independently
4. Complete Polish phase → Run full validation
5. Deploy

### Parallel Team Strategy

With two developers after Shared Updates:
- Developer A: User Story 2 (Avatar)
- Developer B: User Story 3 (Location)

Both stories complete independently and integrate via shared types.

---

## Task Summary

| Phase | Task Count | Parallelizable |
|-------|------------|----------------|
| Setup | 3 | 2 |
| Foundational | 6 | 5 |
| Shared Updates | 3 | 1 |
| User Story 2 | 4 | 0 |
| User Story 3 | 3 | 0 |
| Polish | 7 | 0 |
| **Total** | **26** | **8** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- [US2+US3] = shared task that serves both stories (file collision prevention)
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- User Story 1 (Loadout Search & Filter) is already done and skipped
