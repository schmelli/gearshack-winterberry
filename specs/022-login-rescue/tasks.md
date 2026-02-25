# Tasks: Login Rescue Sprint

**Input**: Design documents from `/specs/022-login-rescue/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), quickstart.md (complete)

**Tests**: Not requested - visual verification and build validation only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (Next.js)**: `app/`, `components/`, `hooks/` at repository root
- All paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: No setup needed - all changes modify existing files

**Status**: SKIP - This feature modifies existing files only, no project initialization required.

---

## Phase 2: Foundational

**Purpose**: No foundational work needed - direct modifications to existing hooks and components

**Status**: SKIP - This feature has no blocking prerequisites. All user stories can proceed immediately.

---

## Phase 3: User Story 1 - Access Login Form Immediately (Priority: P1)

**Goal**: Remove the blocking render gate so the login form always renders immediately, regardless of auth or background loading state

**Independent Test**: Navigate to /login and verify the login form is visible within 1 second, even when network is slow or images fail to load

### Implementation for User Story 1

- [x] T001 [US1] Remove blocking `if (loading || user)` render gate (lines 55-62) in `app/login/page.tsx`

**Checkpoint**: Login form should now render immediately. The existing `useEffect` redirect handles authenticated users.

---

## Phase 4: User Story 2 - Graceful Authentication Check (Priority: P1)

**Goal**: Add a 3-second timeout failsafe to the auth hook so loading state never persists indefinitely

**Independent Test**: Simulate a slow/stuck auth service and verify the form becomes accessible within 3 seconds

### Implementation for User Story 2

- [x] T002 [US2] Add `AUTH_TIMEOUT_MS = 3000` constant in `hooks/useAuth.ts`
- [x] T003 [US2] Add `setTimeout` in auth useEffect to force `setLoading(false)` after 3 seconds in `hooks/useAuth.ts`
- [x] T004 [US2] Add `clearTimeout` in `onAuthStateChanged` callback (when auth responds before timeout) in `hooks/useAuth.ts`
- [x] T005 [US2] Add `clearTimeout` in useEffect cleanup function in `hooks/useAuth.ts`

**Checkpoint**: Auth hook will timeout after 3 seconds if Firebase is slow, ensuring form access

---

## Phase 5: User Story 3 - Smooth Background Loading Experience (Priority: P2)

**Goal**: Add 2-second timeout to background image fetching and implement smooth fade-in transition

**Independent Test**: Load the login page and verify backgrounds fade in smoothly while the form remains interactive throughout

### Implementation for User Story 3 - Hook

- [x] T006 [P] [US3] Add `IMAGE_FETCH_TIMEOUT_MS = 2000` constant in `hooks/useBackgroundImages.ts`
- [x] T007 [P] [US3] Create timeout promise using `Promise.race()` pattern in `hooks/useBackgroundImages.ts`
- [x] T008 [US3] Wrap fetch logic with `Promise.race()` and handle timeout errors (fall back to empty array) in `hooks/useBackgroundImages.ts`

### Implementation for User Story 3 - Component

- [x] T009 [US3] Add `imageLoaded` state with `useState(false)` in `components/auth/BackgroundRotator.tsx`
- [x] T010 [US3] Refactor to always render gradient as base layer (remove conditional early return) in `components/auth/BackgroundRotator.tsx`
- [x] T011 [US3] Add `onLoad={() => setImageLoaded(true)}` to Image component in `components/auth/BackgroundRotator.tsx`
- [x] T012 [US3] Add `transition-opacity duration-500` and conditional `opacity-0`/`opacity-100` classes in `components/auth/BackgroundRotator.tsx`

**Checkpoint**: Background images fade in smoothly, gradient always shows first, timeout prevents infinite loading

---

## Phase 6: User Story 4 - Logo Visibility on Login Page (Priority: P2)

**Goal**: Verify the logo displays with original brand colors (no CSS filters)

**Independent Test**: View the login page and verify the logo displays with its original colors, not inverted or filtered

### Verification for User Story 4

- [x] T013 [US4] Verify logo Image component (lines 74-81) has no filter classes (`brightness-0`, `invert`) in `app/login/page.tsx`

**Checkpoint**: Logo displays correctly with brand colors (research.md confirms this is already passing)

---

## Phase 7: Polish & Validation

**Purpose**: Final validation to ensure all changes pass quality gates

- [x] T014 Run `npm run lint` to verify no linting errors
- [x] T015 Run `npm run build` to verify successful production build
- [ ] T016 Run quickstart.md manual testing checklist (form visible < 1s, background fade-in, redirect works)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: SKIPPED - not needed
- **Foundational (Phase 2)**: SKIPPED - not needed
- **User Story 1 (Phase 3)**: Can start immediately - no dependencies (PRIMARY FIX)
- **User Story 2 (Phase 4)**: Can start immediately - no dependencies on US1
- **User Story 3 (Phase 5)**: Can start immediately - no dependencies on US1/US2
- **User Story 4 (Phase 6)**: Can start immediately - verification only
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - modifies only `app/login/page.tsx`
- **User Story 2 (P1)**: Independent - modifies only `hooks/useAuth.ts`
- **User Story 3 (P2)**: Independent - modifies `hooks/useBackgroundImages.ts` and `components/auth/BackgroundRotator.tsx`
- **User Story 4 (P2)**: Independent - verification only, no changes expected

### Parallel Opportunities

All four user stories modify different files and have no dependencies on each other:

```
US1 (app/login/page.tsx)              ─┐
US2 (hooks/useAuth.ts)                ─┼─> All can run in parallel
US3 (hooks/useBackgroundImages.ts +   ─┤
     components/auth/BackgroundRotator.tsx)
