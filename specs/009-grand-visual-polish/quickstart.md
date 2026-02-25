# Quickstart: Grand Visual Polish Sprint

**Feature**: 009-grand-visual-polish
**Date**: 2025-12-05
**Purpose**: Manual testing procedures and validation checklist

## Prerequisites

- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- Development server running (`npm run dev`)
- Browser with DevTools available

## Quick Validation Commands

```bash
# Build check (must pass before merge)
npm run build

# Lint check (must pass before merge)
npm run lint

# Start development server
npm run dev
```

## Manual Test Checklist

### US1: Professional Typography (P1)

- [ ] **T1.1** Navigate to `/inventory` - verify H1 heading uses sans-serif font
- [ ] **T1.2** Navigate to `/loadouts` - verify H1 heading uses sans-serif font
- [ ] **T1.3** Navigate to `/settings` - verify H1 heading uses sans-serif font
- [ ] **T1.4** Open any loadout for editing - verify loadout name H1 uses sans-serif font
- [ ] **T1.5** Verify site header "Gearshack" logo uses Rock Salt font
- [ ] **T1.6** Open mobile menu - verify "Gearshack" logo uses Rock Salt font
- [ ] **T1.7** Navigate to `/login` - verify only logo text uses Rock Salt

### US2: Redesigned Site Header (P1)

- [ ] **T2.1** View any page - verify header has light pastel green background (emerald-50 tone)
- [ ] **T2.2** Verify header has slight transparency with backdrop blur
- [ ] **T2.3** Verify logo and navigation are vertically centered
- [ ] **T2.4** Verify header height provides comfortable spacing (~96px)
- [ ] **T2.5** Resize browser window - verify header maintains alignment
- [ ] **T2.6** Toggle dark mode - verify header switches to emerald-900 background

### US3: Loadout Editor Column Layout (P1)

- [ ] **T3.1** Open a loadout for editing on desktop (width > 768px)
- [ ] **T3.2** Verify Inventory Picker appears in LEFT column
- [ ] **T3.3** Verify Loadout Items list appears in RIGHT column
- [ ] **T3.4** Scroll down through long inventory list
- [ ] **T3.5** Verify Loadout Items panel remains visible (sticky positioned)
- [ ] **T3.6** Resize to mobile width (< 768px)
- [ ] **T3.7** Verify columns stack vertically (inventory above or in bottom sheet)

### US4: Loadout Header with Inline Editing (P2)

- [ ] **T4.1** View a loadout - verify title is bold, clear, sans-serif H1
- [ ] **T4.2** Verify description text appears positioned effectively in header area
- [ ] **T4.3** Click "Edit Details" or description area
- [ ] **T4.4** Verify inline editing activates (no modal opens)
- [ ] **T4.5** Edit description text, click away or save
- [ ] **T4.6** Verify changes persist (refresh page to confirm)

### US5: Activity Matrix Visualization (P2)

- [ ] **T5.1** Open a loadout for editing
- [ ] **T5.2** Locate the Activity selector area
- [ ] **T5.3** Verify Activity Matrix displays 4 progress bars (Weight, Comfort, Durability, Safety)
- [ ] **T5.4** Select "Hiking" - verify Weight shows high, Comfort medium
- [ ] **T5.5** Select "Camping" - verify Weight shows low, Comfort shows high
- [ ] **T5.6** Select multiple activities - verify values average/blend
- [ ] **T5.7** Change selection - verify bars transition smoothly

### US6: Full-Width Footer (P2)

- [ ] **T6.1** Scroll to bottom of any page
- [ ] **T6.2** Verify footer background (emerald-900) spans full screen width
- [ ] **T6.3** Verify footer content respects max-w-7xl container constraint
- [ ] **T6.4** Compare padding - should be appropriately sized (not excessively tall)
- [ ] **T6.5** Test on multiple viewport sizes

### US7: Component Overlap Fixes (P2)

- [ ] **T7.1** Open a gear detail modal (click on gear card body)
- [ ] **T7.2** Verify Edit icon and Close (X) icon are clearly separated
- [ ] **T7.3** Verify Edit icon is easily clickable without accidentally clicking Close
- [ ] **T7.4** Verify Close button is easily accessible
- [ ] **T7.5** Open GearCard in inventory - verify uploaded image displays correctly

## Edge Case Tests

- [ ] **E1** Loadout with no description - verify graceful empty state
- [ ] **E2** Activity Matrix with no activities selected - verify neutral/default display
- [ ] **E3** Very narrow viewport (320px) - verify header logo remains visible
- [ ] **E4** Footer content overflow on small screens - verify proper wrapping

## Responsive Viewport Tests

Test all pages at these viewport widths:
- [ ] Mobile: 375px (iPhone SE)
- [ ] Mobile: 390px (iPhone 12/13/14)
- [ ] Tablet: 768px
- [ ] Desktop: 1024px
- [ ] Wide Desktop: 1440px

## Build Validation

```bash
# Must complete without errors
npm run build

# Expected output:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages
```

## Lint Validation

```bash
# Must complete without errors
npm run lint

# Expected output:
# ✓ No ESLint warnings or errors
```

## Success Criteria Checklist

Per spec.md Success Criteria:

- [ ] **SC-001**: 100% of H1/H2 headings use sans-serif font; only logo uses Rock Salt
- [ ] **SC-002**: Header visually distinct with pastel green background on all pages
- [ ] **SC-003**: Loadout editor shows inventory on left, loadout on right (desktop)
- [ ] **SC-004**: Users can scroll inventory while loadout panel remains visible (sticky)
- [ ] **SC-005**: Users can edit loadout description inline without modal
- [ ] **SC-006**: Activity selection displays 4-bar matrix with differentiated values
- [ ] **SC-007**: Footer background spans full width on all pages
- [ ] **SC-008**: No UI element overlap in gear detail modal
- [ ] **SC-009**: All changes maintain responsive behavior across viewports

## Troubleshooting

### Typography Not Updating
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache
3. Restart dev server

### Header Color Not Showing
1. Check for Tailwind CSS cache issues
2. Verify `emerald-50` is a valid Tailwind color
3. Check dark mode toggle state

### Sticky Not Working
1. Verify parent container has sufficient height
2. Check `top-28` offset is correct for header height
3. Inspect z-index conflicts

### Activity Matrix Empty
1. Verify `ACTIVITY_PRIORITY_MATRIX` is exported
2. Check activity types match exactly
3. Verify component receives activityTypes prop
