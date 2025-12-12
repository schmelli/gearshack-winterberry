# Quickstart: Grand Polish Sprint Testing Scenarios

**Feature**: 007-grand-polish-sprint
**Date**: 2025-12-05

## Prerequisites

1. Run `npm run dev` to start development server
2. Open http://localhost:3000 in browser
3. Ensure you have at least 5 gear items in inventory
4. Ensure you have at least 2 loadouts created

---

## Scenario 1: Global Layout Centering

**Steps**:
1. Open browser to 1920px wide viewport
2. Navigate to Home page (/)
3. Navigate to Inventory page (/inventory)
4. Navigate to Loadouts page (/loadouts)

**Expected**:
- [ ] Content on all pages is horizontally centered
- [ ] Visible margins exist on both sides (not hugging left edge)
- [ ] Content width is consistent across pages (~1280px max)
- [ ] On mobile (<768px), content fills width with small padding

---

## Scenario 2: Site Header Redesign

**Steps**:
1. View header on desktop viewport (>768px)
2. Inspect logo and title size
3. Check navigation link positions
4. Scroll down page and verify sticky behavior

**Expected**:
- [ ] Header height is visibly taller (~96px / h-24)
- [ ] Logo is approximately 80px × 80px (2x previous)
- [ ] "Gearshack" title is noticeably larger (~text-3xl)
- [ ] Navigation links (Inventory, Loadouts, Community) are on the RIGHT side
- [ ] Logo blends seamlessly with header background (no white box visible)
- [ ] Header remains sticky with blur effect when scrolling

---

## Scenario 3: Footer Redesign

**Steps**:
1. Scroll to bottom of any page
2. Examine footer structure
3. Resize browser to mobile width

**Expected**:
- [ ] Footer has dark stone/charcoal background (zinc-900 or similar)
- [ ] 4 columns visible on desktop: Logo/About, Features, Resources, Connect
- [ ] Text is smaller/subtle compared to main content
- [ ] Columns stack vertically on mobile
- [ ] Logo is present in first column

---

## Scenario 4: Base Weight Calculation - Mark Item as Worn

**Steps**:
1. Navigate to an existing loadout (/loadouts/[id])
2. Add at least 3 items with known weights (e.g., 100g, 200g, 500g)
3. Note the displayed weights in the header
4. Click the "shirt" icon toggle on the 200g item to mark as worn

**Expected**:
- [ ] Total Weight shows sum of all items (e.g., 800g)
- [ ] Base Weight is displayed separately
- [ ] After marking 200g item as worn, Base Weight decreases by 200g
- [ ] Total Weight remains unchanged (still 800g)
- [ ] Worn toggle is visually highlighted/active

---

## Scenario 5: Base Weight Calculation - Mark Item as Consumable

**Steps**:
1. In same loadout from Scenario 4
2. Click the "food/apple" icon toggle on the 500g item to mark as consumable

**Expected**:
- [ ] Base Weight further decreases by 500g
- [ ] Total Weight remains unchanged
- [ ] Consumable toggle is visually highlighted/active
- [ ] Weight summary shows: Total 800g, Base 100g (if 200g worn, 500g consumable)

---

## Scenario 6: Base Weight Edge Case - Both Worn and Consumable

**Steps**:
1. Mark the 100g item as BOTH worn AND consumable

**Expected**:
- [ ] Item shows both toggles active
- [ ] Base Weight is 0g (all items excluded)
- [ ] Item weight is only subtracted once (not double-subtracted)

---

## Scenario 7: Loadout Metadata Editing

**Steps**:
1. Navigate to a loadout
2. Click the pencil/edit icon next to the loadout title
3. Modify the name to "Test Loadout Updated"
4. Add a description "This is a test description"
5. Change the season selection
6. Change the trip date
7. Save changes

**Expected**:
- [ ] Sheet/Dialog opens with form fields
- [ ] Fields: Name, Description, Season, Trip Date are all editable
- [ ] After saving, changes appear immediately in header
- [ ] Cancel button discards changes

