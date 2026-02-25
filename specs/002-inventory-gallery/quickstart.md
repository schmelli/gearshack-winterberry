# Quickstart: Inventory Gallery

**Feature**: 002-inventory-gallery
**Date**: 2025-12-04

## How to Test

### Prerequisites

1. Ensure you're on the `002-inventory-gallery` branch
2. Run `npm install` (if not already done)
3. Run `npm run dev` to start the development server
4. Open http://localhost:3000/inventory in your browser

---

## Test Scenarios

### Scenario 1: Browse Gallery (US1 - MVP)

**Steps**:
1. Navigate to http://localhost:3000/inventory
2. Verify you see a grid of gear cards (not a placeholder message)
3. Resize the browser window

**Expected**:
- Cards display in a responsive grid
- 1 column on mobile (< 640px)
- 2 columns on tablet (640px-1024px)
- 3-4 columns on desktop (> 1024px)
- Each card shows at minimum: image/placeholder, brand, name

---

### Scenario 2: View Density Switch (US2)

**Steps**:
1. From the gallery, locate the view density control (segmented button or dropdown)
2. Click "Compact"
3. Observe card changes
4. Click "Standard"
5. Observe card changes
6. Click "Detailed"
7. Observe card changes

**Expected**:
- **Compact**: Only image, brand, and name visible
- **Standard**: Image, brand, name, + category label, weight, status badge
- **Detailed**: All standard fields + notes snippet
- Default should be "Standard" on first visit
- Selection persists during session (refresh page to verify)

---

### Scenario 3: Search Filtering (US3)

**Steps**:
1. From the gallery, locate the search input
2. Type "tent" (or another item name/brand)
3. Observe the gallery updates
4. Clear the search field

**Expected**:
- Gallery filters in real-time (no page reload)
- Only items with "tent" in name OR brand are shown
- Search is case-insensitive
- Clearing search shows all items again

---

### Scenario 4: Category Filtering (US3)

**Steps**:
1. From the gallery, locate the category filter dropdown
2. Select "Shelter" (or any category with items)
3. Observe the gallery updates
4. Select "All Categories" or clear filter

**Expected**:
- Only items in selected category are shown
- Dropdown populated with categories from taxonomy
- Clearing filter shows all items

---

### Scenario 5: Combined Filters (US3)

**Steps**:
1. Type "nemo" in the search box
2. Select "Shelter" category
3. Observe results

**Expected**:
- Only items matching BOTH search AND category are shown
- Item count updates to reflect filtered results
- "Clear Filters" option appears when filters active

---

### Scenario 6: Empty State (Edge Case)

**Steps**:
1. Type "xyznonexistent" in the search box
2. Observe the gallery

**Expected**:
- Empty state message appears
- Message suggests adjusting filters
- "Clear Filters" button visible and functional

---

### Scenario 7: Image Placeholder (Edge Case)

**Steps**:
1. Find an item without a primary image in the gallery
2. Observe its card

**Expected**:
- Category-specific icon displayed instead of broken image
- Icon matches the item's category (e.g., Tent for Shelter)
- Layout remains consistent with image cards

---

### Scenario 8: Edit Navigation (US1)

**Steps**:
1. Find any gear card in the gallery
2. Click the "Edit" button on the card
3. Observe navigation

**Expected**:
- Navigates to /inventory/{item-id}/edit
- Edit form loads with item data pre-filled

---

### Scenario 9: Weight Display (US4)

**Steps**:
1. Switch to "Standard" or "Detailed" view
2. Find items with different weights

**Expected**:
- Weights < 1000g display as "Xg" (e.g., "850 g")
- Weights >= 1000g display as "X.XX kg" (e.g., "1.25 kg")
- Items without weight show dash or "—"

---

### Scenario 10: Status Badge (US4)

**Steps**:
1. Switch to "Standard" or "Detailed" view
2. Find items with different statuses (Active, Wishlist, Sold)

**Expected**:
- Each status has visually distinct badge
- Active: likely green/primary color
- Wishlist: likely yellow/warning color
- Sold: likely gray/muted color

---

## Mock Data Verification

The gallery should display 10-15 mock items including:

| Category | Expected Items |
|----------|---------------|
| Shelter | At least 1 tent or tarp |
| Sleep System | At least 1 sleeping bag or pad |
| Packs | At least 1 backpack |
| Clothing | At least 1 jacket or base layer |
| Cooking | At least 1 stove or cookware |
| Other categories | Mix of remaining items |

---

## Browser Testing

Test in multiple browsers and viewports:

- [ ] Chrome Desktop (1920x1080)
- [ ] Chrome Mobile (375x667, use DevTools)
- [ ] Safari Desktop (if available)
- [ ] Firefox Desktop

---

## Performance Checks

- [ ] Page loads in under 2 seconds
- [ ] View density switch feels instant
- [ ] Filtering feels responsive (no lag)
