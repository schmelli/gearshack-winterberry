# Quickstart: UI/UX Makeover

**Feature**: 006-ui-makeover | **Date**: 2025-12-05

## Prerequisites

1. Feature 005-loadout-management must be complete
2. At least one loadout with 5+ items from multiple categories exists
3. Development server running: `npm run dev`

## Test Scenarios

### Scenario 1: Layout Reversal (US1 - Priority P1)

**Steps**:
1. Navigate to `/loadouts`
2. Click on an existing loadout to open the editor
3. Observe the two-column layout

**Expected**:
- Inventory picker is on the LEFT side
- Loadout list is on the RIGHT side
- Layout feels natural for adding items (source → destination)

**Acceptance Criteria**:
- FR-002: Inventory picker displays on left column
- FR-003: Loadout list displays on right column

---

### Scenario 2: Sticky Loadout Panel (US1 - Priority P1)

**Steps**:
1. Open a loadout in the editor
2. Scroll down through a long inventory list (50+ items)
3. Observe the loadout panel behavior

**Expected**:
- Loadout list panel remains visible while scrolling
- Panel has sticky positioning at top of viewport
- Proper gap between header and sticky panel

**Acceptance Criteria**:
- FR-003: Loadout list has sticky positioning on desktop

---

### Scenario 3: Mobile Layout (US1 - Priority P1)

**Steps**:
1. Resize browser to mobile viewport (<768px)
2. Open a loadout in the editor
3. Observe the layout change

**Expected**:
- Loadout list appears at the top
- "Add Items" button appears at the bottom
- Tapping button opens a bottom sheet/drawer

**Acceptance Criteria**:
- FR-004: Stacks loadout list above on mobile
- FR-005: Provides bottom sheet/drawer for adding items
- SC-005: Sheet opens within 200ms

---

### Scenario 4: Rock Salt Title (US2 - Priority P1)

**Steps**:
1. Open a loadout in the editor
2. Observe the loadout name display

**Expected**:
- Loadout name displays in Rock Salt font
- Font size is large (3xl or equivalent)
- Distinctive, hand-written appearance

**Acceptance Criteria**:
- FR-006: Loadout title in distinctive Rock Salt font

---

### Scenario 5: Activity Badge Toggle (US2 - Priority P1)

**Steps**:
1. Open a loadout in the editor
2. Find the activity badges (Hiking, Camping, etc.)
3. Click on "Hiking" badge
4. Click on "Camping" badge
5. Click on "Hiking" badge again

**Expected**:
- Badges toggle on/off with visual feedback
- Multiple badges can be selected simultaneously
- Selections persist with the loadout

**Acceptance Criteria**:
- FR-007: Interactive activity badges that toggle
- FR-010: Badge selections persist with loadout
- SC-007: Toggle works with single tap/click

---

### Scenario 6: Season Badge Toggle (US2 - Priority P1)

**Steps**:
1. Open a loadout in the editor
2. Find the season badges (Summer, Winter, etc.)
3. Toggle seasons on/off

**Expected**:
- Same behavior as activity badges
- Visual distinction between selected/unselected

**Acceptance Criteria**:
- FR-008: Interactive season badges that toggle
- FR-010: Selections persist with loadout

---

### Scenario 7: Weight Progress Bar (US2 - Priority P1)

**Steps**:
1. Open a loadout with items
2. Observe the weight progress bar in header area
3. Add more items to increase weight

**Expected**:
- Progress bar shows current base weight
- Progress relative to 4.5kg ultralight goal
- Updates in real-time as items added

**Acceptance Criteria**:
- FR-009: Weight progress bar showing current base weight

---

### Scenario 8: Chart Hover Tooltip (US3 - Priority P2)

**Steps**:
1. Open a loadout with items from multiple categories
2. Hover over a donut chart segment

**Expected**:
- Tooltip appears showing category name
- Tooltip shows weight in grams
- Tooltip shows percentage of total

**Acceptance Criteria**:
- FR-011: Tooltips on hover show category name and weight

---

### Scenario 9: Chart Click Filter (US3 - Priority P2)

