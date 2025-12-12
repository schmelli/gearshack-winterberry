# Implementation Plan: Loadout UX & Profile Identity

**Branch**: `041-loadout-ux-profile` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-loadout-ux-profile/spec.md`

## Summary

Implement P2 (Profile Avatar Management) and P3 (Profile Location Setting) for user profiles. **P1 (Loadout Search & Filter) is already implemented and skipped.**

**P2 - Avatar**: Add custom avatar upload via Cloudinary with fallback chain (custom → provider → initials). Reuses existing Cloudinary infrastructure.

**P3 - Location**: Add location autocomplete using Google Places API, storing city name with geographic coordinates (lat/lng) for future proximity-based features (Gear Sharing Circles).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 19+ + Next.js 16 (App Router)
**Primary Dependencies**: @supabase/supabase-js, @react-google-maps/api (new), react-hook-form, zod, shadcn/ui
**Storage**: PostgreSQL (Supabase), Cloudinary (images)
**Testing**: Manual testing via dev server (no automated tests in scope)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Avatar upload <3s, location autocomplete <1s
**Constraints**: Cloudinary unsigned uploads, Google Places API quota
**Scale/Scope**: Single-user profile, ~10 active users (beta)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | PASS | Logic in hooks (useCloudinaryUpload, useLocationAutocomplete), UI stateless |
| II. TypeScript Strict Mode | PASS | All types defined in types/, no any usage |
| III. Design System Compliance | PASS | Uses shadcn/ui components (Avatar, Input, Dialog, Button) |
| IV. Spec-Driven Development | PASS | Specification completed before planning |
| V. Import and File Organization | PASS | All imports use @/* alias, organized by feature |

**Post-Phase 1 Re-check**: PASS - No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/041-loadout-ux-profile/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── profile-api.md   # API contracts
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── [locale]/
│   └── ...              # Existing pages (no changes)

components/
├── profile/
│   ├── ProfileModal.tsx       # Existing (no changes)
│   ├── ProfileView.tsx        # Modify: avatar display
│   ├── ProfileEditForm.tsx    # Modify: add avatar upload, location autocomplete
│   ├── AvatarUploadInput.tsx  # NEW: avatar upload component
│   └── LocationAutocomplete.tsx # NEW: location picker component

hooks/
├── useSupabaseProfile.ts      # Modify: add location fields
├── useCloudinaryUpload.ts     # Existing (reuse for avatar)
└── useLocationAutocomplete.ts # NEW: Google Places integration

lib/
├── utils/
│   └── avatar.ts              # NEW: avatar utilities
└── validations/
    └── profile-schema.ts      # Modify: add location validation

types/
├── supabase.ts               # Modify: Profile type with location
├── database.ts               # Modify: profiles table types
├── auth.ts                   # Modify: MergedUser with location
└── profile.ts                # NEW: LocationSelection type

supabase/
└── migrations/
    └── 20251211_profile_location.sql  # NEW: Add location columns
```

**Structure Decision**: Next.js App Router with Feature-Sliced Light architecture. New components in `components/profile/`, hooks in `hooks/`, utilities in `lib/utils/`.

## Complexity Tracking

> No Constitution violations. All implementations follow established patterns.

| Area | Approach | Justification |
|------|----------|---------------|
| Avatar upload | Reuse useCloudinaryUpload | Proven infrastructure, consistent UX |
| Location autocomplete | Google Places API | Industry standard, excellent UX |
| State management | React hooks + Supabase | Follows existing patterns |

## Design Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data Model | [data-model.md](./data-model.md) | Complete |
| API Contracts | [contracts/profile-api.md](./contracts/profile-api.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |

## Next Steps

Run `/speckit.tasks` to generate implementation tasks based on this plan.
