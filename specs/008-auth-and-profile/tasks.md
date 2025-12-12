# Tasks: Identity & Access with Profile Management

**Input**: Design documents from `/specs/008-auth-and-profile/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual testing only (no test framework configured per plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Optimized for parallel agent execution.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions (Next.js App Router)

- **Pages**: `app/` directory
- **Components**: `components/` directory
- **Hooks**: `hooks/` directory
- **Types**: `types/` directory
- **Utilities**: `lib/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and Firebase configuration

- [x] T001 Install Firebase dependency: `npm install firebase`
- [x] T002 [P] Create environment variable template in `.env.example` with Firebase config keys
- [x] T003 [P] Update `next.config.ts` to add image remote patterns for `firebasestorage.googleapis.com` and `lh3.googleusercontent.com`
- [x] T004 [P] Create Firebase configuration in `lib/firebase/config.ts` with app initialization
- [x] T005 [P] Create auth types in `types/auth.ts` (AuthUser, UserProfile, MergedUser interfaces)
- [x] T006 [P] Create profile form types in `types/profile.ts` (ProfileFormData, LoginFormData, RegistrationFormData)
- [x] T007 [P] Create profile validation schema in `lib/validations/profile-schema.ts` using Zod

**Checkpoint**: Firebase configured, types defined, ready for foundational components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create Firebase auth utilities in `lib/firebase/auth.ts` (signInWithGoogle, signInWithEmail, registerWithEmail, sendPasswordReset, signOut functions)
- [x] T009 Create Firestore utilities in `lib/firebase/firestore.ts` (getProfile, updateProfile, createDefaultProfile functions)
- [x] T010 Create `useAuth` hook in `hooks/useAuth.ts` with Firebase Auth state management and onAuthStateChanged listener (FR-003: persists auth across refreshes)
- [x] T011 Create `useProfile` hook in `hooks/useProfile.ts` with Firestore profile CRUD operations, merge logic (FR-011, FR-012: merge Auth+Profile, avatar priority), and profile state management (fetching only - creation delegated to T019)
- [x] T012 Create `AuthProvider` component in `components/auth/AuthProvider.tsx` wrapping children with auth context
- [x] T013 Update `app/layout.tsx` to wrap application with AuthProvider
- [x] T014 Create `ProtectedRoute` component in `components/auth/ProtectedRoute.tsx` with redirect logic and loading state

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Google Sign-In (Priority: P1) 🎯 MVP

**Goal**: Enable users to sign in with Google OAuth and access protected content

**Independent Test**: Click "Sign in with Google", complete OAuth flow, verify redirect to /inventory with user avatar in header

### Implementation for User Story 1

