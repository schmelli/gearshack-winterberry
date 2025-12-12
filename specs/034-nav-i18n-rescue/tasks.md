# Tasks: Navigation & Translation Rescue Sprint

**Feature**: 034-nav-i18n-rescue
**Generated**: 2025-12-08
**Plan**: [plan.md](./plan.md)

## Task Overview

| ID | Task | Priority | Dependencies | Status |
|----|------|----------|--------------|--------|
| T001 | Verify i18n/navigation exports | - | None | pending |
| T002 | Fix useGearEditor.ts useRouter import | P1 (US1) | T001 | pending |
| T003 | Fix GearCard.tsx Link import | P1 (US2) | T001 | pending |
| T004 | Fix loadouts/page.tsx Link import | P1 (US2) | T001 | pending |
| T005 | Fix loadouts/new/page.tsx imports | P1 (US2) | T001 | pending |
| T006 | Fix LoadoutCard.tsx Link import | P1 (US2) | T001 | pending |
| T007 | Fix GearDetailModal.tsx Link import | P1 (US2) | T001 | pending |
| T008 | Fix LoadoutHeader.tsx Link import | P1 (US2) | T001 | pending |
| T009 | Fix SiteFooter.tsx Link import | P1 (US2) | T001 | pending |
| T010 | Run lint check | - | T002-T009 | pending |
| T011 | Run build check | - | T010 | pending |
| T012 | Manual testing | - | T011 | pending |

---

## Phase 1: Setup (Verification)

**Purpose**: Verify the i18n navigation infrastructure is in place

- [ ] T001 Verify `@/i18n/navigation` exports Link, useRouter, usePathname, redirect in `i18n/navigation.ts`

**Checkpoint**: i18n navigation module confirmed working

---

## Phase 2: User Story 1 - Locale-Aware Navigation After Save (Priority: P1) 🎯 MVP

**Goal**: Fix programmatic navigation to preserve locale after saving gear items

**Independent Test**: Navigate to /de/inventory → Click Edit on any item → Save → Verify redirect goes to /de/inventory

### Implementation for User Story 1

- [ ] T002 [US1] Update useRouter import from `next/navigation` to `@/i18n/navigation` in `hooks/useGearEditor.ts`

**Checkpoint**: Saving a gear item in German locale now redirects to /de/inventory (not /inventory)

---

## Phase 3: User Story 2 - Working Edit Links in Gallery (Priority: P1)

**Goal**: Fix Link components to preserve locale in navigation URLs

**Independent Test**: Click Edit button on gear card in /de/inventory → Should navigate to /de/inventory/[id]/edit

### Implementation for User Story 2

- [ ] T003 [P] [US2] Update Link import from `next/link` to `@/i18n/navigation` in `components/inventory-gallery/GearCard.tsx`
- [ ] T004 [P] [US2] Update Link import from `next/link` to `@/i18n/navigation` in `app/[locale]/loadouts/page.tsx`
- [ ] T005 [P] [US2] Update Link and useRouter imports to `@/i18n/navigation` in `app/[locale]/loadouts/new/page.tsx`
- [ ] T006 [P] [US2] Update Link import from `next/link` to `@/i18n/navigation` in `components/loadouts/LoadoutCard.tsx`
- [ ] T007 [P] [US2] Update Link import from `next/link` to `@/i18n/navigation` in `components/loadouts/GearDetailModal.tsx`
- [ ] T008 [P] [US2] Update Link import from `next/link` to `@/i18n/navigation` in `components/loadouts/LoadoutHeader.tsx`
- [ ] T009 [P] [US2] Update Link import from `next/link` to `@/i18n/navigation` in `components/layout/SiteFooter.tsx`

**Checkpoint**: All navigation links preserve locale prefix in URLs

---

## Phase 4: User Story 3 - Complete Translation Coverage (Priority: P2)

**Goal**: Verify translation keys are complete (investigation found no changes needed)

**Independent Test**: Browse all pages in German locale → Verify no MISSING_MESSAGE errors

### Implementation for User Story 3

> **Note**: Research confirmed translation keys are already correct. This phase is verification only.
> - `Inventory.itemCount` exists ✓
> - `Inventory.showingItems` exists ✓
> - No new keys needed

**Checkpoint**: All translations render correctly without errors

---

## Phase 5: Polish & Validation

**Purpose**: Verify all changes work correctly

- [ ] T010 Run lint check with `npm run lint` - verify no errors
- [ ] T011 Run build check with `npm run build` - verify successful compilation
- [ ] T012 Manual testing: Complete full edit flow in both EN and DE locales

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on T001 verification
- **User Story 2 (Phase 3)**: Depends on T001 verification - can run parallel to US1
- **User Story 3 (Phase 4)**: Verification only - no code changes
- **Polish (Phase 5)**: Depends on all implementation tasks (T002-T009)

### Parallel Opportunities

All tasks in User Story 2 (T003-T009) can run in parallel as they modify different files:

```bash
# Parallel execution - all modify different files:
T003: components/inventory-gallery/GearCard.tsx
T004: app/[locale]/loadouts/page.tsx
T005: app/[locale]/loadouts/new/page.tsx
T006: components/loadouts/LoadoutCard.tsx
T007: components/loadouts/GearDetailModal.tsx
T008: components/loadouts/LoadoutHeader.tsx
T009: components/layout/SiteFooter.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001: Verify i18n infrastructure
2. T002: Fix useGearEditor.ts
3. **VALIDATE**: Test save redirect in /de locale
4. Deploy if critical - users can now save without losing locale

### Full Fix (User Stories 1 + 2)

1. Complete T001-T002 (US1)
2. Complete T003-T009 in parallel (US2)
3. T010-T011: Lint and build
4. T012: Full manual testing

### Quick Implementation

Since all import changes are identical patterns, they can be done rapidly:

```typescript
// Change this pattern:
import Link from 'next/link';
// or
import { useRouter } from 'next/navigation';

// To this pattern:
import { Link } from '@/i18n/navigation';
// or
import { useRouter } from '@/i18n/navigation';
// or (when both needed)
import { Link, useRouter } from '@/i18n/navigation';
```

---

## Notes

- All changes are import statement updates only
- No logic changes required - href values remain the same
- DO NOT change files using `usePathname` for detection (Shell.tsx, ProtectedRoute.tsx)
- The i18n Link/useRouter automatically handles locale prefixing
