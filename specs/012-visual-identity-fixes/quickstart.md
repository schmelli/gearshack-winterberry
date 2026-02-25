# Quickstart: Visual Identity Overhaul & Data Fixes

**Feature Branch**: `012-visual-identity-fixes`
**Date**: 2025-12-05

## Overview

This feature updates Gearshack's visual identity with new brand colors and fixes several UX issues:

1. **Brand Colors**: Deep Forest Green (#405A3D) header/footer, Pale Mist (#FCFDF7) background
2. **Data Fix**: Resolve "Untitled Item" bug with extended name field resolution
3. **GearCard Density**: Make density toggle actually change card sizes
4. **Modal Polish**: Add backdrop overlay and convert LoadoutMetadata to Dialog

## Key Changes

### 1. Theme Colors (globals.css)

Update CSS variables:

```css
:root {
  --primary: 120 19% 30%;  /* Deep Forest Green HSL */
  --background: 75 50% 98%; /* Pale Mist HSL */
}
```

Or use arbitrary values in components:
- Header/Footer: `bg-[#405A3D]`
- App background: `bg-[#FCFDF7]`

### 2. SiteHeader Updates

```tsx
// Background: Deep Forest Green
<header className="bg-[#405A3D] text-white ...">

// Logo: White, Rock Salt, text-3xl
<span className="font-[family-name:var(--font-rock-salt)] text-3xl text-white">
  Gearshack
</span>

// Navigation: text-lg, font-bold, active indicator
<Link
  className={cn(
    "text-lg font-bold",
    isActive && "border-b-2 border-white"
  )}
>
```

### 3. SiteFooter Updates

```tsx
// Match header styling
<footer className="bg-[#405A3D] text-white ...">
```

### 4. GearCard Density Sizing

```tsx
const DENSITY_CONFIG = {
  compact: {
    card: 'min-h-[180px]',
    image: 'h-32 object-contain',
    showDescription: false,
  },
  standard: {
    card: 'min-h-[280px]',
    image: 'aspect-square',
    showDescription: false,
  },
  detailed: {
    card: 'min-h-[400px]',
    image: 'aspect-[4/3]',
    showDescription: true,
  },
};
```

### 5. Dialog Overlay (components/ui/dialog.tsx)

```tsx
<DialogPrimitive.Overlay
  className="bg-black/60 backdrop-blur-sm fixed inset-0 z-50 ..."
/>
```

### 6. Season Selector (New Component)

```tsx
import { Sun, Snowflake, Leaf, Flower2 } from 'lucide-react';

const SEASONS = [
  { value: 'spring', label: 'Spring', icon: Flower2 },
  { value: 'summer', label: 'Summer', icon: Sun },
  { value: 'fall', label: 'Fall', icon: Leaf },
  { value: 'winter', label: 'Winter', icon: Snowflake },
];

// Render as clickable cards with icon + label
```

### 7. Extended Name Resolution (adapter.ts)

```typescript
// Resolution order:
const resolvedName =
  resolveField(validated, 'name', 'title') ??
  resolveField(validated, 'productName', 'item_name') ??
  resolveField(validated, 'displayName', 'label') ??
  null;

// Brand+model fallback
if (!resolvedName && brand && model) {
  return `${brand} ${model}`;
}

// Brand-only fallback
if (!resolvedName && brand) {
  return `${brand} Item`;
}

// Final fallback
return resolvedName?.trim() || 'Unnamed Gear';
```

Add debug logging:
```typescript
console.log('RAW LEGACY DOC:', id, doc);
```

## Files Modified

| File | Changes |
|------|---------|
| `app/globals.css` | Update --primary and --background CSS variables |
| `components/layout/SiteHeader.tsx` | Deep Forest Green bg, white text, active nav indicator |
| `components/layout/SiteFooter.tsx` | Match header styling |
| `components/gear/GearCard.tsx` | Density-based card/image sizing |
| `components/ui/dialog.tsx` | Add bg-black/60 backdrop-blur-sm to overlay |
| `components/loadouts/LoadoutMetadataDialog.tsx` | Use Dialog, add SeasonSelector |
| `components/loadouts/SeasonSelector.tsx` | NEW: Icon card season selection |
| `lib/firebase/adapter.ts` | Extended name resolution, debug logging |
| `lib/validations/adapter.ts` | Add productName, label to Zod schema |

## Testing Checklist

- [ ] Header shows Deep Forest Green (#405A3D) background with white text
- [ ] Footer matches header styling
- [ ] App background is Pale Mist (#FCFDF7)
- [ ] Navigation shows active page indicator (underline)
- [ ] Gear cards change size noticeably between density modes
- [ ] Modals have dark blurred backdrop overlay
- [ ] Edit Loadout opens as centered Dialog (not Sheet)
- [ ] Season selector shows icon cards
- [ ] Legacy gear items display actual names (not "Untitled Item")
- [ ] Console shows RAW LEGACY DOC debug output for troubleshooting