---

## Scenario 8: Universal Card Click - Inventory Page

**Steps**:
1. Navigate to Inventory page (/inventory)
2. Click on the body/content area of any gear card (not the edit button)

**Expected**:
- [ ] GearDetailDialog/Modal opens showing item details
- [ ] Dialog includes large image, name, brand, specs
- [ ] Dialog header contains an edit pencil icon
- [ ] Clicking edit icon navigates to edit page or opens edit mode

---

## Scenario 9: Universal Card Click - Loadout Picker

**Steps**:
1. Navigate to a loadout editor (/loadouts/[id])
2. In the picker panel (left side), click on a gear card body

**Expected**:
- [ ] GearDetailDialog opens (same as inventory)
- [ ] Add button on card does NOT trigger dialog when clicked
- [ ] Can close dialog and continue adding items

---

## Scenario 10: Universal Card Click - Loadout List

**Steps**:
1. In the loadout editor, view items in the loadout list (right side)
2. Click on a gear card in the loadout list

**Expected**:
- [ ] GearDetailDialog opens
- [ ] Remove button and worn/consumable toggles do NOT trigger dialog
- [ ] Dialog shows correct item details

---

## Scenario 11: Loadouts Dashboard Search

**Steps**:
1. Navigate to /loadouts
2. Ensure at least 3 loadouts exist with different names
3. Type part of a loadout name in the search field

**Expected**:
- [ ] No generic "Loadouts" page title visible
- [ ] Search/filter toolbar is displayed prominently
- [ ] Typing filters loadouts in real-time (<100ms)
- [ ] Only matching loadouts are shown
- [ ] Clearing search shows all loadouts

---

## Scenario 12: Loadouts Dashboard Season Filter

**Steps**:
1. On /loadouts page
2. Ensure loadouts have different seasons assigned
3. Select a season filter (e.g., "Summer")

**Expected**:
- [ ] Only loadouts with that season are displayed
- [ ] Can combine with search filter
- [ ] Selecting "All" or clearing filter shows all loadouts

---

## Scenario 13: Dialog/Sheet Animations

**Steps**:
1. Open any Dialog (e.g., GearDetailDialog)
2. Close the dialog
3. Open any Sheet (e.g., mobile add items sheet)
4. Close the sheet

**Expected**:
- [ ] Dialog fades in smoothly (~200-300ms)
- [ ] Dialog fades out smoothly (no instant disappear)
- [ ] Sheet slides up smoothly from bottom
- [ ] Sheet slides down smoothly when closing

---

## Scenario 14: Sticky Category Headers in Loadout Editor

**Steps**:
1. Navigate to a loadout with 10+ items across multiple categories
2. Scroll down through the loadout list

**Expected**:
- [ ] Category headers stick to top as you scroll
- [ ] Next category header pushes previous one out
- [ ] Headers remain readable during scroll

---

## Scenario 15: Add Button Micro-Feedback

**Steps**:
1. In loadout editor, click the "+" button on a picker item

**Expected**:
- [ ] Button shows brief visual feedback (color change, checkmark, or pulse)
- [ ] Feedback lasts ~200ms then returns to normal
- [ ] Item is added to loadout successfully

---

## Scenario 16: Empty Loadout Weight Display

**Steps**:
1. Create a new empty loadout
2. View the weight summary in the header

**Expected**:
- [ ] Total Weight shows "0g"
- [ ] Base Weight shows "0g"
- [ ] No errors or NaN displayed

---

## Performance Targets

| Metric | Target | How to Test |
|--------|--------|-------------|
| Dialog open | <300ms | Visual smoothness |
| Filter response | <100ms | Type in search, observe results |
| Toggle update | Immediate | Click worn/consumable toggle |
| Animation duration | 200-300ms | Visual inspection |

---

## Checklist Summary

After completing all scenarios:

- [ ] All 16 scenarios pass
- [ ] No console errors
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Mobile responsive layout works
- [ ] Dark mode compatible (if applicable)
