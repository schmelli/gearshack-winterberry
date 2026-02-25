# Implementation Plan: Unified Gear Detail Modal with External Intelligence

**Branch**: `045-gear-detail-modal` | **Date**: 2025-12-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/045-gear-detail-modal/spec.md`

## Summary

Create a unified modal component for viewing gear item details accessible from inventory and loadout views. The modal displays local gear data instantly (<100ms) while asynchronously fetching external intelligence from YouTube Data API v3 (product reviews) and GearGraph API (gear insights). YouTube results are cached in a shared database table with 7-day TTL to minimize API quota consumption.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui (Dialog, Sheet), Tailwind CSS 4, zod (validation)
**Storage**: PostgreSQL (Supabase) - existing gear_items table + new api_cache table
**Testing**: Manual testing (no test framework configured)
**Target Platform**: Web (responsive: desktop modal, mobile full-screen sheet)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Modal opens <100ms with local data, external data loads <3s
**Constraints**: YouTube API quota (~100 searches/day with free tier), GearGraph availability uncertain
**Scale/Scope**: Single user viewing their gear, cache shared across all users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. Feature-Sliced Light Architecture | **PASS** | Modal UI stateless, logic in hooks (`useGearDetailModal`, `useYouTubeReviews`, `useGearInsights`) |
| II. TypeScript Strict Mode | **PASS** | All types defined in `@/types`, no `any` allowed |
| III. Design System Compliance | **PASS** | Uses shadcn/ui Dialog (desktop) + Sheet (mobile), Tailwind only |
| IV. Spec-Driven Development | **PASS** | Spec exists at `/specs/045-gear-detail-modal/spec.md` |
| V. Import and File Organization | **PASS** | All imports use `@/*` alias |

**Gate Status**: All principles satisfied. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/045-gear-detail-modal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing)
app/
├── [locale]/
│   ├── inventory/       # Inventory pages (modal trigger point)
│   └── loadouts/        # Loadout pages (modal trigger point)
└── api/
    ├── youtube/         # NEW: YouTube search endpoint
    │   └── search/
    │       └── route.ts
    └── geargraph/       # NEW: GearGraph insights endpoint
        └── insights/
            └── route.ts

components/
├── gear-detail/         # NEW: Feature components
│   ├── GearDetailModal.tsx
│   ├── GearDetailContent.tsx
│   ├── YouTubeCarousel.tsx
│   ├── GearInsightsSection.tsx
│   └── ImageGallery.tsx
└── ui/                  # Existing shadcn/ui components

hooks/
├── useGearDetailModal.ts    # NEW: Modal state management
├── useYouTubeReviews.ts     # NEW: YouTube API integration
└── useGearInsights.ts       # NEW: GearGraph API integration

types/
├── gear.ts             # Existing GearItem types
├── youtube.ts          # NEW: YouTube API response types
├── geargraph.ts        # NEW: GearGraph API response types
└── database.ts         # Update: Add api_cache table types

lib/supabase/
└── cache.ts            # NEW: API cache CRUD operations

supabase/migrations/
└── 20251211_api_cache_table.sql  # NEW: Cache table migration
```

**Structure Decision**: Follows existing Next.js App Router conventions with new feature-specific components under `components/gear-detail/`, API routes under `app/api/`, and hooks in root `hooks/` directory per constitution principle I.

## Complexity Tracking

No constitution violations requiring justification.
