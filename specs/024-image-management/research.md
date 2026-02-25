# Research: Image Management Sprint

**Feature**: 024-image-management | **Date**: 2025-12-07

## Problem Statement

Users cannot remove or replace the primary image once set in the Gear Editor. The MediaSection component lacks a remove button on the image preview.

## Decision Records

### DR-001: Remove Button Location

**Decision**: Position the remove button in the top-right corner of the ImagePreview component, inside a relative wrapper.

**Alternatives Considered**:
1. ❌ Below the image (separate row) - Takes more vertical space, less intuitive
2. ❌ Replace mode toggle buttons - Confusing, requires mode awareness
3. ✅ Top-right corner overlay - Standard pattern, immediately discoverable

**Rationale**: Top-right corner is the most common pattern for removable items (email attachments, image galleries, chips). Users instinctively look there.

### DR-002: Button Styling Approach

**Decision**: Use `variant="ghost"` with `hover:bg-destructive hover:text-destructive-foreground`

**Alternatives Considered**:
1. ❌ Always red/destructive - Too aggressive, distracts from image
2. ❌ Outline variant - Blends poorly with image backgrounds
3. ✅ Ghost with destructive hover - Subtle until interaction, then clear intent

**Implementation**:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
>
```

**Rationale**: The semi-transparent background (`bg-background/80`) ensures visibility on any image while staying unobtrusive. Destructive red on hover clearly communicates delete action.

### DR-003: Event Propagation Handling

**Decision**: Use `e.stopPropagation()` on the remove button click handler.

**Problem**: The image preview may be inside clickable areas (dropzone, future lightbox trigger). Clicking remove should not trigger parent click handlers.

**Implementation**:
```tsx
onClick={(e) => {
  e.stopPropagation();
  onChange('');
  onFileSelect?.(null, null);
}}
```

**Rationale**: Prevents the click from bubbling up to any parent handlers that might open file dialogs or modals.

### DR-004: State Clearing Strategy

**Decision**: Clear both the form field value (`onChange('')`) and local preview state (`onFileSelect?.(null, null)`).

**Analysis**:
- `value` = Firebase Storage URL or pasted URL (persisted to form)
- `localPreview` = Object URL from local file selection (not persisted until upload completes)

**Both must be cleared** because:
1. User might have uploaded an image (value set after Firebase upload)
2. User might have a pending upload (localPreview set, value empty)
3. User might have pasted a URL (value set, no localPreview)

**Rationale**: Clearing both handles all possible states consistently.

### DR-005: Save Logic Verification

**Decision**: No changes needed to save logic.

**Analysis of existing code** (`lib/gear-utils.ts` line 152):
```tsx
primaryImageUrl: formData.primaryImageUrl || null,
```

**Verification**:
- Empty string `''` → falsy → converts to `null`
- Existing URL → truthy → preserved
- `null` → falsy → remains `null`

**Rationale**: The existing conversion logic correctly handles all cases. Empty string from cleared form field becomes `null` in Firestore.

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| `components/gear-editor/sections/MediaSection.tsx` | MODIFY | Add remove button to ImageUploadInput component |

## No Changes Needed

| File | Reason |
|------|--------|
| `hooks/useGearEditor.ts` | Already handles form submission correctly |
| `lib/gear-utils.ts` | Already converts empty string to null |
| `lib/firebase/adapter.ts` | Already handles null values in Firestore updates |