US4 (verification only)               ─┘
```

Within User Story 3, tasks T006-T007 are marked [P] and can run in parallel (same file but different, non-overlapping additions).

---

## Parallel Example: All User Stories

```bash
# Launch all user stories in parallel (different files):
Task: "T001 [US1] Remove blocking gate from app/login/page.tsx"
Task: "T002-T005 [US2] Add auth timeout to hooks/useAuth.ts"
Task: "T006-T012 [US3] Add image timeout + fade-in to hooks/useBackgroundImages.ts and components/auth/BackgroundRotator.tsx"
Task: "T013 [US4] Verify logo in app/login/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 - The Fix)

1. Complete Phase 3: User Story 1 (T001 - Remove blocking gate)
2. **STOP and VALIDATE**: Test that login form now appears immediately
3. This single task fixes the infinite spinner bug

### Complete Fix (All Stories)

1. Complete US1: Remove blocking gate (PRIMARY FIX)
2. Complete US2: Add auth timeout (FAILSAFE)
3. Complete US3: Add image timeout + fade-in (POLISH)
4. Complete US4: Verify logo (VERIFICATION)
5. Complete Phase 7: Validation
6. **FINAL VALIDATION**: Run lint, build, and manual testing

### Recommended Execution Order

Since all stories are independent, optimal execution is:
1. Run T001 first (immediately fixes the bug)
2. Run T002-T005, T006-T012, T013 in parallel (or sequentially if single developer)
3. Run T014-T016 sequentially (validation must wait for all changes)

---

## Notes

- All tasks modify existing files - no new files created
- All user stories are independent and can be implemented in any order
- T001 alone fixes the infinite spinner bug (MVP)
- T006-T007 are marked [P] as they add non-overlapping code to the same file
- T013 is verification only - if logo has filters, log findings and fix, but research.md indicates it's already correct
- Total: 16 tasks (13 implementation/verification + 3 validation)

## Task Summary

| User Story | Task Count | Files Modified |
|------------|------------|----------------|
| US1 (P1) | 1 | app/login/page.tsx |
| US2 (P1) | 4 | hooks/useAuth.ts |
| US3 (P2) | 7 | hooks/useBackgroundImages.ts, components/auth/BackgroundRotator.tsx |
| US4 (P2) | 1 | app/login/page.tsx (verification) |
| Validation | 3 | N/A |
| **Total** | **16** | **4 files** |
