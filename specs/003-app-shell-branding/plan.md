# Implementation Plan: App Shell & Branding

**Branch**: `003-app-shell-branding` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-app-shell-branding/spec.md`

## Summary

Implement a professional global layout with branded header (sticky, 64px, logo + Rock Salt typography, navigation, notifications, user menu), responsive mobile navigation (hamburger + Sheet), and dark-themed footer (brand column, legal links, social icons). Update root layout to use flex column pattern for sticky footer behavior.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) with React 19+
**Primary Dependencies**: Next.js 16+ (App Router), shadcn/ui, Tailwind CSS 4, lucide-react, next/font/google
**Storage**: N/A (no data persistence for this feature)
**Testing**: Manual testing via browser (responsive design testing)
**Target Platform**: Web (responsive: mobile 320px+, tablet, desktop 1920px+)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Header renders within 500ms, no layout shifts on mobile menu
**Constraints**: Must use existing shadcn/ui components, Tailwind-only styling, no external CSS
**Scale/Scope**: Global layout affecting all pages, 2 new layout components (header, footer)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Feature-Sliced Light | UI stateless, logic in hooks | ✅ PASS | Layout components are stateless, mobile menu state via Sheet's internal state |
| II. TypeScript Strict | No `any`, explicit types | ✅ PASS | Will define NavItem, UserMenuItem types |
| III. Design System | shadcn/ui, Tailwind only | ✅ PASS | Use Sheet for mobile, DropdownMenu for user menu, Button for nav |
| IV. Spec-Driven | Types → Hooks → UI order | ✅ PASS | Types first, then components (no hooks needed - stateless UI) |
| V. Import Organization | @/* paths, feature co-location | ✅ PASS | Components in components/layout/ or components/shell/ |

**Gate Status**: ✅ PASSED - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/003-app-shell-branding/
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
├── layout.tsx              # UPDATE: Add Rock Salt font, wrap with flex layout, add Header/Footer
├── globals.css             # UPDATE: Add Rock Salt CSS variable if needed
├── page.tsx
└── inventory/
    └── ...

# New layout components for this feature
components/
├── ui/                     # Existing shadcn/ui components
│   ├── sheet.tsx           # ✅ Available (for mobile menu)
│   ├── button.tsx          # ✅ Available
│   ├── dropdown-menu.tsx   # ⚠️ NEEDS INSTALL (for user menu)
│   └── avatar.tsx          # ⚠️ NEEDS INSTALL (for user avatar)
└── layout/                 # NEW: Global layout components
    ├── SiteHeader.tsx      # Header with logo, nav, notifications, user menu
    ├── SiteFooter.tsx      # Footer with brand, legal, social
    ├── MobileNav.tsx       # Mobile navigation Sheet content
    └── UserMenu.tsx        # User avatar dropdown menu

# Types for this feature
types/
├── gear.ts                 # Existing
├── inventory.ts            # Existing
└── navigation.ts           # NEW: NavItem, UserMenuItem types

# Static assets (existing)
public/
└── logos/
    ├── small_gearshack_logo.png  # ✅ Available (header)
    └── big_gearshack_logo.png    # ✅ Available (footer)
```

**Structure Decision**: Create `components/layout/` directory for global layout components. These are not feature-specific (like gear-editor or inventory-gallery) but app-wide shell components. Types go in `types/navigation.ts`.

## Complexity Tracking

> No violations - all principles satisfied with simple patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
