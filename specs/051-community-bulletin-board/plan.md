# Implementation Plan: Community Bulletin Board

**Branch**: `051-community-bulletin-board` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/051-community-bulletin-board/spec.md`

## Summary

A lightweight, chronological message board where registered GearShack users can post quick questions (500 char limit), share updates, and connect with the community. Key features include:
- Post creation with optional category tags (Question, Shakedown, Trade, Trip Planning, Gear Advice, Other)
- Threaded replies (max 2 levels nesting)
- Infinite scroll with tag filtering and keyword search
- Content linking to loadouts/shakedowns/marketplace items
- User reporting with moderator review workflow
- Rate limiting (10 posts/day, 50 replies/day)
- 90-day soft archival

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui, Tailwind CSS 4, Zustand, react-hook-form + Zod, Sonner, lucide-react, next-intl
**Storage**: Supabase (PostgreSQL) with RLS policies
**Testing**: Jest + React Testing Library (unit/component), Playwright (integration)
**Target Platform**: Web (responsive, desktop + mobile)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: <1s initial load (20 posts), <500ms post creation, <2s search
**Constraints**: Authentication required for all board access, max 500 chars per post, 2-level reply nesting
**Scale/Scope**: Support 10,000 concurrent viewers, 500-5,000 new posts/day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | UI components stateless, logic in hooks (`useBulletinBoard`, `usePosts`, `useReplies`) |
| II. TypeScript Strict Mode | ✅ PASS | All types in `@/types/bulletin.ts`, Zod for validation |
| III. Design System Compliance | ✅ PASS | Use shadcn/ui Card, Button, Dialog, Sheet; Tailwind only |
| IV. Spec-Driven Development | ✅ PASS | Spec complete, interfaces → hooks → UI order |
| V. Import & File Organization | ✅ PASS | Use `@/*` alias, feature-organized under `hooks/bulletin/`, `components/bulletin/` |

**Technology Constraints Check**:
| Constraint | Compliant | Notes |
|------------|-----------|-------|
| Next.js 16+ App Router | ✅ | Page at `app/[locale]/community/page.tsx` |
| React 19+ | ✅ | Standard hooks usage |
| Tailwind CSS 4 | ✅ | No custom CSS files |
| shadcn/ui | ✅ | Card, Button, Dialog, Sheet, Avatar, Badge |
| react-hook-form + Zod | ✅ | Post/Reply forms |
| Supabase | ✅ | PostgreSQL tables with RLS |
| next-intl | ✅ | i18n for en/de |
| Zustand | ✅ | Global bulletin state |
| Sonner | ✅ | Toast notifications |

**No Constitution Violations** - proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/051-community-bulletin-board/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── bulletin-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Web application structure (Next.js App Router)

app/[locale]/
├── community/
│   ├── page.tsx                    # Bulletin board main page
│   └── post/[postId]/page.tsx      # Direct post link (for archived posts)

components/bulletin/
├── BulletinBoard.tsx               # Main board container
├── PostCard.tsx                    # Individual post display
├── PostComposer.tsx                # New post modal/form
├── ReplyThread.tsx                 # Reply list with nesting
├── ReplyComposer.tsx               # Reply input field
├── TagFilter.tsx                   # Category tag filter chips
├── SearchBar.tsx                   # Keyword search input
├── ReportModal.tsx                 # Report content dialog
├── EmptyState.tsx                  # "Be the first to post!" CTA
└── PostMenu.tsx                    # Edit/Delete/Report dropdown

hooks/bulletin/
├── useBulletinBoard.ts             # Main board state & pagination
├── usePosts.ts                     # Post CRUD operations
├── useReplies.ts                   # Reply CRUD operations
├── usePostSearch.ts                # Search & filter logic
├── useReports.ts                   # Report submission
└── index.ts                        # Barrel export

types/
└── bulletin.ts                     # All bulletin board types

lib/supabase/
└── bulletin-queries.ts             # Supabase query helpers

messages/
├── en/bulletin.json                # English i18n strings
└── de/bulletin.json                # German i18n strings

supabase/migrations/
├── YYYYMMDD_create_bulletin_posts.sql
├── YYYYMMDD_create_bulletin_replies.sql
└── YYYYMMDD_create_bulletin_reports.sql
```

**Structure Decision**: Feature-sliced organization under `components/bulletin/` and `hooks/bulletin/` with shared types in `types/bulletin.ts`. Follows existing codebase patterns (see `components/social/`, `hooks/social/`).

## Complexity Tracking

> No constitution violations requiring justification.

| Item | Decision | Rationale |
|------|----------|-----------|
| Supabase RLS | Use existing patterns | Consistent with social-graph feature |
| Reply nesting | Client-side flattening | Max 2 levels keeps DB simple, flatten on render |
| Rate limiting | Supabase RPC functions | Atomic check-and-increment pattern |

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 design artifacts completed.*

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. Feature-Sliced Light | ✅ PASS | data-model.md confirms DB layer, contracts/ defines query layer, hooks structure planned |
| II. TypeScript Strict Mode | ✅ PASS | Full type definitions in contracts/bulletin-api.md, Zod schemas defined |
| III. Design System Compliance | ✅ PASS | Components use shadcn/ui (Card, Button, Dialog, Sheet, Avatar, Badge) |
| IV. Spec-Driven Development | ✅ PASS | research.md → data-model.md → contracts → quickstart.md order followed |
| V. Import & File Organization | ✅ PASS | All paths use `@/*` alias, feature-organized structure documented |

**All gates passed** - ready for `/speckit.tasks` to generate implementation tasks.

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | `specs/051-community-bulletin-board/research.md` | ✅ Complete |
| Data Model | `specs/051-community-bulletin-board/data-model.md` | ✅ Complete |
| API Contract | `specs/051-community-bulletin-board/contracts/bulletin-api.md` | ✅ Complete |
| Quickstart | `specs/051-community-bulletin-board/quickstart.md` | ✅ Complete |
| Tasks | `specs/051-community-bulletin-board/tasks.md` | ✅ Complete |
| Agent Context | `CLAUDE.md` | ✅ Updated |
