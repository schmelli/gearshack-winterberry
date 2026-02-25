# Feature Specification: Rescue & Refine

**Feature Branch**: `011-rescue-refine-bugs`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Fix Runtime Errors, Data Mapping, and UI Modals - address LoadoutCard dynamic href bug, legacy adapter 'Untitled Item' issue, and UI polish for modals/footer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - LoadoutCard Navigation Stability (Priority: P1)

As a user viewing my loadouts page, I want all loadout cards to navigate correctly when clicked, so I don't encounter runtime errors that break the application.

**Why this priority**: Critical bug - the application crashes when navigating due to invalid loadout IDs (hex color values appearing as IDs). This completely breaks the loadout management feature.

**Root Cause**: LoadoutCard receives loadout objects with invalid IDs (e.g., hex color codes like `#4CAF50` instead of valid Firestore document IDs). This suggests data mapping issues in the adapter or store sync.

**Independent Test**: Navigate to /loadouts, click any loadout card, verify URL shows `/loadouts/{valid-id}` (Firestore document ID format) without runtime errors.

**Acceptance Scenarios**:

1. **Given** I am on the loadouts page, **When** I click any loadout card, **Then** I navigate to `/loadouts/{validId}` without errors
2. **Given** the adapter receives malformed data, **When** processing loadouts, **Then** invalid items are logged and excluded (not crash the app)
3. **Given** a loadout has an invalid ID format, **When** rendering LoadoutCard, **Then** a warning is logged but the card is skipped gracefully

---

### User Story 2 - Accurate Gear Item Names from Legacy Data (Priority: P1)

As a user with existing gear in Firestore, I want my gear items to display their actual names from the database, so I can identify my gear correctly instead of seeing "Untitled Item" everywhere.

**Why this priority**: High impact - users see incorrect data which undermines trust in the sync feature. The root cause is in the adapter's field resolution logic.

**Root Cause**: The `FirestoreGearItemSchema` uses `z.string().min(1)` for the `name` field. Legacy Flutter data may store the name in a different field (e.g., `title`, `item_name`, or `displayName`) that the adapter doesn't check. When Zod validation fails, the fallback returns "Untitled Item".

**Independent Test**: Query Firestore directly for a gear item, note the exact field name and value for the item's name. Load the inventory page and verify that same name appears.

**Acceptance Scenarios**:

1. **Given** a gear item has `name: "Osprey Atmos 65"` in Firestore, **When** displayed in inventory, **Then** it shows "Osprey Atmos 65"
2. **Given** a gear item has `title: "My Tent"` (legacy field), **When** adapted, **Then** it shows "My Tent"
3. **Given** a gear item has both `name` and `title` fields, **When** adapted, **Then** `name` takes priority
4. **Given** a gear item has empty name fields, **When** adapted, **Then** it shows "Unnamed Gear" (not "Untitled Item") with console warning

---

### User Story 3 - Edit Loadout Uses Dialog (Priority: P2)

As a user editing a loadout, I want the edit interface to appear as a centered dialog modal, so the experience is consistent with other edit actions in the app.

**Why this priority**: UI polish - the current Sheet slides in from the side which feels inconsistent with the Dialog pattern used elsewhere.

**Independent Test**: Click edit on any loadout, verify a centered Dialog modal appears (not a Sheet sliding from edge).

**Acceptance Scenarios**:

1. **Given** I am on the loadout detail page, **When** I click edit, **Then** a centered Dialog modal opens
2. **Given** the edit Dialog is open, **When** I press Escape or click outside, **Then** the Dialog closes
3. **Given** I make changes in the Dialog, **When** I save, **Then** changes persist and the Dialog closes

---

### User Story 4 - Footer Visual Consistency (Priority: P3)

As a user scrolling through the app, I want the footer to have consistent visual styling with the header, so the app looks polished and cohesive.

**Why this priority**: Visual polish - footer should match header's emerald-50 pastel background style.

**Independent Test**: Scroll to footer, verify background matches header's light emerald/green pastel color.

**Acceptance Scenarios**:

1. **Given** I scroll to the footer, **When** viewing in light mode, **Then** footer has `bg-emerald-50/90` matching header
2. **Given** I scroll to the footer, **When** viewing in dark mode, **Then** footer has appropriate dark emerald styling

---

### User Story 5 - Gear Detail Modal Z-Index (Priority: P3)

As a user viewing gear details from the inventory, I want the gear detail modal to appear above all other content, so nothing overlaps or obscures the modal.

**Why this priority**: Visual polish - modals should always appear on top.

**Independent Test**: Open a gear item detail modal, verify it appears above header, footer, and any other content.

**Acceptance Scenarios**:

1. **Given** I click a gear item, **When** the detail modal opens, **Then** it appears above all other UI elements
2. **Given** the modal is open, **When** scrolling would occur, **Then** background is locked and modal stays centered

---

## Functional Requirements

### FR-001: Loadout ID Validation (P1)
Validate loadout IDs in the adapter before returning loadout objects. Skip items with invalid IDs (not matching Firestore document ID pattern: alphanumeric, ~20 chars).

### FR-002: Name Field Resolution (P1)
Extend `adaptGearItem` to check multiple potential name fields in order: `name`, `title`, `item_name`, `displayName`. Use first non-empty value found.

### FR-003: Graceful Empty Name Handling (P1)
When no valid name is found, use "Unnamed Gear" instead of "Untitled Item". Log warning with document ID for debugging.

### FR-004: LoadoutCard Defensive Rendering (P1)
Add guard in LoadoutCard to validate loadout.id before rendering Link. Skip rendering cards with invalid IDs.

### FR-005: Edit Loadout Dialog Migration (P2)
Replace Sheet component with Dialog for loadout editing interface. Maintain all existing edit functionality.

### FR-006: Footer Styling Update (P3)
Apply `bg-emerald-50/90 backdrop-blur-md` to footer, matching header styling from FR-004 of 009-grand-visual-polish.

### FR-007: Modal Z-Index Standardization (P3)
Ensure all modals (gear detail, edit dialogs) use `z-[60]` or higher to appear above header (`z-50`).

---

## Non-Functional Requirements

### NFR-001: No Breaking Changes
All fixes must maintain backward compatibility with existing Firestore data structure.

### NFR-002: Console Logging for Debug
Log warnings (not errors) for malformed data to help debugging without alarming users.

### NFR-003: Performance
Data validation overhead must not noticeably impact page load (<50ms additional).

---

## Out of Scope

- Migrating legacy Firestore data to new schema (handled separately)
- Creating new Firestore collections or indexes
- Backend/Cloud Function changes
- Authentication changes

---

## Technical Notes

### Files to Modify

1. `lib/firebase/adapter.ts` - FR-001, FR-002, FR-003 (name resolution, ID validation)
2. `lib/validations/adapter.ts` - Update Zod schema to be more lenient on name field
3. `components/loadouts/LoadoutCard.tsx` - FR-004 (defensive rendering)
4. `components/loadouts/EditLoadoutSheet.tsx` → Dialog migration (FR-005)
5. `components/layout/SiteFooter.tsx` - FR-006 (styling)
6. `components/gear/GearDetailModal.tsx` (if exists) - FR-007 (z-index)

### Debugging Steps

1. Check Firestore console for actual field names in legacy gear documents
2. Add console.log in adapter to see raw document structure
3. Trace loadout ID from Firestore → adapter → store → component

---

## Dependencies

- Feature 010-firestore-sync (completed) - provides the adapter and sync infrastructure
- shadcn/ui Dialog component (already installed)
