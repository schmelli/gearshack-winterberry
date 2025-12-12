# Implementation Plan: Ontology Import & Category Internationalization

**Branch**: `043-ontology-i18n-import` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/043-ontology-i18n-import/spec.md`

## Summary

Add internationalization support (EN/DE) to the categories table and create a seed script to import a comprehensive hiking gear taxonomy from a JSON source file. The schema will be extended with `slug` (unique identifier) and `i18n` (JSONB translations) columns. A TypeScript seed script will perform idempotent upserts of the 3-level category hierarchy, replacing existing placeholder data.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: @supabase/supabase-js, zod (validation), tsx (script runner)
**Storage**: PostgreSQL (Supabase) - `categories` table
**Testing**: Manual verification via Supabase dashboard, npm script for seed execution
**Target Platform**: Node.js (seed script), Next.js 16+ (frontend consumption)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Seed script completes in <30 seconds for ~300 categories
**Constraints**: Service role key required for RLS bypass during seeding
**Scale/Scope**: ~200-300 categories across 3 hierarchy levels

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | Hook will fetch categories; UI receives data via props |
| II. TypeScript Strict Mode | ✅ PASS | All types defined in `@/types`, zod for JSON validation |
| III. Design System Compliance | ✅ PASS | No new UI components needed; existing Select components used |
| IV. Spec-Driven Development | ✅ PASS | Specification created first via `/speckit.specify` |
| V. Import and File Organization | ✅ PASS | Types in `@/types`, hooks in `hooks/`, script in `scripts/` |

**Gate Result**: PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/043-ontology-i18n-import/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (SQL migration)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── [locale]/
│   └── inventory/        # Existing - uses category selectors
│       └── [id]/edit/    # GearEditorForm consumes categories

components/
├── gear-editor/
│   └── sections/         # ClassificationSection uses category Select

hooks/
├── useCategories.ts      # NEW: Fetch and cache categories with i18n
└── useGearEditor.ts      # Existing - will use useCategories

lib/
├── supabase/
│   └── client.ts         # Existing Supabase client
└── utils/
    └── category-helpers.ts # NEW: getLocalizedLabel() helper

scripts/
├── seed-ontology.ts      # NEW: Main seed script
└── data/
    └── Hiking_Gear_Ontology_i18n.json  # User-provided ontology file

supabase/
└── migrations/
    └── 20251211_categories_i18n.sql  # NEW: Schema migration

types/
├── database.ts           # Update categories type
└── category.ts           # NEW: Category i18n types
```

**Structure Decision**: Web application with Next.js App Router. Seed script runs standalone via `tsx`. Migration applied via Supabase CLI or dashboard.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
