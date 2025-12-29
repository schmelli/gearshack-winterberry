# Implementation Plan: Merchant Integration (Business Loadouts & Location-Based Offers)

**Branch**: `053-merchant-integration` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/053-merchant-integration/spec.md`

## Summary

B2B2C monetization platform enabling outdoor retailers (Globetrotter, Camp4, local shops) to showcase curated gear loadouts, deliver personalized location-based offers to users with matching wishlist items, and track conversions through GearShack's inventory system.

**Technical Approach**:
- Extend existing Supabase schema with merchant-specific tables (merchants, merchant_catalog_items, merchant_loadouts, merchant_offers, conversions, merchant_transactions)
- Create dedicated Merchant Portal routes under `/[locale]/merchant/` with role-based access
- Implement location-based proximity queries using PostGIS extension (existing in Supabase)
- Leverage existing notification system for offer delivery
- Follow Feature-Sliced Light architecture with dedicated hooks for merchant operations

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, Zustand, react-hook-form, Zod, shadcn/ui, Sonner, next-intl, lucide-react
**Storage**: Supabase (PostgreSQL) with PostGIS extension for geospatial queries
**Testing**: Jest, React Testing Library, Playwright (existing project setup)
**Target Platform**: Web (responsive - desktop for merchant portal, mobile-friendly for user flows)
**Project Type**: Web application (Next.js App Router monolith)
**Performance Goals**: Merchant dashboard <1.5s load, Wishlist brokering queries <2s, 10,000 concurrent users
**Constraints**: GDPR compliance for EU merchants/users, location data encrypted at rest, max 500 merchants, max 10,000 loadouts
**Scale/Scope**: 50 merchants (12-month target), ~150 loadout views/month, 50,000 offers/month capacity

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Feature-Sliced Light** | PASS | All business logic in hooks (`hooks/merchant/`), stateless UI components |
| **II. TypeScript Strict Mode** | PASS | All entities typed with Zod validation for external data |
| **III. Design System Compliance** | PASS | Using shadcn/ui components (Card, Button, Dialog, Sheet, Table, Badge) |
| **IV. Spec-Driven Development** | PASS | Spec complete with clarifications, types → hooks → UI order maintained |
| **V. Import Organization** | PASS | `@/*` path aliases, feature-organized under `app/[locale]/merchant/` |
| **Technology Constraints** | PASS | All deps from constitution (Supabase, Zustand, react-hook-form, Zod, next-intl) |

**Gate Status**: PASSED - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/053-merchant-integration/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   ├── merchants.yaml
│   ├── loadouts.yaml
│   ├── offers.yaml
│   └── conversions.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing pattern)

app/
├── [locale]/
│   ├── merchant/                    # Merchant Portal (new)
│   │   ├── page.tsx                 # Dashboard
│   │   ├── loadouts/
│   │   │   ├── page.tsx             # Loadout list
│   │   │   ├── new/page.tsx         # Create wizard
│   │   │   └── [id]/page.tsx        # Edit loadout
│   │   ├── insights/
│   │   │   └── page.tsx             # Wishlist brokering
│   │   ├── offers/
│   │   │   ├── page.tsx             # Offer management
│   │   │   └── new/page.tsx         # Create offer
│   │   ├── analytics/
│   │   │   └── page.tsx             # Conversion dashboard
│   │   └── settings/
│   │       └── page.tsx             # Merchant profile
│   ├── community/
│   │   ├── merchant-loadouts/       # User-facing merchant section (new)
│   │   │   ├── page.tsx             # Browse merchant loadouts
│   │   │   └── [id]/page.tsx        # Loadout detail + comparison
│   │   └── ... (existing)
│   ├── offers/                      # User offer management (new)
│   │   └── page.tsx                 # View/respond to offers
│   └── admin/
│       └── merchants/               # Admin merchant management (new)
│           └── page.tsx             # Approve/reject merchants

components/
├── merchant/                        # Merchant-specific components (new)
│   ├── MerchantLoadoutCard.tsx
│   ├── MerchantLoadoutDetail.tsx
│   ├── LoadoutCreationWizard.tsx
│   ├── WishlistInsightsPanel.tsx
│   ├── OfferCreationForm.tsx
│   ├── ConversionDashboard.tsx
│   └── MerchantBadge.tsx
├── offers/                          # Offer components (new)
│   ├── OfferCard.tsx
│   ├── OfferDetailSheet.tsx
│   └── OfferResponseActions.tsx
└── ui/                              # Existing shadcn/ui components

hooks/
├── merchant/                        # Merchant hooks (new)
│   ├── useMerchantAuth.ts           # Merchant role verification
│   ├── useMerchantLoadouts.ts       # CRUD for merchant loadouts
│   ├── useMerchantCatalog.ts        # Catalog management
│   ├── useWishlistInsights.ts       # Proximity-based wishlist queries
│   ├── useMerchantOffers.ts         # Offer creation/tracking
│   ├── useConversionTracking.ts     # Conversion analytics
│   └── useMerchantBilling.ts        # Fee/commission tracking
├── offers/                          # User offer hooks (new)
│   ├── useUserOffers.ts             # Fetch/respond to offers
│   └── useOfferBlocking.ts          # Block merchants
└── ... (existing hooks)

types/
├── merchant.ts                      # Merchant-related types (new)
├── merchant-loadout.ts              # Loadout types (new)
├── merchant-offer.ts                # Offer types (new)
├── conversion.ts                    # Conversion types (new)
└── ... (existing types)

lib/
├── supabase/
│   └── merchant-queries.ts          # Supabase merchant queries (new)
└── ... (existing)

supabase/
└── migrations/
    └── 20251229_merchant_integration.sql  # New tables and RLS policies
```

**Structure Decision**: Follows existing Next.js App Router pattern with locale-based routing. Merchant Portal is a new top-level section (`/[locale]/merchant/`) with dedicated hooks and components. User-facing merchant content integrates into existing community section.

## Complexity Tracking

> No violations requiring justification - all complexity within constitution bounds.

| Aspect | Complexity Level | Rationale |
|--------|-----------------|-----------|
| New tables | 7 tables | Required for distinct merchant entities (not over-engineered) |
| New routes | 12 pages | Merchant portal (8) + user flows (3) + admin (1) |
| New hooks | 9 hooks | One hook per domain concern (Feature-Sliced Light) |
| PostGIS queries | Medium | Required for proximity-based features; existing pattern in project |
