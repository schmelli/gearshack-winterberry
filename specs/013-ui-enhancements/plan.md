# Implementation Plan: UI Enhancements & Component Polish

**Branch**: `013-ui-enhancements` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)

## Summary

This feature installs Navigation Menu and Hover Card components from shadcn/ui, adds manufacturer hover cards to GearCard brand names, adds an image search placeholder to MediaSection, and fixes any icon overlap issues in the Edit Gear modal.

Technical approach:
1. **Component Installation**: Use shadcn CLI to add navigation-menu and hover-card
2. **Brand Hover Cards**: Wrap brand names in GearCard with HoverCard component
3. **Image Search Placeholder**: Add disabled button with Search icon and tooltip
4. **Icon Overlap Fix**: Review and fix any spacing issues in MediaSection

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react
**Testing**: Manual testing (no automated test framework)
**Target Platform**: Web (responsive, desktop-first)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | All logic in components, UI stateless |
| II. TypeScript Strict Mode | PASS | No `any` types |
| III. Design System Compliance | PASS | Using shadcn/ui components |
| IV. Spec-Driven Development | PASS | Spec created before implementation |
| V. Import and File Organization | PASS | All imports use `@/*` alias |

## Project Structure

### Files to Create/Modify

```text
components/
├── ui/
│   ├── navigation-menu.tsx   # NEW - shadcn component
│   └── hover-card.tsx        # NEW - shadcn component
├── inventory-gallery/
│   └── GearCard.tsx          # MODIFY - Add brand hover card
└── gear-editor/
    └── sections/
        └── MediaSection.tsx  # MODIFY - Add image search placeholder
```

## Implementation Strategy

1. Install shadcn components first (foundation)
2. Add brand hover cards to GearCard
3. Add image search placeholder to MediaSection
4. Review and fix any icon overlap issues
5. Run lint and build validation
