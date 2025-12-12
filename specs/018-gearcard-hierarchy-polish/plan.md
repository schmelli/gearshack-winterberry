# Implementation Plan: GearCard Hierarchy & Polish Sprint

**Branch**: `018-gearcard-hierarchy-polish` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-gearcard-hierarchy-polish/spec.md`

## Summary

Redesign the GearCard component to establish a clear visual hierarchy across three density modes: Compact (horizontal), Standard (large square), and Detailed (extra-large with description). Add visual polish with shadows and borders for a premium feel.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, shadcn/ui, Tailwind CSS 4
**Storage**: N/A (visual component only)
**Testing**: Manual testing (visual verification)
**Target Platform**: Web (all modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Instant layout changes on density toggle
**Constraints**: Single file modification, maintain existing props API
**Scale/Scope**: Single component with three layout variants

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | PASS | GearCard is a stateless display component |
| II. TypeScript Strict Mode | PASS | Existing types unchanged |
| III. Design System Compliance | PASS | Using shadcn/ui Card, Tailwind CSS |
| IV. Spec-Driven Development | PASS | Spec completed first |
| V. Import and File Organization | PASS | Single file modification |

**All gates pass.**

## Project Structure

### Source Code Changes

```text
components/inventory-gallery/
└── GearCard.tsx           # MODIFY: Redesign all three density layouts
```

**Structure Decision**: Single component file modification. The layout logic changes within DENSITY_CONFIG and the component's conditional rendering.

## Key Implementation Details

### Compact View (Horizontal Layout)
- Change from vertical to horizontal flex layout
- Image: Fixed size (h-24 w-24), white background, object-contain
- Text: flex-grow, right side with Brand/Name/Weight only
- Card aspect ratio: ~2:1

### Standard View (Swap with current Detailed)
- Vertical layout with large square image (aspect-square)
- Shows: Brand, Name, Category, Weight, Status Badge
- This becomes the default view

### Detailed View (Swap with current Standard)
- Vertical layout with extra-large image (aspect-[4/3])
- Shows: All standard info + description snippet
- This is for power users

### Visual Polish (All Views)
- Add `shadow-sm` or `shadow` class to Card
- Maintain `border-stone-200` for definition
- Enhance hover shadow with `hover:shadow-md`
