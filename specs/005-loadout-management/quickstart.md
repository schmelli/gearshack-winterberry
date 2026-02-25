# Quickstart Test Scenarios: Loadout Management

**Feature**: 005-loadout-management
**Date**: 2025-12-05

## Prerequisites

1. Run `npm run dev` to start development server
2. Navigate to `http://localhost:3000`
3. Ensure browser localStorage is accessible (not in private/incognito if testing persistence)

---

## Scenario 1: View Empty Loadouts Dashboard

**User Story**: US1 (Create and Manage Loadouts)
**Requirement**: FR-005, FR-008

**Steps**:
1. Click "Loadouts" in the navigation header
2. Observe the dashboard page

**Expected**:
- Page displays at `/loadouts`
- Empty state message shown (e.g., "No loadouts yet")
- "Create New Loadout" button is visible and uses accent color (terracotta)
- Navigation link "Loadouts" is now enabled (was previously disabled)

---

## Scenario 2: Create New Loadout

**User Story**: US1 (Create and Manage Loadouts)
**Requirement**: FR-008, FR-024

**Steps**:
1. From Loadouts dashboard, click "Create New Loadout"
2. Enter name: "PCT Section A"
3. Enter trip date: 2025-07-15
4. Save the loadout

**Expected**:
- Redirected to loadout editor page at `/loadouts/[id]`
- Loadout name "PCT Section A" displayed in header
- Trip date shown as "Jul 15, 2025"
- Item list is empty
- Weight bar shows "0 g"

---

## Scenario 3: Add Items to Loadout

**User Story**: US2 (Add Gear Items to Loadouts)
**Requirement**: FR-013, FR-014, FR-016

**Steps**:
1. In loadout editor, view the Picker panel on the right
2. Observe all inventory items listed
3. Click on "Hornet Elite 2P" (tent, 1180g)
4. Click on "Ghost Whisperer/2" (jacket, 220g)
5. Click on "PocketRocket Deluxe" (stove, 83g)

**Expected**:
- Each clicked item appears in the List panel on the left
- Visual feedback (animation/highlight) when item is added
- Items grouped by category: Shelter, Clothing, Cooking
- Weight bar updates to show 1,483g
- Added items remain visible in Picker (grayed out or with checkmark)

---

## Scenario 4: Real-Time Weight Tracking

**User Story**: US3 (Track Real-Time Weight Totals)
**Requirement**: FR-017, FR-018, FR-019

**Steps**:
1. Continue from Scenario 3 with 3 items (1,483g total)
2. Add more items until total exceeds 4.5kg
3. Continue adding until total exceeds 9kg

**Expected**:
- Weight bar visible at all times (sticky)
- Weight updates instantly (<100ms) when items added
- Under 4.5kg: Weight bar displays in green (forest green, `--primary`)
- 4.5kg - 9kg: Weight bar displays in amber (terracotta, `--accent`)
- Over 9kg: Weight bar displays in red (`--destructive`)

---

## Scenario 5: Search Items in Picker

**User Story**: US2 (Add Gear Items to Loadouts)
**Requirement**: FR-013

**Steps**:
1. In loadout editor, focus on search input in Picker panel
2. Type "NEMO"
3. Observe filtered results
4. Clear search and type "sleeping"

**Expected**:
- "NEMO" search shows: Hornet Elite 2P, Disco 15
- Results appear within 200ms
- "sleeping" search shows: Disco 15, NeoAir XLite NXT
- Search is case-insensitive
- Search matches on name and brand

---

## Scenario 6: Remove Item from Loadout

**User Story**: US2 (Add Gear Items to Loadouts)
**Requirement**: FR-015

**Steps**:
1. In loadout editor with items, click on an item in the List panel
2. Observe the item removal

**Expected**:
- Clicked item is removed from loadout
- Weight bar updates immediately
- Item returns to available state in Picker
- If last item in category, category header disappears