**Steps**:
1. Open a loadout with items from 3+ categories
2. Click on a donut chart segment
3. Observe the loadout list
4. Click the same segment again

**Expected**:
- First click: List filters to show only that category
- Visual indication of active filter
- Second click: Filter clears, all items shown

**Acceptance Criteria**:
- FR-012: Clicking segment filters loadout list
- SC-004: Filter applies within 100ms

---

### Scenario 10: Chart Center Weight (US3 - Priority P2)

**Steps**:
1. Open a loadout with items
2. Observe the center of the donut chart

**Expected**:
- Total weight displayed in chart center
- Formatted with thousands separator (e.g., "2,450g")

**Acceptance Criteria**:
- FR-013: Total weight displayed in center of donut

---

### Scenario 11: Gear Card Image Display (US4 - Priority P2)

**Steps**:
1. Open a loadout editor
2. View gear cards in the inventory picker
3. Find an item WITH an image URL
4. Find an item WITHOUT an image URL

**Expected**:
- Items with images: Image renders in 4:3 aspect container
- Items without images: Package icon on subtle background

**Acceptance Criteria**:
- FR-015: Images render in aspect-ratio containers
- FR-016: Placeholder icons for items without images

---

### Scenario 12: Gear Detail Modal (US4 - Priority P2)

**Steps**:
1. Open a loadout editor
2. Click on the BODY of a gear card (not the add button)
3. Observe the modal

**Expected**:
- Modal opens with large image
- Shows item name, brand
- Shows description (from notes field)
- Shows specifications (weight, dimensions)

**Acceptance Criteria**:
- FR-017: Modal opens on card body click

---

### Scenario 13: Add Button Isolation (US4 - Priority P2)

**Steps**:
1. Open a loadout editor
2. Click the "+" button on a gear card

**Expected**:
- Item is added to loadout
- Modal does NOT open
- Toast notification confirms action

**Acceptance Criteria**:
- FR-018: Add button adds item without opening modal
- FR-022: Toast notification on item add

---

### Scenario 14: Site Header Alignment (US5 - Priority P2)

**Steps**:
1. View the site header on any page
2. Inspect vertical alignment of elements

**Expected**:
- Logo, navigation links, and action buttons aligned
- All elements vertically centered
- Header has adequate breathing room

**Acceptance Criteria**:
- FR-019: All header elements vertically centered
- FR-020: Adequate header height
- FR-021: Logo and nav on consistent baseline
- SC-006: Elements align within 2px of center

---

### Scenario 15: Toast Notification (US6 - Priority P3)

**Steps**:
1. Open a loadout editor
2. Add an item from the picker

**Expected**:
- Toast notification appears confirming action
- Toast auto-dismisses after ~3 seconds
- Non-blocking (doesn't require interaction)

**Acceptance Criteria**:
- FR-022: Toast notification when item added
- SC-003: Toast appears within 300ms

---

### Scenario 16: Empty State (US6 - Priority P3)

**Steps**:
1. Create a new loadout
2. View the empty loadout list

**Expected**:
- Friendly empty state message (e.g., "Your pack is empty")
- Helpful guidance on how to add items
- No scroll required to see message

**Acceptance Criteria**:
- FR-023: Empty state UI when loadout has no items
- SC-008: Empty state immediately visible

---

## Smoke Test Checklist

- [ ] Layout reversal works on desktop
- [ ] Sticky panel works on scroll
- [ ] Mobile sheet opens and closes
- [ ] Rock Salt font displays correctly
- [ ] Activity/season badges toggle
- [ ] Weight progress bar updates
- [ ] Chart tooltips appear on hover
- [ ] Chart filter works on click
- [ ] Gear images display with fallback
- [ ] Detail modal opens on card click
- [ ] Toast appears on item add
- [ ] Empty state displays guidance
- [ ] Header elements properly aligned

## Performance Checks

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Toast appearance | <300ms | Add item, observe notification |
| Chart filter | <100ms | Click segment, observe list update |
| Mobile sheet | <200ms | Tap "Add Items", observe animation |
| Weight update | Real-time | Add item, observe weight bar |
