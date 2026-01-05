# Implementation Plan: Community Hub Enhancements

**Branch**: `056-community-hub-enhancements` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/056-community-hub-enhancements/spec.md`

## Summary

This feature enhances the Community Hub with 8 improvements across 3 priority tiers:
- **P1**: Marketplace activation (peer-to-peer gear exchange), Admin Banner Carousel (promotional content management)
- **P2**: VIP Profile Modals (quick preview), VIP Loadouts reorganization, Filter Bug Fix (URL persistence)
- **P3**: YouTube embed sizing, Sidebar spacing, VIP Featured Videos

Technical approach leverages existing patterns: `useBulletinBoard` infinite scroll hook, shadcn/embla Carousel component, existing messaging system (Feature 046), and VIP accounts infrastructure (Feature 052).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui, react-hook-form + Zod, Zustand, embla-carousel-react, next-intl
**Storage**: PostgreSQL (Supabase) - new `community_banners` table, extend `vip_accounts` with `featured_video_urls`
**Testing**: Vitest + React Testing Library (component tests), Playwright (E2E)
**Target Platform**: Web (responsive: desktop + mobile)
**Project Type**: Web (Next.js monolith)
**Performance Goals**: Marketplace < 3s load, VIP modal < 1s, Banner carousel smooth 60fps
**Constraints**: Currency conversion requires exchange rate API or client-side locale formatting
**Scale/Scope**: ~500 users, ~1000 gear items in marketplace initially

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | New hooks: `useMarketplace`, `useBannerCarousel`, `useVipModal`. UI components stateless. |
| II. TypeScript Strict | ✅ PASS | All types in `@/types/marketplace.ts`, `@/types/banner.ts`. No `any` types. |
| III. Design System | ✅ PASS | Uses existing shadcn: Carousel, Dialog, Card, Button. No new base components. |
| IV. Spec-Driven Development | ✅ PASS | Spec complete with clarifications. Types → Hooks → UI order. |
| V. Import Organization | ✅ PASS | All imports via `@/*` alias. Feature-organized in `/hooks/marketplace/`, `/components/marketplace/`. |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/056-community-hub-enhancements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router Structure (existing)
app/[locale]/
├── community/
│   ├── marketplace/           # NEW: Marketplace page
│   │   └── page.tsx
│   └── page.tsx               # MODIFY: Add banner carousel
├── admin/
│   ├── banners/               # NEW: Banner management
│   │   └── page.tsx
│   └── vip/
│       └── page.tsx           # MODIFY: Add featured videos management

# Components
components/
├── community/
│   ├── BannerCarousel.tsx     # NEW
│   └── CommunitySidebar.tsx   # MODIFY: Spacing
├── marketplace/               # NEW folder
│   ├── MarketplaceGrid.tsx
│   ├── MarketplaceCard.tsx
│   ├── MarketplaceFilters.tsx
│   └── MarketplaceSkeleton.tsx
├── vip/
│   ├── VipProfileModal.tsx    # NEW
│   └── VipFeaturedVideos.tsx  # NEW
├── bulletin/
│   └── YouTubePreview.tsx     # MODIFY: Max-height constraint

# Hooks (Feature-Sliced Light)
hooks/
├── marketplace/               # NEW folder
│   ├── useMarketplace.ts
│   └── useMarketplaceFilters.ts
├── banner/                    # NEW folder
│   └── useBannerCarousel.ts
├── vip/
│   └── useVipModal.ts         # NEW
└── bulletin/
    └── useBulletinBoard.ts    # MODIFY: URL query param persistence

# Types
types/
├── marketplace.ts             # NEW
├── banner.ts                  # NEW
└── vip.ts                     # MODIFY: Add featured_video_urls

# Database
supabase/migrations/
├── 20260104_create_community_banners.sql    # NEW
└── 20260104_add_vip_featured_videos.sql     # NEW
```

**Structure Decision**: Follows existing Next.js App Router pattern with feature-organized hooks and components. Marketplace follows same pattern as bulletin board (hooks/marketplace/, components/marketplace/).

## Complexity Tracking

No constitution violations requiring justification.

## Implementation Phases

### Phase 1: Foundation (P1 Features)
1. **Database**: Create `community_banners` table, add `featured_video_urls` to `vip_accounts`
2. **Types**: Define `Banner`, `MarketplaceListing`, extend `VipAccount`
3. **Marketplace Hook**: `useMarketplace` with infinite scroll (copy `useBulletinBoard` pattern)
4. **Banner Hook**: `useBannerCarousel` with auto-rotation logic

### Phase 2: UI Components (P1 Features)
1. **Marketplace Page**: Grid, cards, filters, seller info, message button
2. **Banner Carousel**: Hero images, CTA, navigation dots, 6s auto-rotate
3. **Admin Banners**: CRUD interface for banner management

### Phase 3: VIP Enhancements (P2 Features)
1. **VIP Modal**: Dialog-based profile view with loadouts
2. **Featured Videos**: Admin management + modal display
3. **Loadouts Tabs**: Reorganize with disabled "Reseller" tab

### Phase 4: Bug Fixes & Polish (P2/P3 Features)
1. **Filter Bug**: URL query params for filter state
2. **YouTube Sizing**: Max-height 300px constraint
3. **Sidebar Spacing**: Increase gap to 24px

## Dependencies

- Feature 046 (Messaging): Reuse `useConversations` for marketplace messaging
- Feature 052 (VIP System): Extend existing `vip_accounts` table and hooks
- Feature 051 (Bulletin Board): Copy infinite scroll pattern from `useBulletinBoard`
- Existing: embla-carousel-react (already in `components/ui/carousel.tsx`)