- [x] T015 [P] [US1] Create `GoogleSignInButton` component in `components/auth/GoogleSignInButton.tsx` with OAuth trigger
- [x] T016 [P] [US1] Create `AvatarWithFallback` component in `components/profile/AvatarWithFallback.tsx` with initials fallback
- [x] T017 [US1] Create login page at `app/login/page.tsx` with basic layout and Google sign-in button
- [x] T018 [US1] Update `UserMenu` in `components/layout/UserMenu.tsx` to show user avatar and display name when authenticated
- [x] T019 [US1] Add first-time user detection and automatic profile creation to `useProfile` hook using `createDefaultProfile` from `lib/firebase/firestore.ts` (triggers when Firestore document doesn't exist)
- [x] T020 [US1] Add redirect after successful Google sign-in to originally requested page or /inventory

**Checkpoint**: Google Sign-In fully functional, user can authenticate and see their profile in header

---

## Phase 4: User Story 2 - Email/Password Authentication (Priority: P1)

**Goal**: Enable users to register and sign in with email/password

**Independent Test**: Complete registration form, then log in with credentials, verify redirect to protected content

### Implementation for User Story 2

- [x] T021 [P] [US2] Create `LoginForm` component in `components/auth/LoginForm.tsx` with email/password fields and validation
- [x] T022 [P] [US2] Create `RegistrationForm` component in `components/auth/RegistrationForm.tsx` with email/password/confirm fields
- [x] T023 [P] [US2] Create `ForgotPasswordForm` component in `components/auth/ForgotPasswordForm.tsx` with email field and reset trigger
- [x] T024 [US2] Update login page `app/login/page.tsx` to include LoginForm, RegistrationForm toggle, and ForgotPassword link
- [x] T025 [US2] Add error message display for failed authentication attempts (generic messages to prevent email enumeration)
- [x] T026 [US2] Add success toast notification after password reset email sent

**Checkpoint**: Email/Password authentication fully functional alongside Google Sign-In

---

## Phase 5: User Story 3 - View Profile Modal (Priority: P1)

**Goal**: Display user profile information in a modal accessible from header menu

**Independent Test**: Sign in, click "Profile" in user menu, verify modal shows avatar, display name, trail name, bio, location, social links

### Implementation for User Story 3

- [x] T027 [P] [US3] Create `ProfileView` component in `components/profile/ProfileView.tsx` with read-only profile display
- [x] T028 [P] [US3] Create social link icons component (Instagram, Facebook, YouTube, website) in `ProfileView`
- [x] T029 [US3] Create `ProfileModal` component in `components/profile/ProfileModal.tsx` using shadcn Dialog
- [x] T030 [US3] Add VIP badge/indicator display in `ProfileView` when `isVIP` is true
- [x] T031 [US3] Update `UserMenu` to add "Profile" menu item that opens ProfileModal
- [x] T032 [US3] Ensure profile data merges correctly (Firestore avatarUrl > Auth photoURL)

**Checkpoint**: Profile viewing fully functional, user can see all their profile information

---

## Phase 6: User Story 4 - Edit Profile (Priority: P2)

**Goal**: Allow users to edit their profile information with validation

**Independent Test**: Open profile modal, click Edit, modify fields, save, verify changes persist after refresh

### Implementation for User Story 4

- [x] T033 [P] [US4] Create `ProfileEditForm` component in `components/profile/ProfileEditForm.tsx` with react-hook-form and Zod validation
- [x] T034 [US4] Add view/edit mode toggle to `ProfileModal` component
- [x] T035 [US4] Implement form field validation (displayName 2-50 chars, trailName 2-30 chars, bio max 500, URL validation)
- [x] T036 [US4] Implement save action with Firestore update preserving `isVIP` and `first_launch` fields
- [x] T037 [US4] Implement cancel action that discards unsaved changes
- [x] T038 [US4] Add toast notifications for save success/error using sonner

**Checkpoint**: Profile editing fully functional with validation and persistence

---

## Phase 7: User Story 5 - Immersive Login Experience (Priority: P2)

**Goal**: Create visually appealing login page with rotating nature backgrounds

**Independent Test**: Navigate to login page, observe background image, wait 5-10 seconds for rotation, verify glassmorphism card

### Implementation for User Story 5

- [x] T039 [P] [US5] Create `useBackgroundImages` hook in `hooks/useBackgroundImages.ts` to fetch images from Firebase Storage
- [x] T040 [P] [US5] Create `BackgroundRotator` component in `components/auth/BackgroundRotator.tsx` with image preloading and smooth transitions
- [x] T041 [US5] Update login page `app/login/page.tsx` to use BackgroundRotator as full-bleed background
- [x] T042 [US5] Style login card with glassmorphism effect (backdrop-blur, semi-transparent background)
- [x] T043 [US5] Add fallback gradient/static image when Firebase Storage images unavailable
- [x] T044 [US5] Configure rotation interval (5-10 seconds) with smooth CSS transitions

**Checkpoint**: Immersive login experience complete with rotating backgrounds

---

## Phase 8: User Story 6 - Route Protection (Priority: P1)

**Goal**: Protect /inventory, /loadouts, and /settings routes from unauthenticated access

**Independent Test**: While logged out, navigate directly to /inventory, /loadouts, /settings - verify redirect to /login

### Implementation for User Story 6

- [x] T045 [P] [US6] Wrap `/app/inventory/page.tsx` content with ProtectedRoute component
- [x] T046 [P] [US6] Wrap `/app/loadouts/page.tsx` content with ProtectedRoute component
- [x] T047 [P] [US6] Wrap `/app/settings/page.tsx` content with ProtectedRoute component
- [x] T048 [US6] Implement return URL preservation in ProtectedRoute (store in query param)
- [x] T049 [US6] Implement redirect back to original URL after successful authentication
- [x] T050 [US6] Ensure home page "/" remains publicly accessible (no protection wrapper)

**Checkpoint**: All protected routes redirect unauthenticated users, return URL preserved

---

## Phase 9: User Story 7 - Sign Out (Priority: P2)

**Goal**: Allow users to securely sign out and clear their session

**Independent Test**: Sign in, click Sign Out in user menu, verify redirect to login with cleared session

### Implementation for User Story 7

- [x] T051 [US7] Add "Sign Out" menu item to `UserMenu` component
- [x] T052 [US7] Implement sign out action that calls Firebase signOut and clears auth state
- [x] T053 [US7] Redirect to /login after successful sign out
- [x] T054 [US7] Verify protected routes redirect after sign out (session fully cleared)

**Checkpoint**: Sign out fully functional, session completely cleared

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and validation

- [x] T055 [P] Add loading skeletons for auth state transitions in ProtectedRoute
- [x] T056 [P] Add loading state to GoogleSignInButton during OAuth flow
- [x] T057 [P] Add loading state to LoginForm during sign-in
- [x] T058 Verify all error messages are user-friendly and don't reveal sensitive info
- [x] T059 Run `npm run lint` and fix any ESLint errors
- [x] T060 Run `npm run build` and fix any TypeScript errors
- [ ] T061 Run quickstart.md validation checklist manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if using multiple agents)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Depends On | Can Parallel With |
|-------|----------|------------|-------------------|
| US1 - Google Sign-In | P1 | Phase 2 only | US2, US6 |
| US2 - Email/Password | P1 | Phase 2 only | US1, US6 |
| US3 - View Profile | P1 | US1 or US2 (need auth) | US6, US7 |
| US4 - Edit Profile | P2 | US3 (need view first) | US5, US7 |
| US5 - Immersive Login | P2 | Phase 2 only | US1, US2, US4, US6, US7 |
| US6 - Route Protection | P1 | Phase 2 only | US1, US2, US5 |
| US7 - Sign Out | P2 | US1 or US2 (need auth) | US4, US5 |

