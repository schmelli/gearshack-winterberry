# Implementation Plan: Repair Sprint - Proxy Route & Navigation Fixes

**Branch**: `035-repair-sprint` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-repair-sprint/spec.md`

## Summary

This repair sprint addresses three critical bugs affecting core functionality:
1. **Image Save Failure**: The `/api/proxy-image` route exists but may not be functioning correctly for external image imports
2. **Navigation 404s**: Components using `next/link` instead of locale-aware `Link` from `@/i18n/navigation`
3. **i18n Errors**: "Invalid language tag" errors from undefined locale values

**Current State**: Fixes are partially implemented as uncommitted changes in the working directory. This plan validates and completes those fixes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, next-intl, shadcn/ui
**Storage**: Firebase Firestore + Firebase Storage
**Testing**: npm run lint, npm run build (no automated test suite specified)
**Target Platform**: Web (Browser)
**Project Type**: Web application (Next.js App Router with i18n)
**Performance Goals**: Standard web app response times
**Constraints**: Must preserve existing locale context across all navigation
**Scale/Scope**: Single application with 2 supported locales (en, de)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | Changes are in hooks/ and components/ appropriately |
| II. TypeScript Strict Mode | PASS | All changes use proper typing |
| III. Design System Compliance | PASS | Using shadcn/ui components |
| IV. Spec-Driven Development | PASS | Spec exists at /specs/035-repair-sprint/spec.md |
| V. Import and File Organization | PASS | Using @/* path alias |

**Code Quality Gates**:
- [ ] `npm run lint` passes
- [ ] `npm run build` completes successfully
- [ ] All TypeScript errors resolved

## Project Structure

### Documentation (this feature)

```text
specs/035-repair-sprint/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output - Research findings
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Affected Files
app/
├── api/
│   └── proxy-image/
│       └── route.ts           # Image proxy endpoint (VERIFY)
└── [locale]/
    ├── layout.tsx             # Root layout with i18n (VERIFY)
    └── loadouts/
        ├── page.tsx           # Uses locale-aware Link (FIX)
        └── new/
            └── page.tsx       # Uses locale-aware Link (FIX)

components/
├── inventory-gallery/
│   └── GearCard.tsx           # Edit link navigation (FIX)
├── layout/
│   └── SiteFooter.tsx         # Footer links (FIX)
└── loadouts/
    ├── GearDetailModal.tsx    # Edit link (FIX)
    ├── LoadoutCard.tsx        # Card navigation (FIX)
    └── LoadoutHeader.tsx      # Back/edit links (FIX)

hooks/
└── useGearEditor.ts           # Post-save redirect (FIX)

i18n/
├── config.ts                  # Locale configuration
├── navigation.ts              # Locale-aware Link, useRouter exports
└── request.ts                 # Server-side locale handling
```

**Structure Decision**: Single Next.js web application with App Router. All fixes are import changes from `next/link` or `next/navigation` to `@/i18n/navigation`.

## Complexity Tracking

No constitution violations. All changes are simple import swaps.

## Findings Summary

### Current Implementation Status

| File | Issue | Status |
|------|-------|--------|
| `app/api/proxy-image/route.ts` | Proxy endpoint | EXISTS - Verify functionality |
| `hooks/useGearEditor.ts` | useRouter import | FIXED (uncommitted) |
| `components/inventory-gallery/GearCard.tsx` | Link import | FIXED (uncommitted) |
| `components/loadouts/GearDetailModal.tsx` | Link import | FIXED (uncommitted) |
| `components/loadouts/LoadoutCard.tsx` | Link import | FIXED (uncommitted) |
| `components/loadouts/LoadoutHeader.tsx` | Link import | FIXED (uncommitted) |
| `components/layout/SiteFooter.tsx` | Link import | FIXED (uncommitted) |
| `app/[locale]/loadouts/page.tsx` | Link import | FIXED (uncommitted) |
| `app/[locale]/loadouts/new/page.tsx` | Link import | FIXED (uncommitted) |
| `app/[locale]/layout.tsx` | Locale handling | CORRECT - Uses `await params` |

### Implementation Approach

1. **Verify proxy route functionality** - Test `/api/proxy-image` endpoint
2. **Validate uncommitted fixes** - Ensure all Link/Router imports are correct
3. **Run build and lint** - Verify no TypeScript/ESLint errors
4. **Manual testing** - Test navigation and save flows in both locales
