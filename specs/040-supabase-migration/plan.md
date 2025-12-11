# Implementation Plan: Migration from Firebase to Supabase (Greenfield)

**Branch**: `040-supabase-migration` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-supabase-migration/spec.md`

## Summary

Complete replacement of Firebase Auth and Firestore with Supabase Auth and PostgreSQL. This is a greenfield migration - no data migration from Firebase, fresh database schema with full field parity for gear items (~30 fields). Uses @supabase/ssr for Next.js App Router integration with cookie-based session management. Row Level Security (RLS) policies enforce data isolation with direct client access via anon key.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, react-hook-form, zod, shadcn/ui
**Storage**: PostgreSQL (Supabase), Cloudinary (images - unchanged)
**Testing**: Manual testing, TypeScript type checking, ESLint
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: List load <2s for 500 items, item creation <5s, magic link delivery <30s
**Constraints**: RLS policies must block 100% of unauthorized access, session persistence 100% reliable
**Scale/Scope**: Single user focus initially, ~30 gear item fields, 5 database tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | All Supabase logic will reside in hooks (useSupabaseAuth, useGearItems, useLoadouts), UI components remain stateless |
| II. TypeScript Strict Mode | PASS | All Supabase types will be generated from database schema, no `any` types |
| III. Design System Compliance | PASS | Existing shadcn/ui components reused, only data layer changes |
| IV. Spec-Driven Development | PASS | Full spec created, clarifications completed |
| V. Import and File Organization | PASS | Supabase client and hooks use `@/` imports |

**Gate Result**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/040-supabase-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output - PostgreSQL schema
├── quickstart.md        # Phase 1 output - Setup guide
├── contracts/           # Phase 1 output - RLS policies
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing)
app/
├── (auth)/              # Auth pages (login, register, callback)
│   ├── login/
│   └── auth/callback/   # Magic link callback route
├── (protected)/         # Protected routes requiring auth
│   ├── inventory/
│   └── loadouts/
└── api/                 # API routes if needed

# New Supabase infrastructure
lib/
├── supabase/
│   ├── client.ts        # Browser client (createBrowserClient)
│   ├── server.ts        # Server client (createServerClient)
│   ├── middleware.ts    # Session refresh middleware
│   └── types.ts         # Generated database types
└── utils/               # Existing utilities

# Hooks (business logic - Constitution Principle I)
hooks/
├── useSupabaseAuth.ts   # Auth state, sign in/up/out, session
├── useGearItems.ts      # CRUD for gear items via Supabase
├── useLoadouts.ts       # CRUD for loadouts via Supabase
└── useProfile.ts        # User profile management

# Types (Constitution Principle V)
types/
├── gear.ts              # Existing - update GearStatus enum
├── loadout.ts           # Existing - unchanged
├── database.ts          # NEW - Supabase database types
└── supabase.ts          # NEW - Supabase-specific types

# Middleware for session refresh
middleware.ts            # Supabase session middleware
```

**Structure Decision**: Reuse existing Next.js App Router structure. Add `lib/supabase/` for client initialization. All business logic in hooks per Constitution Principle I.

## Complexity Tracking

> No violations requiring justification. Migration follows existing patterns.

| Item | Decision | Rationale |
|------|----------|-----------|
| Client Strategy | @supabase/ssr | Official SSR package for App Router |
| Data Access | Direct + RLS | Standard Supabase pattern, no proxy needed |
| Firebase Removal | Complete | No parallel operation per clarification |
