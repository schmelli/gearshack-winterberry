# Implementation Plan: Image Management Sprint

**Branch**: `024-image-management` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-image-management/spec.md`

## Summary

Add a remove button to the primary image preview in the Gear Editor's MediaSection, allowing users to clear the current image and replace it with a new one. The existing save logic already correctly handles empty string → null conversion for the image URL field.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, react-hook-form 7.x, shadcn/ui, Tailwind CSS 4, lucide-react
**Storage**: Firebase Firestore (`userBase/{uid}/gearInventory`) - existing save logic handles null values
**Testing**: Visual verification + `npm run lint` + `npm run build`
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js)
**Performance Goals**: Remove action completes in under 100ms (immediate UI feedback)
**Constraints**: Must not affect existing Firebase Storage files (orphan cleanup out of scope)
**Scale/Scope**: 1 file modified (MediaSection.tsx), ~30 lines added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | ✅ PASS | UI change only - remove button triggers form.setValue which is standard react-hook-form pattern. No business logic added to component. |
| II. TypeScript Strict Mode | ✅ PASS | No new types needed - using existing props and callbacks |
| III. Design System Compliance | ✅ PASS | Using shadcn/ui Button component with existing icon sizes and variants |
| IV. Spec-Driven Development | ✅ PASS | Spec created before implementation |
| V. Import and File Organization | ✅ PASS | Using existing `@/` imports, modifying existing file |

## Project Structure

### Documentation (this feature)

```text
specs/024-image-management/
├── plan.md              # This file
├── research.md          # Phase 0 output - decisions
├── quickstart.md        # Phase 1 output - implementation steps
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
components/
└── gear-editor/
    └── sections/
        └── MediaSection.tsx    # MODIFY: Add remove button to ImageUploadInput

hooks/
└── useGearEditor.ts            # EXISTING: Already handles empty string → null for primaryImageUrl

lib/
└── gear-utils.ts               # EXISTING: formDataToGearItem converts '' to null (line 152)
```

**Structure Decision**: Minimal change - single file modification to add remove button UI. No new files required. The existing form and save infrastructure already correctly handles clearing the image URL.

## Root Cause Analysis

### Current Implementation (MediaSection.tsx)

The `ImageUploadInput` component shows an image preview when `displayUrl` exists (line 100-101):
```tsx
const displayUrl = localPreview || value;
```

When an image is displayed, there's no remove button. The only way to "clear" is:
1. Switch to URL mode and clear the text input manually
2. Switch to upload mode and the old image disappears but no new state is set

**Missing Functionality**: A dedicated remove button that:
1. Clears the form field value via `onChange('')`
2. Clears any local preview via `onFileSelect(null, null)`

### Existing Save Logic (Already Correct)

In `lib/gear-utils.ts` line 152:
```tsx
primaryImageUrl: formData.primaryImageUrl || null,
```

Empty string is converted to `null` before saving to Firestore. **No changes needed to save logic.**

## Implementation Strategy

### Approach: Add Remove Button to ImageUploadInput

The remove button should appear when `displayUrl` exists:

1. **Location**: Top-right corner of the `ImagePreview` component wrapper
2. **Styling**: shadcn/ui Button with `size="icon"`, `variant="ghost"`, destructive hover
3. **Action**: Call `onChange('')` and `onFileSelect?.(null, null)`
4. **Event Handling**: `e.stopPropagation()` to prevent triggering file dialog

### Implementation Details

Add a `onRemove` callback prop to `ImageUploadInput`:
```tsx
interface ImageUploadInputProps {
  // ... existing props
  onRemove?: () => void;  // Optional callback when remove is clicked
}
```

Add remove button in the image preview area:
```tsx
{displayUrl && (
  <div className="relative">
    <ImagePreview src={displayUrl} ... />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onChange('');
        onFileSelect?.(null, null);
        onRemove?.();
      }}
    >
      <X className="h-3 w-3" />
      <span className="sr-only">Remove image</span>
    </Button>
  </div>
)}
```

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Button position | Absolute top-right inside preview wrapper | Standard pattern for removable images, visible but not blocking |
| Button styling | Ghost variant with destructive hover | Non-intrusive until hovered, then clearly indicates delete action |
| Event propagation | stopPropagation() on click | Prevents accidental file dialog triggers |
| Form field clearing | onChange('') | Standard react-hook-form pattern, handled by existing save logic |

## Complexity Tracking

> **No violations** - All changes comply with constitution principles.

| Aspect | Assessment |
|--------|------------|
| New files | 0 |
| Modified files | 1 (MediaSection.tsx) |
| New dependencies | 0 |
| Breaking changes | 0 |
| Lines added | ~30 |