---

## Scenario 7: View Donut Chart

**User Story**: US4 (Visualize Weight Distribution)
**Requirement**: FR-021, FR-022, FR-023

**Steps**:
1. In loadout editor with items from multiple categories
2. Observe the donut chart
3. Hover over different segments

**Expected**:
- Donut chart displays weight breakdown by category
- Colors use app theme: forest green, terracotta, stone variants
- NO rainbow colors (no random red, blue, purple)
- Tooltip on hover shows category name and weight
- Chart updates as items are added/removed

---

## Scenario 8: View Loadout Dashboard Cards

**User Story**: US1 (Create and Manage Loadouts)
**Requirement**: FR-005, FR-006, FR-007

**Steps**:
1. Create multiple loadouts with different items
2. Navigate back to `/loadouts` dashboard

**Expected**:
- Cards displayed in responsive grid
- Each card shows: name, trip date, total weight, item count
- Mini donut chart preview on each card
- Cards are clickable (navigates to editor)

---

## Scenario 9: Data Persistence

**User Story**: US5 (Persistent Data Storage)
**Requirement**: FR-002, FR-003

**Steps**:
1. Create a loadout with several items
2. Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R)
3. Navigate to `/loadouts`

**Expected**:
- All loadouts preserved after refresh
- Item assignments preserved
- No data loss
- No explicit "save" action was required

---

## Scenario 10: Delete Loadout

**User Story**: US6 (Delete Loadouts)
**Requirement**: FR-025

**Steps**:
1. On Loadouts dashboard, click delete button on a loadout card
2. Observe confirmation dialog
3. Click "Cancel"
4. Click delete again and confirm

**Expected**:
- Confirmation dialog appears with loadout name
- Cancel dismisses dialog, loadout unchanged
- Confirm deletes loadout permanently
- Loadout removed from dashboard
- Gear items are NOT deleted (only loadout association)

---

## Scenario 11: Duplicate Item Prevention

**User Story**: Edge Case
**Requirement**: FR-026

**Steps**:
1. In loadout editor, add "Ghost Whisperer/2" to loadout
2. Attempt to click on "Ghost Whisperer/2" again in Picker

**Expected**:
- Item appears only once in loadout
- Second click is either prevented or ignored
- No duplicate entries in List panel
- Weight not double-counted

---

## Scenario 12: Items Without Weight

**User Story**: Edge Case
**Requirement**: Assumption

**Steps**:
1. If an item with `weightGrams: null` exists, add it to loadout
2. Observe weight bar and list

**Expected**:
- Item displayed with "-- g" or "0 g"
- Total weight calculation treats null as 0
- Item still counts toward item count
- Donut chart handles gracefully (excludes from weight segments)

---

## Scenario 13: Mobile Responsive Layout

**User Story**: All
**Requirement**: FR-010, FR-011

**Steps**:
1. Open loadout editor on mobile viewport (< 768px)
2. Interact with both List and Picker

**Expected**:
- Single column layout (stacked vertically)
- List panel above Picker panel
- Weight bar remains visible (sticky at bottom)
- All interactions work with touch
- Search keyboard appears on focus

---

## Scenario 14: Navigation Enablement

**User Story**: US1
**Requirement**: Implied by FR-005

**Steps**:
1. Check navigation header for "Loadouts" link
2. Verify it is now clickable

**Expected**:
- "Loadouts" nav item is enabled (was previously disabled)
- Link navigates to `/loadouts`
- No longer shows disabled styling (opacity)

---

## Test Coverage Summary

| User Story | Scenarios Covered |
|------------|-------------------|
| US1: Create/Manage | 1, 2, 8, 14 |
| US2: Add Items | 3, 5, 6, 11 |
| US3: Weight Tracking | 4 |
| US4: Visualization | 7 |
| US5: Persistence | 9 |
| US6: Delete | 10 |
| Edge Cases | 11, 12, 13 |
