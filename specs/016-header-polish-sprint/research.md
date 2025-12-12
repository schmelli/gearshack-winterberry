# Research: Final Header Polish Sprint

**Feature**: 016-header-polish-sprint
**Date**: 2025-12-05

## Problem Analysis

### Issue 1: Logo Invisibility

**Symptom**: Logo is too dark against the deep green header background (`#405A3D`).

**Root Cause**: The logo file (`/public/logos/small_gearshack_logo.png`) is a dark/black transparent PNG. When placed on a dark green background, there is insufficient contrast.

**Solution**: Apply CSS filters to invert the logo to white.

| Filter | Effect |
|--------|--------|
| `brightness-0` | Converts all colors to black (0% brightness) |
| `invert` | Inverts colors - black becomes white |

**Tailwind Classes**: `brightness-0 invert`

**Browser Support**: CSS filters are supported in all modern browsers (Chrome 53+, Firefox 35+, Safari 9.1+, Edge 79+).

### Issue 2: Avatar Fallback Invisibility

**Symptom**: User initials in the header avatar are invisible when no profile photo exists.

**Current Styling** (`AvatarWithFallback.tsx`):
```tsx
className="bg-primary/10 text-primary font-medium"
```

**Analysis**:
- `bg-primary/10` = 10% opacity of primary color (green) = nearly invisible on dark header
- `text-primary` = primary color (green) = no contrast against green header

**Solution**: Use white-based colors for visibility:
```tsx
className="bg-white/20 text-white font-medium"
```

**Trade-offs**:
- **Global change**: Simpler, but may affect avatars used elsewhere
- **Variant prop**: More complex, but scoped to header context

**Decision**: Global change is preferred since avatar is primarily used in header. The dropdown menu (light background) will show the avatar differently due to shadcn DropdownMenuContent's own styling.

### Issue 3: Redundant Loadouts Title

**Symptom**: The H1 "Loadouts" and description paragraph waste vertical space and duplicate navigation context.

**Current Structure** (`app/loadouts/page.tsx:56-69`):
```tsx
<div className="mb-6 flex items-center justify-between">
  <div>
    <h1>Loadouts</h1>
    <p>Plan your trips...</p>
  </div>
  <Button>Create New Loadout</Button>
</div>
```

**Analysis**:
- Navigation bar already shows "Loadouts" link is active
- Browser tab title includes "Loadouts"
- Empty state already has explanatory text
- The H1 and paragraph add no unique value

**Solution**: Remove the title section, keep only the button:
```tsx
<div className="mb-6 flex items-center justify-end">
  <Button>Create New Loadout</Button>
</div>
```

## Files to Modify

| File | Change | Lines Affected |
|------|--------|----------------|
| `components/layout/SiteHeader.tsx` | Add `brightness-0 invert` to Image | 1 line |
| `components/profile/AvatarWithFallback.tsx` | Change fallback colors | 1 line |
| `app/loadouts/page.tsx` | Remove H1 and paragraph | ~10 lines removed |

## Recommendations

1. **Priority**: All three issues are simple CSS/markup changes
2. **Order**: Can be implemented in any order (independent changes)
3. **Testing**: Manual visual verification required
4. **Risk**: Low - all changes are reversible and don't affect functionality
