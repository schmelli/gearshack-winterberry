# Implementation Plan: Global Gear Catalog & Sync API

**Branch**: `042-catalog-sync-api` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/042-catalog-sync-api/spec.md`

## Summary

Implement a CQRS-pattern catalog system that mirrors gear brand/product master data from external Memgraph database into Supabase PostgreSQL. This enables lightning-fast fuzzy autocomplete (pg_trgm) and semantic vector search (pgvector) in the Gear Editor. External Python scripts (GearGraph) will sync data via a secure API endpoint authenticated with Supabase Service Role Key.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router)
**Primary Dependencies**: @supabase/supabase-js, @supabase/ssr, zod (validation), react-hook-form (existing)
**Storage**: PostgreSQL (Supabase) with pg_trgm and pgvector extensions
**Testing**: Vitest (unit), Playwright (e2e) - existing project setup
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (monorepo-style Next.js)
**Performance Goals**: <200ms p95 autocomplete latency, 100k+ products supported
**Constraints**: 5 results per autocomplete query, 1536-dimension embeddings, Supabase Service Role Key auth
**Scale/Scope**: 100,000+ catalog items, 1,000+ brands

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | PASS | Search hooks in `hooks/`, types in `types/`, UI stateless |
| II. TypeScript Strict | PASS | All types defined, Zod for API validation |
| III. Design System | PASS | Using existing shadcn/ui components for autocomplete UI |
| IV. Spec-Driven | PASS | Full spec created before implementation |
| V. Import Organization | PASS | `@/*` aliases, feature-organized files |

**Gate Result**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/042-catalog-sync-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API schemas)
│   ├── sync-api.md      # Sync endpoint contracts
│   └── search-api.md    # Search endpoint contracts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing)
app/
├── api/
│   └── sync-catalog/
│       ├── brands/
│       │   └── route.ts      # POST /api/sync-catalog/brands
│       └── items/
│           └── route.ts      # POST /api/sync-catalog/items

hooks/
├── useCatalogSearch.ts       # Fuzzy + semantic search hook
└── useBrandAutocomplete.ts   # Brand-specific autocomplete hook

lib/
├── supabase/
│   └── catalog.ts            # Catalog query utilities
└── validations/
    └── catalog-schema.ts     # Zod schemas for sync payloads

types/
├── catalog.ts                # CatalogBrand, CatalogItem types
└── database.ts               # Extended with catalog tables

supabase/
└── migrations/
    └── 20251210_catalog_tables.sql  # DB schema + extensions
```

**Structure Decision**: Follows existing Next.js App Router convention with API routes under `app/api/`, business logic hooks under `hooks/`, and types under `types/`. Database migrations follow existing Supabase pattern.

## Complexity Tracking

No violations requiring justification. Implementation follows constitution principles.

## Post-Design Constitution Re-Check

*Performed after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Feature-Sliced Light | PASS | Hooks (`useCatalogSearch`, `useBrandAutocomplete`) contain all logic; UI components receive data via props |
| II. TypeScript Strict | PASS | All types in `types/catalog.ts`, Zod schemas in `lib/validations/catalog-schema.ts` |
| III. Design System | PASS | Autocomplete uses existing shadcn/ui Combobox pattern |
| IV. Spec-Driven | PASS | Full spec → plan → data model → contracts workflow followed |
| V. Import Organization | PASS | All imports use `@/*` aliases, feature files co-located |

**Final Gate Result**: PASS - Ready for task generation.
