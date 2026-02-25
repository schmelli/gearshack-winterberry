# Quickstart: Image Management Sprint

**Feature**: 024-image-management | **Estimated Tasks**: 5

## Prerequisites

- [ ] Read `spec.md` - understand the 3 user stories
- [ ] Read `plan.md` - understand implementation strategy
- [ ] Read `research.md` - understand decisions

## Implementation Checklist

### Phase 1: Add Remove Button to ImageUploadInput

**File**: `components/gear-editor/sections/MediaSection.tsx`

#### Step 1: Wrap ImagePreview in Relative Container

Find the current ImagePreview usage (around line 178):
```tsx
<ImagePreview
  src={displayUrl || ''}
  alt={`${label} preview`}
  size={size}
/>
```

Wrap it in a relative container:
```tsx
<div className="relative">
  <ImagePreview
    src={displayUrl || ''}
    alt={`${label} preview`}
    size={size}
  />
  {/* Remove button will go here */}
</div>
```

#### Step 2: Add Remove Button (FR-001, FR-002, FR-003, FR-006, FR-009)

Add the remove button inside the relative container, after ImagePreview:

```tsx
<div className="relative">
  <ImagePreview
    src={displayUrl || ''}
    alt={`${label} preview`}
    size={size}
  />
  {displayUrl && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onChange('');
        onFileSelect?.(null, null);
        handleClearFile();
      }}
      aria-label="Remove image"
    >
      <X className="h-3 w-3" />
    </Button>
  )}
</div>
```

**Key Points**:
- `displayUrl &&` - Only show button when there's an image
- `e.stopPropagation()` - Prevents triggering file input (FR-006)
- `onChange('')` - Clears the form field (FR-004)
- `onFileSelect?.(null, null)` - Clears local preview (FR-005)
- `handleClearFile()` - Resets file input element
- `aria-label` - Accessibility (FR-009)

#### Step 3: Verify X Icon Import

Ensure `X` is imported from lucide-react (should already be on line 26):
```tsx
import { Plus, Trash2, Upload, Link as LinkIcon, X, Loader2, Search } from 'lucide-react';
```

### Phase 2: Verification

- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run build` - must succeed
- [ ] Manual test: Navigate to /inventory/[id]/edit with existing image
  - [ ] Remove button is visible in top-right corner
  - [ ] Clicking remove clears the image
  - [ ] Upload/URL input interface appears
  - [ ] Can upload a new image
  - [ ] Save works correctly
- [ ] Manual test: Verify removal persists
  - [ ] Save after removing image
  - [ ] Reload page
  - [ ] Image should still be removed

## Success Criteria Checklist

From spec.md:

- [ ] SC-001: Remove action completes in under 2 seconds (immediate)
- [ ] SC-002: Image preview clears immediately on remove
- [ ] SC-003: Saved removals persist correctly on reload
- [ ] SC-004: Remove button positioned in top-right corner
- [ ] SC-005: Lint and build pass

## Key Code Pattern

### Complete Remove Button Implementation

```tsx
// Inside ImageUploadInput component, replace the ImagePreview line with:

<div className="relative">
  <ImagePreview
    src={displayUrl || ''}
    alt={`${label} preview`}
    size={size}
  />
  {displayUrl && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onChange('');
        onFileSelect?.(null, null);
        handleClearFile();
      }}
      aria-label="Remove image"
    >
      <X className="h-3 w-3" />
    </Button>
  )}
</div>
```

## Files Summary

| File | Action | Key Changes |
|------|--------|-------------|
| `components/gear-editor/sections/MediaSection.tsx` | MODIFY | Add remove button to ImagePreview wrapper |

## Common Pitfalls

1. **Forgetting stopPropagation** - Without it, clicking remove may trigger file dialog
2. **Not clearing both states** - Must clear both `onChange('')` and `onFileSelect?.(null, null)`
3. **Missing handleClearFile()** - File input element needs to be reset too
4. **Z-index issues** - The `relative` container and `absolute` button positioning should work out of the box
5. **Wrong icon** - Use `X` not `Trash2` for the remove button (consistent with existing clear file button in upload mode)
