# Implementation Plan: Dark Mode & Logo Rescue Sprint

**Branch**: `021-dark-mode-logo` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-dark-mode-logo/spec.md`

## Summary

Fix logo visibility by removing CSS filters from SiteHeader.tsx, enhance dark mode gear cards with gradient backgrounds (stone-800 to stone-950), update global dark mode background to a deep forest/stone color (#0C120C or similar), and verify upload fix implementation in useGearEditor.ts.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+, React 19+, Tailwind CSS 4, shadcn/ui, next-themes
**Storage**: N/A (styling changes only)
**Testing**: npm run lint, npm run build, visual verification
**Target Platform**: Web (desktop and mobile browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: No performance impact (CSS-only changes)
**Constraints**: Must pass lint and build validation
**Scale/Scope**: 3 files modified, 1 file verified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | CSS-only changes, no logic changes |
| II. TypeScript Strict Mode | PASS | No TypeScript changes needed |
| III. Design System Compliance | PASS | Using Tailwind classes, no new CSS files |
| IV. Spec-Driven Development | PASS | Spec created before implementation |
| V. Import and File Organization | PASS | No new files created |

**Code Quality Gates**:
- `npm run lint` MUST pass
- `npm run build` MUST complete successfully
- All TypeScript errors MUST be resolved

## Project Structure

### Documentation (this feature)

```text
specs/021-dark-mode-logo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality validation
```

### Source Code (repository root)

```text
# Files to modify:
components/layout/SiteHeader.tsx          # Remove CSS filters from logo
components/inventory-gallery/GearCard.tsx # Add dark mode gradient
app/globals.css                           # Update dark mode background

# Files to verify:
hooks/useGearEditor.ts                    # Verify upload fix pattern
```

**Structure Decision**: This feature modifies existing files only. No new files needed.

## Implementation Approach

### Phase 1: Logo Fix (FR-001)

**File**: `components/layout/SiteHeader.tsx`
**Line 66**: Remove `brightness-0 invert` from Image className
**Current**: `className="h-20 w-20 brightness-0 invert"`
**Target**: `className="h-20 w-20"`

### Phase 2: Gradient Cards (FR-002, FR-003, FR-004)

**File**: `components/inventory-gallery/GearCard.tsx`
**Changes**:
1. Compact view (line 81): Add dark mode gradient to image container
2. Standard/Detailed view (line 157-160): Add dark mode gradient to image container
3. Card borders: Add `dark:border-stone-700`

**Current image container classes**: `bg-white`
**Target**: `bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950`

### Phase 3: Global Dark Background (FR-005, FR-006)

**File**: `app/globals.css`
**Line 109**: Update `--background` CSS variable
**Current**: `--background: oklch(0.18 0.02 155);`
**Target**: Convert #0C120C to oklch and use as background

#0C120C hex → oklch(0.10 0.015 155) approximately (deep forest/stone)

### Phase 4: Upload Fix Verification (SC-005)

**File**: `hooks/useGearEditor.ts`
**Action**: Verify the onSubmit function follows: await upload → update store → redirect
**Expected pattern**:
```typescript
await addItem(itemData);  // or updateItemInStore
onSaveSuccess?.(savedItem);
router.push(redirectPath);
```

## Complexity Tracking

No violations to track - all changes are straightforward CSS modifications that comply with constitution principles.
