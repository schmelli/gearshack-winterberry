# Tasks: Rescue & Refine

**Feature Branch**: `011-rescue-refine-bugs`
**Generated**: 2025-12-05
**Status**: Ready for Implementation

---

## Phase 1: Critical Bug Fixes (P1)

### [X] T001: Add ID Validation Helper
**File**: `lib/firebase/adapter.ts`
**FR**: FR-001
**Depends**: None

Add a helper function to validate Firestore document IDs:
- Create `isValidFirestoreId(id: string): boolean`
- Pattern: alphanumeric, 20+ characters, no special chars like `#`
- Returns false for hex colors, empty strings, undefined

**Acceptance**: Unit test passing for valid/invalid ID patterns.

---

### [X] T002: Extend Name Field Resolution
**File**: `lib/firebase/adapter.ts`
**FR**: FR-002
**Depends**: None

Update `adaptGearItem` to check multiple name fields:
1. Check fields in order: `name`, `title`, `item_name`, `displayName`
2. Use `resolveField` with fallback chain
3. Return first non-empty string found

**Acceptance**: Gear items show actual names from any supported field.

---

### [X] T003: Update Zod Schema for Name Leniency
**File**: `lib/validations/adapter.ts`
**FR**: FR-002, FR-003
**Depends**: None

Make the name field validation more lenient:
1. Change `name: z.string().min(1)` to `name: z.string().optional()`
2. Add `title`, `item_name`, `displayName` as optional fields
3. Handle name resolution in adapter (not schema)

**Acceptance**: Schema validates documents with any name field variant.

---

### [X] T004: Update Default Name to "Unnamed Gear"
**File**: `lib/firebase/adapter.ts`
**FR**: FR-003
**Depends**: T002

Change fallback name from "Untitled Item" to "Unnamed Gear":
1. Update fallback in error handler
2. Update fallback after field resolution fails
3. Add console.warn with document ID when falling back

**Acceptance**: Invalid items show "Unnamed Gear" with console warning.

---

### [X] T005: Add Loadout ID Validation
**File**: `lib/firebase/adapter.ts`
**FR**: FR-001
**Depends**: T001

Update `adaptLoadout` to validate incoming IDs:
1. Use `isValidFirestoreId` helper
2. Log warning for invalid IDs
3. Return valid loadout with sanitized ID or skip

**Acceptance**: Malformed loadouts logged and handled gracefully.

---

### [X] T006: LoadoutCard Defensive Rendering
**File**: `components/loadouts/LoadoutCard.tsx`
**FR**: FR-004
**Depends**: T001

Add guard before rendering:
1. Import `isValidFirestoreId` helper (or add inline check)
2. Validate `loadout.id` before rendering Link
3. Return null with console.warn for invalid IDs

**Acceptance**: Invalid loadout cards don't crash app, log warning.

---

## Phase 2: UI Polish (P2-P3)

### [X] T007: Migrate Edit Loadout to Dialog
**File**: `components/loadouts/EditLoadoutSheet.tsx` → `EditLoadoutDialog.tsx`
**FR**: FR-005
**Depends**: None

Convert Sheet to Dialog:
1. Create new `EditLoadoutDialog.tsx` using Dialog component
2. Port all form fields and logic
3. Update imports in parent components
4. Delete old Sheet component (or keep as fallback)

**Acceptance**: Edit loadout opens centered Dialog modal.

---

### [X] T008: Update Footer Styling
**File**: `components/layout/SiteFooter.tsx`
**FR**: FR-006
**Depends**: None

Match footer to header styling:
1. Add `bg-emerald-50/90 backdrop-blur-md` classes
2. Add dark mode variant `dark:bg-emerald-900/90`
3. Maintain border styling

**Acceptance**: Footer visually matches header pastel green.

---

### [X] T009: Fix Modal Z-Index (Verified OK)
**File**: Various modal components
**FR**: FR-007
**Depends**: None

Ensure modals appear above header:
1. Check gear detail modal z-index
2. Check edit dialogs z-index
3. Set all to `z-[60]` minimum (header is `z-50`)

**Acceptance**: All modals render above header/footer.

---

## Phase 3: Validation & Cleanup

### [X] T010: Run Lint and Build
**Command**: `npm run lint && npm run build`
**Depends**: T001-T009

Verify no errors introduced:
1. Run ESLint
2. Run TypeScript build
3. Fix any reported issues

**Acceptance**: Clean lint and build output.

---

### T011: Manual Testing
**Depends**: T010

Test all user stories:
1. LoadoutCard navigation (no crashes)
2. Gear item names display correctly
3. Edit loadout Dialog works
4. Footer matches header
5. Modals appear above all content

**Acceptance**: All acceptance scenarios pass.

---

## Execution Summary

| Phase | Tasks | Parallel? | Estimated Complexity |
|-------|-------|-----------|---------------------|
| 1 | T001-T006 | T001-T003 parallel, then T004-T006 | Medium |
| 2 | T007-T009 | All parallel | Low |
| 3 | T010-T011 | Sequential | Low |

**Total Tasks**: 11
**Critical Path**: T001 → T004 → T006 → T010 → T011
