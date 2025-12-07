# Quickstart: Dark Mode & Logo Rescue Sprint

**Feature**: 021-dark-mode-logo
**Estimated Changes**: 3 files modified, 1 file verified

## Prerequisites

- Node.js environment with npm
- Project dependencies installed (`npm install`)

## Quick Implementation Steps

### Step 1: Fix Logo (FR-001)

**File**: `components/layout/SiteHeader.tsx`

Find line 66:
```tsx
className="h-20 w-20 brightness-0 invert"
```

Change to:
```tsx
className="h-20 w-20"
```

### Step 2: Add Gradient Cards (FR-002, FR-003, FR-004)

**File**: `components/inventory-gallery/GearCard.tsx`

**A. Compact view image container (around line 81)**:

Find:
```tsx
<div className="h-24 w-24 flex-shrink-0 bg-white relative flex items-center justify-center">
```

Change to:
```tsx
<div className="h-24 w-24 flex-shrink-0 bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 relative flex items-center justify-center">
```

**B. Standard/Detailed view image container (around line 157)**:

Find:
```tsx
className={cn(
  'relative bg-white flex items-center justify-center',
```

Change to:
```tsx
className={cn(
  'relative bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 flex items-center justify-center',
```

**C. Card borders - Compact (around line 72)**:

Find:
```tsx
'border-stone-200 shadow-sm',
```

Change to:
```tsx
'border-stone-200 dark:border-stone-700 shadow-sm',
```

**D. Card borders - Standard/Detailed (around line 149)**:

Find:
```tsx
'border-stone-200 shadow-sm',
```

Change to:
```tsx
'border-stone-200 dark:border-stone-700 shadow-sm',
```

### Step 3: Update Dark Background (FR-005, FR-006)

**File**: `app/globals.css`

Find in `.dark` section (around line 109):
```css
--background: oklch(0.18 0.02 155);
```

Change to:
```css
/* Deep forest/stone background matching brand (#0C120C approximate) */
--background: oklch(0.10 0.02 155);
```

### Step 4: Verify Upload Fix (SC-005)

**File**: `hooks/useGearEditor.ts`

Review the `onSubmit` function to confirm this pattern:
1. `await addItem(itemData)` or `await updateItemInStore(...)`
2. `onSaveSuccess?.(savedItem)`
3. `router.push(redirectPath)`

## Validation

```bash
# Run lint
npm run lint

# Run build
npm run build

# Start dev server and manually test
npm run dev
```

## Manual Testing Checklist

- [ ] Logo displays with original colors (no white/inverted)
- [ ] Dark mode: Gear cards show gradient background
- [ ] Dark mode: Card borders are subtle stone-700
- [ ] Light mode: Gear cards remain white background
- [ ] Dark mode: Page background is deep forest color
- [ ] Dark mode: Background matches footer cohesion
