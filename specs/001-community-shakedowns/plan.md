# Implementation Plan: Community Shakedowns

**Branch**: `001-community-shakedowns` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-community-shakedowns/spec.md`

## Summary

Community Shakedowns enables users to share their trip-specific loadouts with the community for expert feedback and optimization suggestions. This human-powered review system complements the AI shakedown feature (Trailblazer tier), providing nuanced, experience-based advice that AI cannot match. The feature includes:

- **Shakedown creation** from existing loadouts with trip context (dates, experience level, concerns)
- **Feedback system** with general (loadout-level) and item-specific comments, markdown support, and nested replies (max 3 levels)
- **Discovery feed** with infinite scroll (20-item batches), filtering by trip type/location/season/status, and friend prioritization
- **Reputation system** with helpful votes and badge achievements at 10/50/100 vote thresholds
- **Lifecycle management** with Open → Complete → Archived (90-day) status flow

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, Zustand, react-hook-form, Zod, shadcn/ui, Sonner, next-intl, lucide-react
**Storage**: PostgreSQL (Supabase) with RLS policies
**Testing**: Vitest (unit/integration), Playwright (e2e)
**Target Platform**: Web (responsive desktop + mobile)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: <200ms feed load, <100ms feedback submission, infinite scroll with 20-item batches
**Constraints**: Real-time notifications via Supabase Realtime, markdown rendering client-side, soft-hide spam moderation
**Scale/Scope**: Expected 1000+ shakedowns/month, 6 comments average per shakedown, 7 user stories across P1-P3 priority

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Feature-Sliced Light Architecture** | PASS | All business logic in custom hooks (`hooks/shakedowns/`), stateless UI components (`components/shakedowns/`) |
| **II. TypeScript Strict Mode** | PASS | All types defined in `types/shakedown.ts`, Zod validation for API inputs |
| **III. Design System Compliance** | PASS | Using existing shadcn/ui: Card, Button, Dialog, Sheet, plus patterns from bulletin board |
| **IV. Spec-Driven Development** | PASS | Full spec with 31 functional requirements, 7 user stories with acceptance criteria |
| **V. Import and File Organization** | PASS | Using `@/*` path alias, feature-organized structure following existing patterns |

**Technology Constraints Check**:
- Next.js 16+ with App Router: PASS
- Supabase (PostgreSQL): PASS
- shadcn/ui (new-york style, zinc base): PASS
- Zustand with persist middleware: PASS (for local optimistic state)
- next-intl: PASS (i18n for all user-facing strings)
- Sonner for toasts: PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-community-shakedowns/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API route contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── [locale]/
│   └── community/
│       └── shakedowns/
│           ├── page.tsx                    # Shakedowns feed
│           ├── [id]/
│           │   └── page.tsx                # Shakedown detail view
│           └── new/
│               └── page.tsx                # Create shakedown form
├── api/
│   └── shakedowns/
│       ├── route.ts                        # GET (list), POST (create)
│       ├── [id]/
│       │   ├── route.ts                    # GET (detail), PATCH (update), DELETE
│       │   ├── complete/route.ts           # POST (mark complete)
│       │   └── reopen/route.ts             # POST (reopen before archive)
│       ├── feedback/
│       │   └── route.ts                    # POST (add feedback)
│       └── helpful/
│           └── route.ts                    # POST (mark as helpful)

components/
└── shakedowns/
    ├── ShakedownFeed.tsx                   # Feed with infinite scroll
    ├── ShakedownCard.tsx                   # Card in feed
    ├── ShakedownDetail.tsx                 # Full shakedown view
    ├── ShakedownCreator.tsx                # Creation form
    ├── FeedbackSection.tsx                 # Feedback list + composer
    ├── FeedbackItem.tsx                    # Single feedback with replies
    ├── ItemFeedbackModal.tsx               # Item-specific feedback dialog
    ├── HelpfulButton.tsx                   # Mark as helpful
    ├── ShakedownFilters.tsx                # Filter controls
    └── StatusBadge.tsx                     # Open/Complete/Archived badge

hooks/
└── shakedowns/
    ├── index.ts                            # Re-exports
    ├── useShakedowns.ts                    # Feed data + pagination
    ├── useShakedown.ts                     # Single shakedown detail
    ├── useShakedownMutations.ts            # Create/update/delete/complete
    ├── useFeedback.ts                      # Feedback operations
    ├── useShakedownFilters.ts              # Filter state
    └── useShakedownNotifications.ts        # Realtime notifications

types/
└── shakedown.ts                            # Shakedown, Feedback, Reply, Badge types

lib/
└── shakedown-utils.ts                      # Helpers (status checks, date formatting)
```

**Structure Decision**: Following established Next.js App Router patterns in this codebase. Feature files organized under `community/shakedowns` route group, matching existing `community/` structure for bulletin board. Custom hooks follow the pattern from `hooks/social/` and `hooks/bulletin/`. Components follow the pattern from `components/bulletin/`.

## Complexity Tracking

> No constitution violations detected. All requirements fit within existing patterns.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Nested replies (3 levels) | Recursive component with depth prop | Matches bulletin board ReplyThread pattern |
| Infinite scroll | Supabase cursor pagination with Zustand | Proven pattern from existing feed implementations |
| Soft-hide moderation | `is_hidden` boolean + `hidden_reason` | Simpler than full moderation queue for MVP |
| Reputation/badges | Denormalized count on profiles table | Avoid expensive aggregate queries |
