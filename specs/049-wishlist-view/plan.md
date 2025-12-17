# Implementation Plan: Wishlist View with Community Availability and Price Monitoring

**Branch**: `049-wishlist-view` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/049-wishlist-view/spec.md`

## Summary

Implement a wishlist feature that extends the existing inventory system to allow users to track gear they want to acquire. The wishlist will reuse existing inventory UI patterns (cards, filters, search, sorting) with wishlist-specific modifications. Key additions include community availability matching (showing which users have wishlist items available for sale/trade/lending) and stub sections for future price monitoring features. The implementation leverages the existing gear_items table with status='wishlist', extends inventory components to support wishlist context, and adds new Supabase queries for fuzzy matching community gear.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Supabase (PostgreSQL), Zustand, shadcn/ui, react-hook-form, Zod, Sonner, next-intl
**Storage**: Supabase (PostgreSQL) - existing gear_items table with status='wishlist', new fuzzy matching functions
**Testing**: Manual testing (no automated tests required for this feature)
**Target Platform**: Web (responsive design for desktop and mobile)
**Project Type**: Web application (Next.js App Router with Feature-Sliced Light architecture)
**Performance Goals**:
- View switching < 2 seconds
- Community availability queries < 3 seconds
- Search/filter operations < 2 seconds for 500 items
**Constraints**:
- Must reuse existing inventory components (no new base components per constitution)
- Must maintain Feature-Sliced Light architecture (stateless UI, logic in hooks)
- Must use TypeScript strict mode (no 'any' types)
- Must use brand + model fuzzy matching for community availability
- Must use brand + model case-insensitive matching for duplicate detection
**Scale/Scope**:
- Support up to 500 wishlist items per user
- Support real-time community matching across all users
- Stub sections clearly marked for future price monitoring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Feature-Sliced Light Architecture ✅ PASS
- **UI Components**: All new wishlist components will be stateless and receive data via props only
- **Custom Hooks**: Business logic will reside in `hooks/useWishlist.ts` and community matching logic
- **Types**: All interfaces defined in `@/types/wishlist.ts`
- **Compliance**: Full compliance with Feature-Sliced Light

### Principle II: TypeScript Strict Mode ✅ PASS
- TypeScript strict mode enabled
- No 'any' types permitted
- All external data validated with Zod schemas
- Full type safety throughout implementation

### Principle III: Design System Compliance ✅ PASS
- Reuse existing `@/components/ui` shadcn/ui components
- Reuse existing `components/inventory-gallery/GearCard.tsx` with wishlist context
- No new base components created
- Tailwind CSS only for styling
- Uses Card, Button, Dialog, Tabs from shadcn/ui

### Principle IV: Spec-Driven Development ✅ PASS
- Specification completed in `/specs/049-wishlist-view/spec.md`
- Types will be created first in `@/types/wishlist.ts`
- Hooks created second (`hooks/useWishlist.ts`, `hooks/useCommunityAvailability.ts`)
- UI components created last
- State management will use Zustand for filter persistence

### Principle V: Import and File Organization ✅ PASS
- All imports use `@/*` path alias
- Files organized by feature (wishlist components co-located)
- Absolute imports only

### Technology Constraints ✅ PASS
All required technologies already in use:
- ✅ Next.js 16+ with App Router
- ✅ TypeScript 5.x (strict mode)
- ✅ React 19+
- ✅ Tailwind CSS 4
- ✅ shadcn/ui (new-york style)
- ✅ lucide-react icons
- ✅ react-hook-form + Zod validation
- ✅ Supabase (PostgreSQL)
- ✅ next-intl (i18n)
- ✅ Zustand (state management)
- ✅ Sonner (toasts)

**No new dependencies required** - all features implementable with existing stack.

## Project Structure

### Documentation (this feature)

```text
specs/049-wishlist-view/
├── spec.md                # Feature specification (complete)
├── plan.md                # This file (/speckit.plan command output)
├── research.md            # Phase 0 output (technical decisions)
├── data-model.md          # Phase 1 output (entity schemas)
├── quickstart.md          # Phase 1 output (implementation guide)
├── contracts/             # Phase 1 output (API contracts)
│   ├── wishlist-queries.md
│   └── community-matching.md
└── checklists/
    └── requirements.md    # Validation checklist (complete)
```

### Source Code (repository root)

```text
types/
├── wishlist.ts            # New: Wishlist-specific types and interfaces

hooks/
├── useWishlist.ts         # New: Wishlist state management hook
└── useCommunityAvailability.ts  # New: Community matching logic

components/wishlist/
├── WishlistToggle.tsx     # New: Inventory/Wishlist tab control
├── WishlistCard.tsx       # New: Extends GearCard for wishlist context
├── CommunityAvailabilityPanel.tsx  # New: Shows community matches
├── PriceStubIndicator.tsx # New: Placeholder for future price features
└── MoveToInventoryButton.tsx  # New: Transfer action button

lib/supabase/
├── wishlist-queries.ts    # New: CRUD operations for wishlist items
└── community-matching.ts  # New: Fuzzy matching for community availability

app/[locale]/inventory/
└── page.tsx               # Modified: Add wishlist toggle and routing

supabase/migrations/
└── 20251216_wishlist_functions.sql  # New: Fuzzy matching functions for community availability
```

**Structure Decision**: Next.js App Router web application with Feature-Sliced Light architecture. All new wishlist components will be co-located in `components/wishlist/` directory. Hooks for business logic in `hooks/` directory. Database queries in `lib/supabase/` directory. Existing inventory components will be extended to support wishlist context via props. Migration file will add PostgreSQL fuzzy matching functions (trigram similarity) for brand+model matching.

## Complexity Tracking

> **No constitution violations** - feature fully compliant with all principles.

