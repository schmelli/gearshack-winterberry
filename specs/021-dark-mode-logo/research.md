# Research: Dark Mode & Logo Rescue Sprint

**Feature**: 021-dark-mode-logo
**Date**: 2025-12-06

## Research Summary

This feature involves straightforward CSS changes with no complex technical decisions. All unknowns have been resolved through codebase analysis.

---

## R1: Logo CSS Filter Issue

**Question**: What CSS filters are currently applied to the logo and should be removed?

**Decision**: Remove `brightness-0 invert` classes from the logo Image component

**Rationale**:
- Current classes (`brightness-0 invert`) convert any colored image to pure white
- This was a workaround for the Deep Forest Green header (#405A3D) but breaks the logo's actual appearance
- The logo should display with its original PNG colors

**Alternatives Considered**:
- Keep filter but adjust values → Rejected: Still distorts original colors
- Create white version of logo → Out of scope per spec

**Location**: `components/layout/SiteHeader.tsx`, line 66

---

## R2: Dark Mode Card Gradient Implementation

**Question**: How to implement vertical gradient for gear cards in dark mode?

**Decision**: Use Tailwind gradient utility classes with stone color palette

**Rationale**:
- Tailwind provides built-in gradient support via `bg-gradient-to-b`
- Stone colors (`stone-800`, `stone-950`, `stone-700`) are in Tailwind's default palette
- Direction `to-b` (top to bottom) creates visual depth effect

**Implementation**:
```css
/* Light mode: solid white */
bg-white

/* Dark mode: gradient from stone-800 to stone-950 */
dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950

/* Dark mode border */
dark:border-stone-700
```

**Alternatives Considered**:
- Custom CSS gradient → Rejected: Tailwind classes preferred per constitution
- Radial gradient → Rejected: User specified vertical gradient

---

## R3: Deep Forest/Stone Background Color

**Question**: What is the exact oklch value for #0C120C (deep forest/stone)?

**Decision**: Use `oklch(0.10 0.02 155)` for dark mode background

**Rationale**:
- #0C120C (RGB: 12, 18, 12) is a very dark green-tinted black
- Converting to oklch:
  - L (lightness): ~0.10 (very dark)
  - C (chroma): ~0.02 (subtle green tint)
  - H (hue): 155 (green hue matching the nature theme)
- This creates cohesion with the footer's Deep Forest Green (#405A3D)
- Current dark background is `oklch(0.18 0.02 155)` - new value is darker

**Alternatives Considered**:
- Pure black `oklch(0 0 0)` → Rejected: User wants forest/stone color
- Zinc-based colors → Rejected: Stone palette matches brand better

---

## R4: Upload Fix Verification Pattern

**Question**: What is the expected "await upload → update store → redirect" pattern?

**Decision**: Verify existing implementation in useGearEditor.ts follows async pattern

**Expected Pattern**:
```typescript
// In onSubmit handler:
const itemData = formDataToGearItem(data);

if (isEditing && initialItem) {
  await updateItemInStore(initialItem.id, itemData);  // 1. await upload
  onSaveSuccess?.(savedItem);                         // 2. update/notify
} else {
  const newId = await addItem(itemData);              // 1. await upload
  onSaveSuccess?.(savedItem);                         // 2. update/notify
}

router.push(redirectPath);                            // 3. redirect
```

**Verification Approach**: Code review of `hooks/useGearEditor.ts` to confirm pattern exists

---

## No NEEDS CLARIFICATION Items

All technical questions have been resolved through codebase analysis. No user input required.
