# Implementation Plan: The Great Sync

**Branch**: `010-firestore-sync` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-firestore-sync/spec.md`

## Summary

Connect the web app's local Zustand store to Firestore for real-time data sync with existing Flutter app data. Implement a legacy data adapter to transform Flutter data formats to TypeScript interfaces, CRUD operations with optimistic updates, image upload to Firebase Storage, and sync status indicators in the UI.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+
**Primary Dependencies**: Firebase SDK (auth, firestore, storage), zustand, zod, shadcn/ui, lucide-react
**Storage**: Firebase Firestore (`userBase/{uid}/gearInventory`, `userBase/{uid}/loadouts`), Firebase Storage
**Testing**: Manual testing (no test framework configured per project standards)
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Initial sync < 5 seconds, real-time updates < 2 seconds
**Constraints**: Must preserve existing Firestore data structure, handle legacy Flutter field formats
**Scale/Scope**: Single user data sync, ~100-500 gear items, ~10-50 loadouts per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | All sync logic will be in hooks (useFirestoreSync, useStore). UI components remain stateless. |
| II. TypeScript Strict Mode | ✅ PASS | Adapter will use Zod for legacy data validation. No `any` types. |
| III. Design System Compliance | ✅ PASS | Sync indicator uses existing shadcn/ui components. No new base components. |
| IV. Spec-Driven Development | ✅ PASS | Full spec exists. Types → Hooks → UI order will be followed. |
| V. Import and File Organization | ✅ PASS | Using @/* imports. Files organized by feature. |

**Gate Status**: ✅ All gates pass. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/010-firestore-sync/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/                     # Pages (no changes needed for this feature)
components/
├── layout/
│   └── SiteHeader.tsx   # Add sync indicator
└── ui/                  # Existing shadcn components

hooks/
├── useStore.ts          # Modify: Add Firestore CRUD, setRemoteData
├── useFirestoreSync.ts  # NEW: Real-time listeners, auth-triggered sync
└── useAuth.ts           # Existing: Auth state (dependency)

lib/
├── firebase/
│   ├── config.ts        # Existing: Firebase init
│   ├── firestore.ts     # Existing: Profile functions
│   ├── adapter.ts       # NEW: Legacy data transformation
│   └── storage.ts       # NEW: Image upload service
└── validations/
    └── gear-schema.ts   # NEW: Zod schemas for legacy validation

types/
├── gear.ts              # Existing: GearItem interface
├── loadout.ts           # Existing: Loadout interface
└── sync.ts              # NEW: SyncState, adapter types
```

**Structure Decision**: Extends existing Next.js App Router structure. New files follow established patterns in hooks/, lib/firebase/, and types/.

## Complexity Tracking

> No violations requiring justification. Design follows existing patterns.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Optimistic Updates | Local-first with background sync | Best UX - instant feedback, graceful rollback |
| Legacy Adapter | Zod validation + transform | Type-safe conversion without `any` |
| Real-time Sync | onSnapshot listeners | Firebase best practice for real-time data |
