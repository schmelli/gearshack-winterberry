# Implementation Plan: Identity & Access with Profile Management

**Branch**: `008-auth-and-profile` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-auth-and-profile/spec.md`

## Summary

Implement Firebase Authentication (Google OAuth + Email/Password) with integrated profile management using existing Firestore data from the 'gearshack-springbreak' Firebase project. Features include route protection for /inventory, /loadouts, and /settings, an immersive login page with rotating backgrounds, and a profile modal for viewing/editing user data stored at `userBase/{uid}`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Firebase Auth, Firebase Firestore, Firebase Storage, shadcn/ui, Tailwind CSS 4, react-hook-form + zod, sonner (toast)
**Storage**: Firebase Firestore (`userBase/{uid}`), Firebase Storage (`backgrounds/hd`)
**Testing**: Manual testing (no test framework configured)
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Login < 10s, Modal open < 500ms, Profile merge < 2s
**Constraints**: Must connect to existing Firebase project, preserve legacy Firestore fields
**Scale/Scope**: MVP for single user, existing data migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | Auth logic in hooks (useAuth, useProfile), UI stateless |
| II. TypeScript Strict Mode | PASS | All types defined in @/types, Zod for validation |
| III. Design System Compliance | PASS | Using shadcn Dialog, Button, Input, Form, Avatar |
| IV. Spec-Driven Development | PASS | Spec complete with 7 user stories, 30+ FRs |
| V. Import and File Organization | PASS | @/* imports, feature-organized components |

**Gate Status**: PASSED - Proceed to Phase 0

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | useAuth, useProfile, useBackgroundImages hooks contain all logic |
| II. TypeScript Strict Mode | PASS | Zod schemas in contracts/, types in types/ |
| III. Design System Compliance | PASS | Dialog, Button, Input, Form, Avatar, Sheet from shadcn/ui |
| IV. Spec-Driven Development | PASS | data-model.md, contracts/, quickstart.md complete |
| V. Import and File Organization | PASS | components/auth/, components/profile/, lib/firebase/ |

**Gate Status**: PASSED - Ready for /speckit.tasks

## Project Structure

### Documentation (this feature)

```text
specs/008-auth-and-profile/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── layout.tsx           # Add AuthProvider wrapper
├── login/
│   └── page.tsx         # NEW: Immersive login page
├── inventory/
│   └── page.tsx         # Wrap with route protection
├── loadouts/
│   └── page.tsx         # Wrap with route protection
└── settings/
    └── page.tsx         # Wrap with route protection

components/
├── auth/
│   ├── AuthProvider.tsx      # NEW: Firebase Auth context provider
│   ├── ProtectedRoute.tsx    # NEW: Route protection wrapper
│   ├── LoginForm.tsx         # NEW: Email/password form
│   ├── GoogleSignInButton.tsx # NEW: OAuth button
│   ├── ForgotPasswordForm.tsx # NEW: Password reset
│   └── BackgroundRotator.tsx # NEW: Login background images
├── profile/
│   ├── ProfileModal.tsx      # NEW: View/Edit profile dialog
│   ├── ProfileView.tsx       # NEW: Read-only profile display
│   ├── ProfileEditForm.tsx   # NEW: Edit form with validation
│   └── AvatarWithFallback.tsx # NEW: Avatar with initials fallback
└── layout/
    └── UserMenu.tsx          # MODIFY: Add profile menu item

hooks/
├── useAuth.ts           # NEW: Firebase Auth state & actions
├── useProfile.ts        # NEW: Firestore profile CRUD
└── useBackgroundImages.ts # NEW: Storage image fetching

lib/
├── firebase/
│   ├── config.ts        # NEW: Firebase initialization
│   ├── auth.ts          # NEW: Auth utilities
│   └── firestore.ts     # NEW: Firestore utilities
└── validations/
    └── profile-schema.ts # NEW: Zod schema for profile

types/
├── auth.ts              # NEW: AuthUser, UserProfile, MergedUser
└── profile.ts           # NEW: Profile form types
```

**Structure Decision**: Web application using Next.js App Router with feature-organized components under `components/auth/` and `components/profile/`. Firebase utilities isolated in `lib/firebase/`.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