### Within Each User Story

- Models/Types before hooks
- Hooks before components
- Components before pages
- Core implementation before integration

---

## Parallel Execution Examples

### Maximum Parallelism (5 Agents)

After Phase 2 (Foundational) completes:

```text
Agent 1: US1 - Google Sign-In (T015-T020)
Agent 2: US2 - Email/Password (T021-T026)
Agent 3: US5 - Immersive Login (T039-T044)
Agent 4: US6 - Route Protection (T045-T050)
Agent 5: Setup remaining parallel tasks if any

Then after US1/US2 complete:
Agent 1: US3 - View Profile (T027-T032)
Agent 2: US4 - Edit Profile (T033-T038)
Agent 3: US7 - Sign Out (T051-T054)
```

### Within Phase 1 (Setup) - Parallel Tasks

```text
Agent 1: T002 - .env.example
Agent 2: T003 - next.config.ts
Agent 3: T004 - lib/firebase/config.ts
Agent 4: T005 - types/auth.ts
Agent 5: T006 - types/profile.ts
Agent 6: T007 - lib/validations/profile-schema.ts
```

### Within US2 (Email/Password) - Parallel Tasks

```text
Agent 1: T021 - LoginForm component
Agent 2: T022 - RegistrationForm component
Agent 3: T023 - ForgotPasswordForm component
```

### Within US6 (Route Protection) - Parallel Tasks

```text
Agent 1: T045 - Wrap inventory page
Agent 2: T046 - Wrap loadouts page
Agent 3: T047 - Wrap settings page
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T014)
3. Complete US1: Google Sign-In (T015-T020)
4. Complete US6: Route Protection (T045-T050)
5. **STOP and VALIDATE**: Test sign-in and route protection
6. Deploy/demo MVP with Google auth only

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US6 → Google auth with protection (MVP!)
3. Add US2 → Email/password auth option
4. Add US3 → View profile modal
5. Add US5 → Immersive login experience
6. Add US4 → Edit profile functionality
7. Add US7 → Sign out functionality
8. Polish phase → Final refinements

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 61 |
| **Phase 1 (Setup)** | 7 tasks |
| **Phase 2 (Foundational)** | 7 tasks |
| **US1 - Google Sign-In** | 6 tasks |
| **US2 - Email/Password** | 6 tasks |
| **US3 - View Profile** | 6 tasks |
| **US4 - Edit Profile** | 6 tasks |
| **US5 - Immersive Login** | 6 tasks |
| **US6 - Route Protection** | 6 tasks |
| **US7 - Sign Out** | 4 tasks |
| **Phase 10 (Polish)** | 7 tasks |
| **Parallelizable Tasks** | 28 tasks marked [P] |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Firebase environment variables must be configured before testing
