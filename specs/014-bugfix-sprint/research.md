# Research: Final Polish & Bugfix Sprint

**Feature**: 014-bugfix-sprint
**Date**: 2025-12-05

## Research Summary

This bugfix sprint addresses known issues with clear solutions. No unknowns requiring research.

---

## 1. Login Background Static Image

**Current Behavior**: `BackgroundRotator` rotates images every 8 seconds with transitions.

**Issue**: Auto-rotation is dizzying; white bars appear on some viewport sizes.

**Solution**:
- Decision: Select ONE random image on component mount using `useState` with lazy initializer
- Rationale: Simple, no setInterval needed, random selection on each page load provides variety
- Alternative Rejected: Preselect image server-side - adds complexity without significant benefit

**Implementation**:
```typescript
// Select random index once on mount
const [imageIndex] = useState(() =>
  Math.floor(Math.random() * images.length)
);
```

**Viewport Fix**:
- Decision: Use `fixed inset-0 w-screen h-screen` with `object-cover`
- Rationale: `w-screen h-screen` ensures full viewport coverage regardless of parent containers
- Current Issue: `absolute inset-0` relies on parent positioning which may not fill viewport

---

## 2. Form Validation Feedback

**Current Behavior**: `useGearEditor` uses `mode: 'onBlur'` validation. Save button submits and shows errors silently.

**Issue**: Users don't see validation errors clearly.

**Solution**:
- Decision: On save click, call `form.trigger()` to validate all fields, then show toast if invalid
- Rationale: Allows save button to remain clickable, shows all errors at once, toast draws attention
- Alternative Rejected: Disable save button when invalid - confusing without visible indicators

**Implementation**:
```typescript
const handleSubmit = async (e) => {
  e.preventDefault();
  const isValid = await form.trigger(); // Validate all fields
  if (!isValid) {
    toast.error('Please fix errors before saving');
    return;
  }
  await rhfHandleSubmit(onSubmit)(e);
};
```

---

## 3. Required Field Asterisks

**Current Behavior**: Required fields have no visual indicator.

**Solution**:
- Decision: Add red asterisk (*) after label text for required fields
- Rationale: Standard UX pattern, immediately visible
- Implementation: Update FormLabel in GeneralInfoSection for Name field

---

## 4. Image Upload Flow

**Current Behavior**: MediaSection uploads images on file select (with `enableFirebaseUpload`), but there's no coordination with form submission.

**Issue**: If upload is in progress when Save is clicked, the form may submit before URL is available.

**Solution**:
- Decision: Track pending upload state in component, disable Save button during upload, or await upload on save
- Rationale: Ensures data integrity
- Note: Current implementation in MediaSection already uploads immediately with `enableFirebaseUpload={true}` and sets the field value on completion. The issue may be if user clicks Save before upload completes.

**Implementation Options**:
1. Track `isUploading` state and disable Save button during upload
2. On Save, check if MediaSection has pending upload and await it

---

## 5. Header Icon Colors

**Current Behavior**:
- Bell icon in SiteHeader: `text-white` (already correct)
- SyncIndicator: `text-muted-foreground` for idle, `text-emerald-500` for syncing
- UserMenu: Default button styling

**Issue**: Icons may not be visible on Deep Forest Green background.

**Solution**:
- Decision: Update SyncIndicator to use `text-white` for all states (with different opacity/brightness)
- Update UserMenu avatar trigger to use white border/styling
- Rationale: Consistent white icons on dark header background

---

## 6. Pill-Style Tabs

**Current Behavior**: TabsList uses default shadcn styling.

**Solution**:
- Decision: Add `bg-muted rounded-full p-1` to TabsList, update TabsTrigger for pill appearance
- Rationale: Modern pill-style tabs as specified
- Implementation: Update className in GearEditorForm

---

## 7. Image Search Popover

**Current Behavior**: Search button is disabled with tooltip "Image search coming soon".

**Solution**:
- Decision: Replace disabled button + tooltip with enabled button + Popover
- Rationale: Clickable interaction is more discoverable
- Implementation: Use shadcn/ui Popover component wrapping the button

---

## Dependencies

| Component | Already Installed | Notes |
|-----------|-------------------|-------|
| Popover | Yes | Via shadcn/ui |
| Toast (Sonner) | Yes | Already used in app |
| Tabs | Yes | Already used in GearEditorForm |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Image upload race condition | Validate upload complete before form submit |
| Breaking existing functionality | Test each fix independently |
| Accessibility regression | Maintain WCAG contrast ratios |

---

## Decisions Log

1. **Static Background**: Random selection on mount, no rotation
2. **Validation Toast**: Show on save click when invalid, keep button enabled
3. **Upload Handling**: Disable save or await pending upload
4. **Icon Colors**: White for all header icons
5. **Tab Style**: Pill styling with rounded-full
6. **Image Search**: Popover instead of disabled tooltip
