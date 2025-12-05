# Research: UI/UX Makeover

**Feature**: 006-ui-makeover | **Date**: 2025-12-05

## Overview

This document captures research decisions for elevating the Loadout Editor and Site Header to premium quality. The feature builds on existing 005-loadout-management components.

## Component Research

### 1. Layout System

**Current State**:
- `app/loadouts/[id]/page.tsx` uses `grid-cols-[3fr_2fr]` with Loadout List left, Picker right
- Mobile: stacked vertically (no explicit mobile handling)

**Research Findings**:
- Layout reversal: Picker (source) left, Loadout (destination) right follows natural LTR reading flow
- Sticky positioning: Right column needs `sticky top-[offset]` with calculated offset for header
- Mobile: `Sheet` component already exists for bottom drawer pattern

**Decision**:
- Reverse grid columns to `grid-cols-[2fr_3fr]` (picker narrower, loadout wider)
- Add `sticky top-24` to loadout list container
- Use existing `Sheet` for mobile "Add Items" action

### 2. Toast Notifications (Sonner)

**Current State**: No toast system in place

**Research Findings**:
- Sonner is the recommended toast library for shadcn/ui projects
- Requires `<Toaster />` provider at layout level
- Simple API: `toast.success("Item added")`, `toast.error("Failed")`
- Supports custom styling via className

**Decision**:
- Install sonner via `npm install sonner`
- Add `<Toaster />` to `app/layout.tsx`
- Use `toast.success()` for item add confirmation (FR-022)

### 3. Interactive Donut Chart (recharts)

**Current State**:
- `WeightDonut.tsx` renders basic PieChart with tooltips
- Uses CSS variable colors via `oklch(var(--chart-N))`
- No click interaction

**Research Findings**:
- recharts `Pie` component supports `onClick` handler per segment
- Can add `<Label>` component inside `Pie` for center text
- Active segment can use `activeShape` prop for highlight effect

**Decision**:
- Add `onClick` prop to `Cell` components
- Add custom `<Label>` for center weight display
- Create `useChartFilter` hook to manage filter state
- Pass `selectedCategoryId` to `LoadoutList` for filtering

### 4. Rock Salt Font for Title

**Current State**:
- Rock Salt font loaded in `app/layout.tsx` via `next/font/google`
- Used in SiteHeader logo text via `font-[family-name:var(--font-rock-salt)]`

**Research Findings**:
- Font already configured, no additional setup needed
- CSS variable `--font-rock-salt` available globally

**Decision**:
- Apply same pattern to loadout title in editor header
- Use `text-3xl font-[family-name:var(--font-rock-salt)]` for loadout name

### 5. Toggle Badges (Activity/Season)

**Current State**: No toggle badge component exists

**Research Findings**:
- shadcn/ui has `Toggle` component for pressed/unpressed state
- `Badge` component for visual display
- Can combine: Toggle as wrapper, Badge for styling

**Decision**:
- Add `Toggle` component via `npx shadcn@latest add toggle`
- Add `Badge` component via `npx shadcn@latest add badge`
- Create `ToggleBadge` composite component
- Store activity/season arrays in Loadout entity (extend type)

### 6. Gear Card Images

**Current State**:
- `GearCard.tsx` in inventory-gallery shows item details
- No image support currently

**Research Findings**:
- `next/image` for optimized image loading
- Aspect ratio container: `aspect-[4/3]` with `object-cover`
- Fallback: Lucide icon (e.g., `Package`) on muted background

**Decision**:
- Add optional `imageUrl` field to GearItem type (if not exists)
- Use `next/image` with `fill` prop inside aspect ratio container
- Show `Package` icon as fallback

### 7. Detail Modal

**Current State**:
- `Dialog` component exists for modals

**Research Findings**:
- Dialog supports custom content/sizing
- Large image should use `aspect-[4/3]` container
- Specs section can use definition list or grid

**Decision**:
- Create `GearDetailModal.tsx` component
- Trigger on card body click (not add button)
- Display: large image, name, brand, description, weight, specs

### 8. Site Header Polish

**Current State**:
- `SiteHeader.tsx` has `h-16` (64px) height
- Uses flex with `items-center`

**Research Findings**:
- Current height adequate but elements feel cramped
- Logo and nav need consistent baseline alignment
- Gap between logo and nav could be larger

**Decision**:
- Increase height to `h-18` (72px) or use `py-4` for more breathing room
- Verify all elements use `items-center` consistently
- Adjust logo container padding/margin for visual balance

## Existing Components Inventory

| Component | Location | Modifications Needed |
|-----------|----------|---------------------|
| Sheet | `components/ui/sheet.tsx` | None - use as-is for mobile |
| Dialog | `components/ui/dialog.tsx` | None - use for detail modal |
| Card | `components/ui/card.tsx` | None - existing |
| Button | `components/ui/button.tsx` | None - existing |
| ScrollArea | `components/ui/scroll-area.tsx` | None - for long lists |

## Components to Add (shadcn/ui)

| Component | Command | Purpose |
|-----------|---------|---------|
| Toggle | `npx shadcn@latest add toggle` | Badge interaction |
| Badge | `npx shadcn@latest add badge` | Activity/season display |

## Dependencies to Install

| Package | Version | Purpose |
|---------|---------|---------|
| sonner | ^2.0.0 | Toast notifications |

## Type Extensions Required

```typescript
// Extend Loadout interface in types/loadout.ts
export interface Loadout {
  // ... existing fields
  activityTypes?: ('hiking' | 'camping' | 'climbing' | 'skiing')[];
  seasons?: ('spring' | 'summer' | 'fall' | 'winter')[];
}

// Extend GearItem interface in types/gear.ts (if not exists)
export interface GearItem {
  // ... existing fields
  imageUrl?: string;
  description?: string;
}
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| recharts onClick performance | Low | Medium | Use memo for chart data |
| Mobile sheet UX issues | Medium | Low | Test on real devices |
| Image loading delays | Medium | Low | Use blur placeholder |

## Conclusion

All required components either exist or can be added via shadcn/ui CLI. Sonner is the only npm dependency needed. Type extensions to Loadout and GearItem are straightforward additions.
