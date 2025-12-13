# Implementation Plan: Loadout Creation - Step 1 Form

**Branch**: `047-loadout-creation-form` | **Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/047-loadout-creation-form/spec.md`

## Summary

Enhance the existing loadout creation form (`/loadouts/new`) to include four fields: Loadout Name, Description, Season (multi-select), and Activity Type (multi-select). This provides users with a focused 60-second planning step before proceeding to gear item selection in Step 2. The implementation reuses existing `Season` and `ActivityType` types from `types/loadout.ts` and extends the `createLoadout` store action.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Framework**: Next.js 16+ (App Router), React 19+
**Primary Dependencies**: react-hook-form 7.x, Zod 4.x, shadcn/ui, next-intl, zustand
**Storage**: PostgreSQL (Supabase) - existing `loadouts` table with `seasons`, `activity_types`, `description` columns
**Testing**: Manual testing (no automated tests in current setup)
**Target Platform**: Web (Desktop/Tablet/Mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Form completion under 60 seconds, instant field feedback
**Constraints**: All 4 fields visible without scrolling on 768px+ height screens
**Scale/Scope**: Single page enhancement, ~5 files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | Form logic in hook (`useLoadoutCreationForm`), UI stateless in component |
| II. TypeScript Strict Mode | ✅ PASS | Using existing typed enums, Zod validation schema |
| III. Design System Compliance | ✅ PASS | Using shadcn/ui components (Input, Textarea, Button, Badge/Toggle) |
| IV. Spec-Driven Development | ✅ PASS | Spec completed before implementation |
| V. Import and File Organization | ✅ PASS | Using `@/*` imports, co-located with feature |

**All gates pass. Proceeding with implementation planning.**

## Project Structure

### Documentation (this feature)

```text
specs/047-loadout-creation-form/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new API endpoints)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
└── [locale]/
    └── loadouts/
        └── new/
            └── page.tsx          # MODIFY: Enhanced form UI

hooks/
├── useLoadoutCreationForm.ts     # NEW: Form logic hook
└── useSupabaseStore.ts           # MODIFY: Extend createLoadout action

lib/
└── validations/
    └── loadout-schema.ts         # MODIFY: Extended Zod schema

messages/
├── en.json                       # MODIFY: Add loadout creation i18n keys
└── de.json                       # MODIFY: Add German translations

types/
└── loadout.ts                    # EXISTING: Season, ActivityType types (no changes)
```

**Structure Decision**: Follows existing Next.js App Router structure. Form logic extracted to dedicated hook per Feature-Sliced Light architecture. No new API endpoints needed - uses existing Supabase store actions.

## Complexity Tracking

> No constitution violations requiring justification.

N/A - Implementation follows all constitutional principles.
