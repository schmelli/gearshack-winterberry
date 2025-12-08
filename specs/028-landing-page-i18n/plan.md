# Implementation Plan: Landing Page & i18n Strings

**Branch**: `028-landing-page-i18n` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/028-landing-page-i18n/spec.md`

## Summary

Build a compelling landing page for GearGraph/Gearshack with hero, features, social proof, and pricing sections. Extend the existing i18n infrastructure (Feature 027) with translations for Auth, Inventory, and GearEditor namespaces. The landing page shows "Start Free Trial" for guests and "Go to Dashboard" for authenticated users.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+
**Primary Dependencies**: next-intl (from Feature 027), shadcn/ui, Tailwind CSS 4, lucide-react
**Storage**: N/A (landing page is stateless; auth state from existing Firebase Auth)
**Testing**: Manual testing (lint + build validation, no automated tests requested)
**Target Platform**: Web (responsive: 320px mobile to desktop)
**Project Type**: Web application (Next.js App Router with i18n routing)
**Performance Goals**: Landing page loads in <3 seconds (SC-001)
**Constraints**: Mobile-first responsive design, dark mode default, Deep Forest theme (#405A3D)
**Scale/Scope**: 4 landing page sections, 4 translation namespaces (Landing, Auth, Inventory, GearEditor)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | Landing page sections will be stateless components; auth state consumed via `useAuthContext` hook |
| II. TypeScript Strict | ✅ PASS | All components typed; translation keys type-safe via global.d.ts |
| III. Design System | ✅ PASS | Uses shadcn/ui (Card, Button), Tailwind CSS, lucide-react icons |
| IV. Spec-Driven | ✅ PASS | Full spec exists at spec.md with 5 user stories, 15 FRs |
| V. Import/Organization | ✅ PASS | Uses @/* imports; landing components in `components/landing/` |

**Technology Constraints Compliance**:
- ✅ Next.js 16+ App Router (existing)
- ✅ TypeScript strict mode (existing)
- ✅ Tailwind CSS 4 only (existing)
- ✅ shadcn/ui components (existing)
- ✅ lucide-react icons (existing)
- ✅ next-intl (already added in Feature 027)

## Project Structure

### Documentation (this feature)

```text
specs/028-landing-page-i18n/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Requirements checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing)
app/
└── [locale]/
    ├── layout.tsx           # Root layout with i18n (Feature 027)
    └── page.tsx             # Landing page (REPLACE with landing components)

# New landing page components
components/
└── landing/
    ├── HeroSection.tsx      # FR-001: Hero with headline, subtitle, CTA
    ├── FeatureGrid.tsx      # FR-002: 3 key product benefits
    ├── SocialProof.tsx      # FR-003: Trust indicators section
    ├── PricingPreview.tsx   # FR-004: Tier comparison
    └── LandingPage.tsx      # Orchestrates sections, handles auth state

# Translation files (extend existing)
messages/
├── en.json                  # Add: Landing, Auth, Inventory, GearEditor namespaces
└── de.json                  # Add: German translations for new namespaces

# Type definitions
types/
└── landing.ts               # PricingTier, FeatureItem interfaces
```

**Structure Decision**: Follows existing Next.js App Router with i18n routing from Feature 027. Landing page components in `components/landing/` following Feature-Sliced Light (stateless UI). Translations extend existing `messages/` files.

## Complexity Tracking

> No violations - all Constitution checks pass.
