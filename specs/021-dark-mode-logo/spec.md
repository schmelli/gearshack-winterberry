# Feature Specification: Dark Mode & Logo Rescue Sprint

**Feature Branch**: `021-dark-mode-logo`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "Dark Mode & Logo Rescue Sprint - Fix logo visibility by removing CSS filters, add gradient backgrounds for gear cards in dark mode, update global dark mode background color, and verify upload fix logic."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Site Logo Correctly (Priority: P1)

As a user visiting the site, I want to see the original branded logo image clearly visible in the header so that the site maintains its visual identity and looks professional.

**Why this priority**: The logo is the primary branding element and a broken logo undermines user trust and site credibility. This is the most critical visual bug to fix.

**Independent Test**: Navigate to any page and verify the logo displays with its original colors and appearance without any visual distortion.

**Acceptance Scenarios**:

1. **Given** the site header is visible, **When** I view the logo in light mode, **Then** the logo displays with its original PNG colors (no CSS filters applied)
2. **Given** the site header is visible, **When** I view the logo in dark mode, **Then** the logo displays with its original PNG colors and remains clearly visible

---

### User Story 2 - View Gear Cards with Enhanced Dark Mode Depth (Priority: P1)

As a user browsing my gear inventory in dark mode, I want gear cards to have a gradient background that gives depth to transparent product images, making them visually appealing rather than flat.

**Why this priority**: Dark mode is a core user experience feature, and flat dark cards with transparent images look unprofessional. This enhances the visual quality of the primary content display.

**Independent Test**: Toggle to dark mode, navigate to inventory gallery, and verify gear cards have a subtle gradient background with proper borders.

**Acceptance Scenarios**:

1. **Given** dark mode is enabled, **When** I view the inventory gallery, **Then** each gear card displays with a vertical gradient from stone-800 at top to stone-950 at bottom
2. **Given** light mode is enabled, **When** I view the inventory gallery, **Then** each gear card maintains its clean white background
3. **Given** dark mode is enabled, **When** I view gear cards, **Then** card borders appear subtle with a stone-700 color

---

### User Story 3 - View Improved Dark Mode Background (Priority: P2)

As a user browsing in dark mode, I want the overall background to use a deep forest/stone color that matches the brand identity instead of pure black, creating a more cohesive and nature-inspired visual experience.

**Why this priority**: A branded dark mode background enhances the overall aesthetic and aligns with the outdoor/nature theme of the gear tracking application.

**Independent Test**: Toggle to dark mode and verify the page background uses a deep forest/stone color instead of pure black.

**Acceptance Scenarios**:

1. **Given** dark mode is enabled, **When** I view any page, **Then** the background color is a deep forest/stone shade (similar to the footer color) rather than pure black
2. **Given** dark mode is enabled, **When** I compare the background to the footer, **Then** the colors appear cohesive and part of the same design system

---

### User Story 4 - Upload Fix Verification (Priority: P3)

As a developer maintaining the codebase, I want to verify the previous "Instant Feedback" upload fix is correctly implemented so that users see immediate feedback when uploading images.

**Why this priority**: This is a verification task rather than new implementation. It ensures existing functionality works as expected.

**Independent Test**: Code review of useGearEditor.ts to confirm the upload-update-redirect flow is correctly sequenced.

**Acceptance Scenarios**:

1. **Given** the useGearEditor.ts file exists, **When** I review the upload logic, **Then** the code shows: await upload, update local store, redirect (in that order)

---

### Edge Cases

- What happens when viewing the logo on backgrounds of varying contrast?
- How does the gradient appear on gear cards with no image vs. with transparent images?
- How do the colors appear on different display types and color profiles?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the site header logo without any CSS filter effects (no brightness-0, invert, or similar filters)
- **FR-002**: System MUST render gear cards with a white background in light mode
- **FR-003**: System MUST render gear cards with a vertical gradient background (stone-800 to stone-950) in dark mode
- **FR-004**: System MUST apply a subtle border (stone-700) to gear cards in dark mode
- **FR-005**: System MUST use a deep forest/stone background color for dark mode (approximately #0C120C or similar) instead of pure black
- **FR-006**: System MUST ensure the dark mode background color is consistent with the footer color scheme

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Logo is visible and displays original colors in both light and dark modes without distortion
- **SC-002**: Gear cards in dark mode display gradient backgrounds that create visual depth for transparent product images
- **SC-003**: Dark mode background uses a cohesive forest/stone color that matches the brand identity
- **SC-004**: All visual changes pass lint and build validation without errors
- **SC-005**: Upload fix verification confirms correct implementation (await upload -> update store -> redirect)

## Assumptions

- The original logo PNG file has appropriate colors for both light and dark backgrounds, or only needs to work on one background type
- The gradient colors (stone-800, stone-950, stone-700) are available in the project's Tailwind configuration
- The deep forest/stone background color (#0C120C or similar) provides sufficient contrast for text readability
- The existing useGearEditor.ts upload logic follows the expected pattern and only needs verification, not refactoring

## Out of Scope

- Creating multiple logo variants for different color schemes
- Implementing logo color inversion logic for dark mode
- Performance optimization of gradient rendering
- A/B testing of color schemes
