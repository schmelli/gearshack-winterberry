# Quickstart: Nature Vibe Polish

**Feature**: 004-nature-vibe-polish
**Date**: 2025-12-04

## How to Test

### Prerequisites

1. Ensure you're on the `004-nature-vibe-polish` branch
2. Run `npm install` (to get next-themes dependency)
3. Run `npm run dev` to start the development server
4. Open http://localhost:3000 in your browser

---

## Test Scenarios

### Scenario 1: Nature Color Theme - Light Mode (US1 - MVP)

**Steps**:
1. Navigate to http://localhost:3000
2. Observe the overall page appearance

**Expected**:
- Background is warm off-white (stone tone), not pure white
- Navigation links are deep forest green
- "Add Gear" button is terracotta/clay colored
- Overall feel is "outdoor/nature" not "clinical/corporate"

---

### Scenario 2: Header Alignment (US2)

**Steps**:
1. View the header at the top of any page
2. Observe the logo icon and "Gearshack" text alignment

**Expected**:
- Logo icon and "Gearshack" text are perfectly vertically centered
- No visible offset between the two elements
- Spacing between logo and text looks balanced (approximately 12px gap)

---

### Scenario 3: Header Backdrop Blur (US2)

**Steps**:
1. Navigate to /inventory (or any page with enough content to scroll)
2. Scroll down the page
3. Observe the header as content passes behind it

**Expected**:
- Content is visible through the header but blurred (frosted glass effect)
- Header has slightly translucent background
- No flickering or visual glitches

---

### Scenario 4: Navigation Link Hover (US2)

**Steps**:
1. View the desktop navigation links in the header
2. Hover over the "Inventory" link

**Expected**:
- Link shows underline effect on hover
- Link color is forest green
- Transition is smooth

---

### Scenario 5: Card Styling (US3)

**Steps**:
1. Navigate to /inventory
2. View the gear cards in the gallery

**Expected**:
- Cards have white backgrounds
- Cards have subtle stone-colored borders (visible against off-white background)
- Cards have rounded corners (more rounded than before)

---

### Scenario 6: Status Badge Colors (US3)

**Steps**:
1. Navigate to /inventory
2. Find items with different statuses (Active, Wishlist, Sold)

**Expected**:
- "Active" badge: Green (forest green tint)
- "Wishlist" badge: Terracotta/clay colored
- "Sold" badge: Muted gray

---

### Scenario 7: Placeholder Icons (US3)

**Steps**:
1. Navigate to /inventory
2. Find a gear item without an image (shows category placeholder)

**Expected**:
- Placeholder icon uses muted forest green color
- Not gray as before

---

### Scenario 8: Border Radius (US4)

**Steps**:
1. View buttons, cards, and input fields across the app
2. Compare the corner roundness

**Expected**:
- All interactive elements have noticeably rounded corners
- Corners appear friendlier/more organic than before
- Radius is consistent across all elements

---

### Scenario 9: Settings Page Access (US5)

**Steps**:
1. Click on the user avatar in the header
2. Select "Settings" from the dropdown menu

**Expected**:
- Settings page loads at /settings
- Page shows "Settings" heading
- Appearance section is visible with theme toggle

---

### Scenario 10: Dark Mode Toggle (US5)

**Steps**:
1. Navigate to Settings page
2. Find the Appearance section
3. Toggle dark mode on

**Expected**:
- Entire app immediately switches to dark theme
- Background becomes deep forest/slate color
- Cards become darker with appropriate contrast
- Text remains readable
- No page refresh required

---

### Scenario 11: Dark Mode Colors (US5)

**Steps**:
1. Enable dark mode in Settings
2. Navigate through the app (Home, Inventory, etc.)

**Expected**:
- Backgrounds are deep forest green/slate (not pure black)
- Primary text is light and readable
- Forest green primary color is lighter for visibility
- Terracotta accent remains warm but adjusted for dark background
- Overall aesthetic maintains "nature" feel

---

### Scenario 12: Theme Persistence (US5)

**Steps**:
1. Enable dark mode in Settings
2. Close the browser tab
3. Reopen http://localhost:3000

**Expected**:
- App loads in dark mode (preference remembered)
- No flash of light mode before dark mode applies

---

### Scenario 13: Toggle Back to Light Mode (US5)

**Steps**:
1. With dark mode enabled, go to Settings
2. Toggle dark mode off

**Expected**:
- App immediately returns to light mode
- All nature-themed light colors are applied
- Preference is saved for next visit

---

## Browser Testing

Test in multiple browsers:

- [ ] Chrome Desktop (1920x1080)
- [ ] Chrome Mobile (375x667, use DevTools)
- [ ] Safari Desktop (if available)
- [ ] Firefox Desktop
- [ ] Chrome with dark mode disabled in OS settings

---

## Accessibility Checks

- [ ] Text contrast ratios meet WCAG AA (use browser DevTools)
- [ ] Focus states are visible on interactive elements
- [ ] Theme toggle is keyboard accessible
- [ ] Color is not the only means of conveying information (badges have text labels)

---

## Performance Checks

- [ ] Theme switch happens instantly (< 100ms)
- [ ] No layout shift when switching themes
- [ ] No flash of wrong theme on page load
- [ ] Backdrop blur doesn't cause scroll jank
