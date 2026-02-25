# Quickstart: Form Completion & Safety Sprint

**Feature**: 020-form-completion-safety
**Date**: 2025-12-06

## Overview

This sprint adds two features to the Gear Editor:
1. **Product Description field** - Textarea between brand and brand website
2. **Delete with confirmation** - Trash icon button with AlertDialog safety dialog

## Files to Modify

| File | Changes |
|------|---------|
| `types/gear.ts` | Add `description` to GearItem and GearItemFormData |
| `lib/validations/gear-schema.ts` | Add `description` to Zod schema |
| `lib/gear-utils.ts` | Handle `description` in conversion functions |
| `lib/firebase/adapter.ts` | Pass through `description` field |
| `components/gear-editor/sections/GeneralInfoSection.tsx` | Add Textarea field |
| `components/gear-editor/GearEditorForm.tsx` | Add delete button + AlertDialog |
| `hooks/useGearEditor.ts` | Add `handleDelete` and `isDeleting` |

## Implementation Order

### Phase 1: Type System (T001-T002)

**types/gear.ts**:
```typescript
// In GearItem interface, after brand:
description: string | null;

// In GearItemFormData, after brand:
description: string;

// In DEFAULT_GEAR_ITEM_FORM, after brand:
description: '',
```

### Phase 2: Validation Schema (T003)

**lib/validations/gear-schema.ts**:
```typescript
// After brand field:
description: z.string().optional(),
```

### Phase 3: Conversion Functions (T004)

**lib/gear-utils.ts**:
```typescript
// In gearItemToFormData, add:
description: item.description ?? '',

// In formDataToGearItem, add:
description: formData.description || null,
```

### Phase 4: Adapter (T005)

**lib/firebase/adapter.ts**:
```typescript
// In adaptGearItem return, add:
description: validated.description ?? null,

// In prepareGearItemForFirestore, add:
description: item.description,
```

### Phase 5: GeneralInfoSection (T006)

**components/gear-editor/sections/GeneralInfoSection.tsx**:
```tsx
import { Textarea } from '@/components/ui/textarea';

// Insert between brand and brandUrl FormField:
{/* Product Description */}
<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Product Description</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Enter product details, specifications, or notes..."
          className="min-h-[100px] resize-y"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Phase 6: useGearEditor Hook (T007)

**hooks/useGearEditor.ts**:
```typescript
import { useState } from 'react';

// Add state and store action:
const deleteItemFromStore = useStore((state) => state.deleteItem);
const [isDeleting, setIsDeleting] = useState(false);

// Add delete handler:
const handleDelete = useCallback(async () => {
  if (!initialItem) return;

  setIsDeleting(true);
  try {
    await deleteItemFromStore(initialItem.id);
    toast.success('Item deleted.');
    router.push('/inventory');
  } catch (error) {
    toast.error('Failed to delete item');
    console.error('Delete failed:', error);
  } finally {
    setIsDeleting(false);
  }
}, [initialItem, deleteItemFromStore, router]);

// Update return:
return {
  form,
  isEditing,
  isDirty,
  isSubmitting,
  handleSubmit,
  handleCancel,
  resetForm,
  handleDelete,   // NEW
  isDeleting,     // NEW
};
```

### Phase 7: GearEditorForm Delete UI (T008)

**components/gear-editor/GearEditorForm.tsx**:
```tsx
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Update hook destructuring:
const { form, isEditing, isDirty, isSubmitting, handleSubmit, handleCancel, handleDelete, isDeleting } =
  useGearEditor({ ... });

// In CardFooter, add delete button:
<CardFooter className="flex justify-between border-t pt-6">
  <div className="flex items-center gap-2">
    <Button
      type="button"
      variant="outline"
      onClick={handleCancel}
      disabled={isSubmitting}
    >
      Cancel
    </Button>

    {/* Delete button - only when editing */}
    {isEditing && (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            disabled={isSubmitting || isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete item</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gear Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
  </div>

  <div className="flex gap-2 items-center">
    {isDirty && (
      <span className="text-sm text-muted-foreground">
        Unsaved changes
      </span>
    )}
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting
        ? 'Saving...'
        : isEditing
          ? 'Save Changes'
          : 'Add Item'}
    </Button>
  </div>
</CardFooter>
```

### Phase 8: Validation (T009-T010)

```bash
npm run lint
npm run build
```

## Testing Checklist

- [ ] Description field appears in General Info tab
- [ ] Description field is between brand and brand website
- [ ] Description accepts multi-line text
- [ ] Description persists after save
- [ ] Delete button only shows when editing (not on new item)
- [ ] Delete button shows trash icon
- [ ] Clicking delete opens AlertDialog
- [ ] AlertDialog shows "Delete Gear Item?" title
- [ ] AlertDialog shows "This cannot be undone." message
- [ ] Cancel closes dialog, item unchanged
- [ ] Delete removes item and redirects to inventory
- [ ] Toast shows "Item deleted." after deletion

## Rollback

If issues arise:
1. Remove `description` from types and schema
2. Remove Textarea from GeneralInfoSection
3. Remove AlertDialog from GearEditorForm
4. Remove handleDelete from useGearEditor
