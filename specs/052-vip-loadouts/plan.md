# Implementation Plan: VIP Loadouts (Influencer Integration)

**Branch**: `052-vip-loadouts` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/052-vip-loadouts/spec.md`

## Summary

VIP Loadouts is a content curation system enabling GearShack to showcase outdoor influencers' gear setups as browseable, followable profiles. Admins curate VIP content by building loadouts from YouTube/blog sources, featuring them on the Community page. Users can discover, follow, copy, compare, and bookmark VIP loadouts. Technical approach: Next.js App Router pages for VIP discovery and profiles, Supabase PostgreSQL for VIP data with RLS policies, integration with existing Social Graph for following, and admin dashboard extension for curation workflow.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui, react-hook-form + Zod, Zustand, next-intl, Sonner
**Storage**: Supabase (PostgreSQL) with RLS policies
**Testing**: Jest + React Testing Library (existing setup)
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: VIP pages <1s load, comparison view <2s, notifications <5min
**Constraints**: SEO-friendly URLs required, must integrate with existing Social Graph, admin-only VIP creation
**Scale/Scope**: 50 VIPs, 150 loadouts, 10k+ followers in first 6 months

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | Hooks in `hooks/vip/`, stateless UI in `components/vip/`, types in `types/` |
| II. TypeScript Strict | ✅ PASS | All entities typed with Zod validation for API responses |
| III. Design System | ✅ PASS | Using shadcn/ui Card, Button, Dialog, Sheet components |
| IV. Spec-Driven | ✅ PASS | Full spec exists with 8 user stories and 33 FRs |
| V. Import Organization | ✅ PASS | Using `@/*` path aliases, feature-organized structure |
| Technology Constraints | ✅ PASS | All technologies from constitution (Supabase, next-intl, Zustand) |

**Gate Status**: ✅ PASSED - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/052-vip-loadouts/
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
├── [locale]/
│   ├── community/
│   │   └── page.tsx                    # Community page with Featured VIPs section
│   ├── vip/
│   │   ├── [slug]/
│   │   │   ├── page.tsx                # VIP profile page
│   │   │   └── [loadout-slug]/
│   │   │       └── page.tsx            # VIP loadout detail page
│   │   └── compare/
│   │       └── page.tsx                # Loadout comparison view
│   └── admin/
│       └── vip/
│           ├── page.tsx                # VIP management dashboard
│           ├── [id]/
│           │   └── page.tsx            # VIP edit page
│           └── loadouts/
│               ├── new/
│               │   └── page.tsx        # Create loadout for VIP
│               └── [id]/
│                   └── page.tsx        # Edit VIP loadout

components/
├── vip/
│   ├── VipProfileCard.tsx              # VIP card for community listing
│   ├── VipProfileHeader.tsx            # VIP profile header with follow button
│   ├── VipLoadoutCard.tsx              # Loadout preview card
│   ├── VipLoadoutDetail.tsx            # Full loadout view with items
│   ├── VipFollowButton.tsx             # Follow/unfollow button
│   ├── VipSourceAttribution.tsx        # Source URL display with badge
│   ├── VipComparisonView.tsx           # Side-by-side loadout comparison
│   ├── VipBookmarkButton.tsx           # Bookmark toggle
│   ├── CopyToLoadoutModal.tsx          # Copy loadout confirmation dialog
│   └── FeaturedVipsSection.tsx         # Featured VIPs carousel/grid
└── admin/
    └── vip/
        ├── VipForm.tsx                 # Create/edit VIP form
        ├── VipLoadoutForm.tsx          # Create/edit loadout form
        ├── VipLoadoutItemPicker.tsx    # Gear item search and add
        └── VipManagementTable.tsx      # Admin VIP list with actions

hooks/
├── vip/
│   ├── useVipProfile.ts                # Fetch VIP profile with loadouts
│   ├── useVipLoadout.ts                # Fetch single loadout with items
│   ├── useVipFollow.ts                 # Follow/unfollow with optimistic updates
│   ├── useVipBookmark.ts               # Bookmark with optimistic updates
│   ├── useVipSearch.ts                 # Search VIPs by name/keyword
│   ├── useVipComparison.ts             # Comparison calculations
│   ├── useCopyVipLoadout.ts            # Copy loadout to user account
│   └── useFeaturedVips.ts              # Fetch featured VIPs for community
└── admin/
    └── vip/
        ├── useAdminVips.ts             # CRUD operations for VIPs
        ├── useAdminVipLoadouts.ts      # CRUD for VIP loadouts
        └── useVipClaimInvitation.ts    # Claim invitation management

types/
├── vip.ts                              # VIP-related interfaces and Zod schemas

lib/
├── vip/
│   ├── vip-service.ts                  # Supabase queries for VIP data
│   ├── vip-notifications.ts            # Notification helpers for VIP events
│   └── source-url-validator.ts         # URL validation for video/blog sources

api/
├── vip/
│   ├── route.ts                        # GET featured/search VIPs
│   ├── [id]/
│   │   └── route.ts                    # GET/PATCH/DELETE VIP
│   ├── follow/
│   │   └── route.ts                    # POST/DELETE follow
│   ├── bookmark/
│   │   └── route.ts                    # POST/DELETE bookmark
│   └── loadouts/
│       ├── route.ts                    # GET/POST loadouts
│       ├── [id]/
│       │   └── route.ts                # GET/PATCH/DELETE loadout
│       └── copy/
│           └── route.ts                # POST copy to user
```

**Structure Decision**: Web application with Next.js App Router. VIP-specific code organized under `vip/` subdirectories across components, hooks, types, lib, and api. Admin functionality under `admin/vip/` subdirectories. Follows Feature-Sliced Light architecture with clear separation of UI, logic, and data layers.

## Complexity Tracking

> No violations requiring justification - all principles satisfied.
