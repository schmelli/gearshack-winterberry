# Implementation Plan: Price Discovery & Monitoring for Wishlist Items

**Branch**: `050-price-tracking` | **Date**: 2025-12-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/050-price-tracking/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to track real-time prices for wishlist items from online retailers, eBay, and local outdoor shops. Users opt-in per item, receive alerts on price drops, and can compare community availability (peer-to-peer) with retail options. The system uses fuzzy matching for product discovery, displays results within 5-10 seconds, and provides partial results with warnings when external APIs fail. Personal price offers are delivered via partner retailer API. Historical price data is retained for 90 days to support seasonal trend analysis.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Framework**: Next.js 16+ with App Router, React 19+
**Primary Dependencies**:
  - **Database**: Supabase (PostgreSQL) for price data, tracking preferences, partner retailers
  - **Forms**: react-hook-form + Zod validation
  - **State Management**: Zustand with persist middleware for local state
  - **UI Components**: shadcn/ui (new-york style, zinc base)
  - **Styling**: Tailwind CSS 4
  - **Notifications**: Sonner (toast), Supabase Realtime (push notifications)
  - **Icons**: lucide-react
  - **HTTP Client**: Native fetch with Server Actions
  - **Background Jobs**: NEEDS CLARIFICATION (Vercel Cron, Supabase pg_cron, or external service?)
  - **External APIs**: Google Shopping API, eBay API, retailer-specific APIs (NEEDS CLARIFICATION: specific API services)
  - **Fuzzy Matching**: NEEDS CLARIFICATION (library choice: fuse.js, PostgreSQL pg_trgm, or other?)
  - **Geolocation**: NEEDS CLARIFICATION (library for distance calculation: geolib, turf.js, or PostGIS?)

**Storage**:
  - Supabase (PostgreSQL) with these extensions:
    - pg_trgm (fuzzy text search)
    - NEEDS CLARIFICATION: pgvector for semantic search?
  - Tables: price_tracking, price_results, price_history, partner_retailers, price_alerts, alert_preferences

**Testing**: NEEDS CLARIFICATION (Jest + React Testing Library for components, Vitest for hooks, Playwright for E2E?)

**Target Platform**: Web application (desktop and mobile browsers)

**Project Type**: Web application (Next.js App Router)

**Performance Goals**:
  - Price search results: <10 seconds (target: 5-7s)
  - 95% of requests complete within target time
  - Support 100 concurrent price tracking requests
  - Database query response: <100ms for price history lookups
  - Background price checks: Daily batch processing for all tracked items

**Constraints**:
  - External API rate limits (Google Shopping, eBay) - NEEDS CLARIFICATION: specific limits?
  - 90-day price history retention (automatic purge via pg_cron or Edge Function)
  - Must handle partial failures (show results from successful sources)
  - Fuzzy matching requires user confirmation for ambiguous matches
  - Partner retailer API requires authentication and rate limiting

**Scale/Scope**:
  - Expected users: ~10,000 initial beta users
  - Tracked items per user: ~10-50 wishlist items
  - External API calls: ~3-5 sources per item (Google Shopping, eBay, 1-3 retailers, local shops)
  - Price checks: Daily batch for all active tracking (estimated 50k-500k items)
  - Historical price data: ~90 days × daily checks × item count = significant storage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Feature-Sliced Light Architecture
✅ **PASS** - Design follows Feature-Sliced Light:
- UI Components will be stateless (PriceTrackingCard, PriceComparisonView, MatchConfirmationDialog)
- Custom hooks will contain all business logic (`usePriceTracking`, `usePriceSearch`, `useFuzzyMatching`, `usePersonalOffers`)
- Types defined in `@/types` (PriceResult, PriceAlert, PartnerRetailer, etc.)

### II. TypeScript Strict Mode
✅ **PASS** - TypeScript 5.x strict mode enforced:
- All external API responses validated with Zod schemas
- No `any` types allowed
- Type guards for runtime validation of external data

### III. Design System Compliance
✅ **PASS** - Uses existing shadcn/ui components:
- `Card` for price result containers
- `Button` for "Track Prices" action
- `Dialog` for fuzzy match confirmation
- `Badge` for "🌱 Local" and "💎 Personal Offer" indicators
- Tailwind CSS for all styling

### IV. Spec-Driven Development
✅ **PASS** - Following workflow:
1. ✅ Feature spec exists (`spec.md`)
2. ✅ Clarifications resolved (5 questions answered)
3. Phase 1: Create TypeScript interfaces first
4. Phase 1: Create custom hooks second
5. Phase 2: Create UI components last

**State Management Pattern**:
- Complex async price search flow: State machine (idle → loading → success/error/partial)
- Global tracking preferences: Zustand with persist middleware
- Optimistic updates for alert toggles with rollback on errors

