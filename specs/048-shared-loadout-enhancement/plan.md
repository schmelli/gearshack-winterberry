# Implementation Plan: Shared Loadout Enhancement

**Branch**: `048-shared-loadout-enhancement` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-shared-loadout-enhancement/spec.md`

## Summary

Enhance the shared loadout page (`/shakedown/[token]`) to provide differentiated experiences for anonymous and signed-in users. Anonymous visitors see a landing-style page with hero header, premium gear cards, and signup CTA. Signed-in users see the page within the app shell with owned-item indicators, wishlist integration, and profile access. Comment notifications are added for loadout owners.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, Zustand 5.x, shadcn/ui, Tailwind CSS 4, next-intl, Sonner (toast)
**Storage**: PostgreSQL (Supabase) - existing `loadout_shares`, `loadout_comments`, `gear_items`, `profiles` tables + new `source_share_token` column
**Testing**: Manual testing, TypeScript compiler validation
**Target Platform**: Web (responsive: mobile + desktop)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Page load < 3 seconds, modal open < 1 second
**Constraints**: Must reuse existing GearCard, GearDetailModal, ProfileView components per constitution
**Scale/Scope**: Single page enhancement with 2 variants (anonymous/authenticated)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | New logic in `useSharedLoadout` hook; UI components stateless |
| II. TypeScript Strict Mode | PASS | All new code will use explicit types, no `any` |
| III. Design System Compliance | PASS | Reusing existing GearCard, GearDetailModal, ProfileView, Button, Badge |
| IV. Spec-Driven Development | PASS | Spec complete with 8 user stories and 14 functional requirements |
| V. Import and File Organization | PASS | All imports via `@/*` alias, feature-scoped files |

**Gate Status**: PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/048-shared-loadout-enhancement/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
└── [locale]/
    └── shakedown/
        └── [token]/
            └── page.tsx              # Modified: auth detection + conditional rendering

components/
└── shakedown/
    ├── SharedLoadoutHero.tsx         # NEW: Hero header for anonymous users
    ├── SharedLoadoutAppView.tsx      # NEW: In-app view for signed-in users
    ├── SharedGearCard.tsx            # NEW: Extended GearCard with owned/wishlist indicators
    ├── SharedGearGrid.tsx            # NEW: Category-grouped gear grid
    ├── SignupCTA.tsx                 # NEW: Call-to-action component
    └── OwnerProfilePreview.tsx       # NEW: Clickable owner avatar + profile modal

hooks/
├── useSharedLoadout.ts               # NEW: Main orchestration hook
├── useOwnedItemsCheck.ts             # NEW: Check viewer's inventory for matches
└── useWishlistActions.ts             # NEW: Add items to wishlist

types/
└── sharing.ts                        # Modified: Extended payload types

lib/
└── supabase/
    └── queries/
        └── sharing.ts                # NEW: Supabase queries for shared loadout

actions/
└── sharing.ts                        # NEW: Server actions for wishlist add
```

**Structure Decision**: Web application with Next.js App Router. New components scoped to `components/shakedown/` feature directory. Business logic in hooks per Feature-Sliced Light.

## Complexity Tracking

> No constitution violations - table not needed
