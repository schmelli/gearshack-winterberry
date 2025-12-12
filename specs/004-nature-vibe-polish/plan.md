# Implementation Plan: Nature Vibe Polish

**Branch**: `004-nature-vibe-polish` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-nature-vibe-polish/spec.md`

## Summary

Apply a "Modern Nature" visual theme to transform the clinical black/white appearance into an outdoor-adventure aesthetic. This includes: (1) updating CSS variables in globals.css for nature-inspired colors (forest green primary, terracotta accent, stone backgrounds), (2) fixing header logo/text alignment and adding backdrop blur, (3) updating card and component styling to match the theme, (4) increasing global border radius to 0.75rem, and (5) implementing dark mode with a settings page toggle that persists user preference.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) with React 19+
**Primary Dependencies**: Next.js 16+ (App Router), shadcn/ui, Tailwind CSS 4, next-themes (for dark mode)
**Storage**: localStorage for theme preference persistence
**Testing**: Manual visual testing, browser DevTools for contrast checking
**Target Platform**: Web (responsive: mobile 320px+, tablet, desktop 1920px+)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Theme switch under 100ms, no layout shift on theme change
**Constraints**: Must maintain shadcn/ui compatibility, WCAG AA contrast ratios
**Scale/Scope**: Global CSS changes affecting all pages, 1 new page (Settings), 1 new hook (useTheme wrapper)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Feature-Sliced Light | UI stateless, logic in hooks | ✅ PASS | Theme toggle uses next-themes hook; Settings page is stateless |
| II. TypeScript Strict | No `any`, explicit types | ✅ PASS | Theme types already defined by next-themes |
| III. Design System | shadcn/ui, Tailwind only | ✅ PASS | All changes via CSS variables and Tailwind classes |
| IV. Spec-Driven | Types → Hooks → UI order | ✅ PASS | Using existing types, wrapper hook for theme, then UI |
| V. Import Organization | @/* paths, feature co-location | ✅ PASS | Settings page in app/settings/, hook in hooks/ |

**Gate Status**: ✅ PASSED - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/004-nature-vibe-polish/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A (no API contracts for UI-only feature)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing)
app/
├── layout.tsx              # UPDATE: Add ThemeProvider wrapper
├── globals.css             # UPDATE: Nature-themed CSS variables (light + dark)
├── settings/               # NEW: Settings page
│   └── page.tsx            # Theme toggle UI
└── inventory/
    └── page.tsx            # No changes needed (inherits theme)

# Updated components
components/
├── ui/                     # Existing shadcn/ui components (no changes)
├── layout/
│   ├── SiteHeader.tsx      # UPDATE: Fix alignment, update colors
│   └── SiteFooter.tsx      # UPDATE: Adjust for theme colors
├── inventory-gallery/
│   ├── GearCard.tsx        # UPDATE: Stone borders, themed placeholder
│   ├── StatusBadge.tsx     # UPDATE: Theme-appropriate colors
│   └── CategoryPlaceholder.tsx  # UPDATE: Muted forest green icons
└── theme/                  # NEW: Theme components
    └── ThemeProvider.tsx   # next-themes provider wrapper

# Hooks
hooks/
└── useThemePreference.ts   # NEW: Theme preference hook (wraps next-themes)

# Navigation constants
lib/constants/
└── navigation.ts           # UPDATE: Add Settings to USER_MENU_ITEMS
```

**Structure Decision**: Extend existing structure with a new `app/settings/` page and `components/theme/` directory for theme-related components. Theme hook goes in `hooks/` per constitution.

## Complexity Tracking

> No violations - all principles satisfied with simple patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