### V. Import and File Organization
✅ **PASS** - Following organization rules:
- All imports use `@/*` path alias
- Files organized by feature under `hooks/price-tracking/`, `types/price-tracking.ts`
- Components co-located with feature-specific hooks

### Technology Constraints Compliance
✅ **PASS** - Using required stack:
- Next.js 16+ with App Router ✓
- TypeScript 5.x strict mode ✓
- React 19+ ✓
- Tailwind CSS 4 ✓
- shadcn/ui (new-york, zinc) ✓
- lucide-react for icons ✓
- react-hook-form + Zod ✓
- Supabase (PostgreSQL) ✓
- Zustand for state management ✓
- Sonner for toasts ✓
- next-intl for i18n ✓

**New Dependencies Required** (require justification per constitution):
1. **Fuzzy matching library** (fuse.js OR pg_trgm) - Required for FR-030, FR-031
2. **Geolocation utility** (geolib OR PostGIS) - Required for FR-008 (distance calculation)
3. **Background job scheduler** (Vercel Cron OR pg_cron) - Required for FR-024 (periodic price checks)
4. **External API clients**: Google Shopping, eBay - Required for FR-002

### Code Quality Gates
✅ **READY** - All gates will be enforced:
1. `npm run lint` must pass
2. `npm run build` must succeed
3. All TypeScript errors resolved
4. Spec-driven workflow followed

**GATE STATUS**: ✅ PASSED - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── [locale]/
│   └── wishlist/
│       └── [id]/                         # Wishlist item detail page with price tracking
│           └── page.tsx                  # Price comparison view
└── api/
    ├── price-tracking/
    │   ├── search/route.ts               # POST - Search prices for item
    │   ├── track/route.ts                # POST - Enable tracking
    │   ├── untrack/route.ts              # DELETE - Disable tracking
    │   └── history/[id]/route.ts         # GET - Price history for item
    ├── partner-offers/route.ts           # POST - Partner API endpoint (authenticated)
    └── cron/
        └── check-prices/route.ts         # GET - Vercel Cron endpoint for daily checks

hooks/
└── price-tracking/
    ├── usePriceTracking.ts               # Main hook: enable/disable tracking, fetch status
    ├── usePriceSearch.ts                 # Search prices across sources
    ├── useFuzzyMatching.ts               # Match confirmation flow
    ├── usePriceHistory.ts                # Historical price data
    ├── usePersonalOffers.ts              # Partner offers management
    └── usePriceAlerts.ts                 # Alert preferences and delivery

components/
├── wishlist/
│   ├── PriceTrackingCard.tsx             # UI: "Track Prices" button + status
│   ├── PriceComparisonView.tsx           # UI: Results display (local/online/eBay)
│   ├── PriceResultItem.tsx               # UI: Single price result card
│   ├── MatchConfirmationDialog.tsx       # UI: Fuzzy match selection
│   ├── PersonalOfferBadge.tsx            # UI: "💎 Personal Offer" indicator
│   └── PriceAlertToggle.tsx              # UI: Alert configuration

types/
└── price-tracking.ts                     # All TypeScript interfaces

lib/
├── supabase/
│   └── price-tracking-queries.ts         # Database query functions
└── external-apis/
    ├── google-shopping.ts                # Google Shopping API client
    ├── ebay.ts                           # eBay API client
    ├── retailer-api.ts                   # Generic retailer API wrapper
    └── fuzzy-matcher.ts                  # Fuzzy matching logic

supabase/
├── migrations/
│   └── 20251217_price_tracking.sql       # Database schema for price tracking
└── seed.sql                              # Seed partner retailers (optional)

__tests__/
├── hooks/
│   └── price-tracking/
│       ├── usePriceTracking.test.ts
│       └── useFuzzyMatching.test.ts
└── components/
    └── wishlist/
        ├── PriceComparisonView.test.tsx
        └── MatchConfirmationDialog.test.tsx
```

**Structure Decision**: Next.js App Router structure selected. Feature follows Feature-Sliced Light with clear separation:
- **Routes**: `app/api/price-tracking/` for Server Actions and API routes
- **Business Logic**: `hooks/price-tracking/` for all data fetching and state management
- **UI Components**: `components/wishlist/` for stateless presentation components
- **Types**: `types/price-tracking.ts` for all TypeScript interfaces
- **External Integrations**: `lib/external-apis/` for API clients
- **Database**: `supabase/migrations/` for schema changes

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitution principles followed. New dependencies justified:
- Fuzzy matching: Required for FR-030 (product matching when names don't match exactly)
- Geolocation: Required for FR-008 (distance calculation for local shops)
- Background jobs: Required for FR-024 (periodic price checks)
- External APIs: Core feature requirement (FR-002)
