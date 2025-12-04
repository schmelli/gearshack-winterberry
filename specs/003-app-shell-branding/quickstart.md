# Quickstart: App Shell & Branding

**Feature**: 003-app-shell-branding
**Date**: 2025-12-04

## How to Test

### Prerequisites

1. Ensure you're on the `003-app-shell-branding` branch
2. Run `npm install` (if not already done)
3. Run `npm run dev` to start the development server
4. Open http://localhost:3000 in your browser

---

## Test Scenarios

### Scenario 1: Header Visibility (US1 - MVP)

**Steps**:
1. Navigate to http://localhost:3000
2. Observe the header at the top of the page

**Expected**:
- Header is 64px tall with white/translucent background
- Left side shows Gearshack logo (≈40px height) + "Gearshack" text in Rock Salt font
- Logo and text are clickable links to homepage

---

### Scenario 2: Desktop Navigation (US1)

**Steps**:
1. View the page at desktop width (> 768px)
2. Observe the center navigation area

**Expected**:
- Navigation links visible in center: "Inventory", "Loadouts", "Community"
- "Inventory" link appears active/clickable
- "Loadouts" and "Community" appear grayed out/disabled
- Clicking "Inventory" navigates to /inventory
- Clicking disabled links does nothing

---

### Scenario 3: Sticky Header (US1)

**Steps**:
1. Navigate to a page with enough content to scroll (e.g., /inventory with mock items)
2. Scroll down the page
3. Scroll back up

**Expected**:
- Header remains fixed at the top while scrolling
- Content scrolls underneath the header
- No layout shift or flickering

---

### Scenario 4: Notification Bell (US2)

**Steps**:
1. View the header
2. Observe the notification area on the right side

**Expected**:
- Bell icon visible
- Small red badge dot in top-right corner of bell
- Bell is clickable (no action needed yet)

---

### Scenario 5: User Menu (US2)

**Steps**:
1. View the header
2. Click on the user avatar (circular image)
3. Observe the dropdown menu
4. Click a menu item

**Expected**:
- Clicking avatar opens a dropdown menu
- Menu contains: "Profile", "Settings", "Sign out"
- Clicking any item closes the menu
- Keyboard navigation works (arrow keys, Escape to close)

---

### Scenario 6: Mobile Navigation (US3)

**Steps**:
1. Resize browser to mobile width (< 768px) or use DevTools device mode
2. Observe the header changes
3. Tap/click the hamburger menu icon
4. Observe the slide-out menu

**Expected**:
- Desktop navigation links disappear
- Hamburger menu icon (☰) appears on the left side
- Tapping icon opens a slide-out sheet from the left
- Sheet contains: "Inventory", "Loadouts", "Community" links
- Disabled links appear grayed out in mobile menu too
- Tapping a link closes the menu and navigates (if enabled)
- Can close menu by tapping outside or pressing Escape

---

### Scenario 7: Footer Display (US4)

**Steps**:
1. Navigate to any page
2. Scroll to the bottom of the page

**Expected**:
- Dark background (slate-900) footer visible
- Three columns:
  - Brand: Large Gearshack logo + tagline "Gear management for the obsessed."
  - Legal: "Impressum", "Privacy", "Terms" links
  - Social: Instagram and Twitter/X icons
- Bottom bar: "© 2025 Gearshack. Built with Vibe."

---

### Scenario 8: Sticky Footer (Edge Case)

**Steps**:
1. Navigate to a page with minimal content (or create one temporarily)
2. Observe the footer position

**Expected**:
- Footer remains at the bottom of the viewport
- Content area fills the space between header and footer
- No gap between content and footer when scrolling

---

### Scenario 9: Typography (US5)

**Steps**:
1. View the header
2. Observe the "Gearshack" brand name
3. View other text elements on the page

**Expected**:
- "Gearshack" in header uses Rock Salt handwritten font
- All other text (nav links, buttons, body) uses sans-serif (Inter/Geist)
- Font loads without visible flash of unstyled text (FOUT)

---

### Scenario 10: Logo Fallback (Edge Case)

**Steps**:
1. (For testing) Temporarily rename logo files or use network throttling to block images
2. Observe the header and footer

**Expected**:
- If logo fails to load, "Gearshack" text remains visible
- Layout doesn't break or shift significantly

---

## Browser Testing

Test in multiple browsers and viewports:

- [ ] Chrome Desktop (1920x1080)
- [ ] Chrome Mobile (375x667, use DevTools)
- [ ] Safari Desktop (if available)
- [ ] Firefox Desktop
- [ ] Chrome Tablet (768x1024)

---

## Responsive Breakpoints

| Breakpoint | Width | Expected Behavior |
|------------|-------|------------------|
| Mobile | < 768px | Hamburger menu, stacked footer columns |
| Tablet | 768px - 1024px | Desktop nav visible, footer may be 2-3 cols |
| Desktop | > 1024px | Full desktop layout, 3 footer columns |

---

## Performance Checks

- [ ] Page loads in under 2 seconds
- [ ] Rock Salt font loads without visible FOUT
- [ ] Mobile menu opens smoothly (no lag)
- [ ] No layout shift when scrolling
- [ ] Footer stays at bottom on short pages
