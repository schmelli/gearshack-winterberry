# Implementation Plan: Form Completion & Safety Sprint

**Branch**: `020-form-completion-safety` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-form-completion-safety/spec.md`

## Summary

Add a product description field (Textarea between brand and brand website) to the Gear Editor form, and implement a safe delete action with AlertDialog confirmation in the form footer. Wire up delete logic in useGearEditor hook using the existing store.deleteItem method.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, react-hook-form 7.x, Zod 4.x, shadcn/ui, Tailwind CSS 4
**Storage**: Firebase Firestore (existing deleteItem handles Firestore + local state)
**Testing**: Manual testing (visual verification + CRUD operations)
**Target Platform**: Web (all modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Form interactions remain responsive
**Constraints**: Backward compatible with existing gear items (description field optional)
**Scale/Scope**: 5 files modified (types, form schema, section component, form component, hook)

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | PASS | Delete logic in useGearEditor hook, UI stateless in components |
| II. TypeScript Strict Mode | PASS | Adding typed `description` field to GearItem and GearItemFormData |
| III. Design System Compliance | PASS | Using shadcn/ui Textarea, AlertDialog, Button components |
| IV. Spec-Driven Development | PASS | Spec completed first with user stories and requirements |
| V. Import and File Organization | PASS | All imports use @/* path alias |

**All gates pass.**

## Project Structure

### Documentation (this feature)

```text
specs/020-form-completion-safety/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Specification checklist
```

### Source Code Changes

```text
types/
└── gear.ts                            # MODIFY: Add description to GearItem and GearItemFormData

lib/validations/
└── gear-schema.ts                     # MODIFY: Add description field to Zod schema

lib/
└── gear-utils.ts                      # MODIFY: Handle description in form conversion functions

components/gear-editor/sections/
└── GeneralInfoSection.tsx             # MODIFY: Add Textarea for description between brand and brandUrl

components/gear-editor/
└── GearEditorForm.tsx                 # MODIFY: Add delete button + AlertDialog in footer

hooks/
└── useGearEditor.ts                   # MODIFY: Add handleDelete function

lib/firebase/
└── adapter.ts                         # MODIFY: Pass through description field
```

**Structure Decision**: Minimal file modifications. Type extension in gear.ts, UI changes in existing section/form components, delete logic in existing hook.

## Key Implementation Details

### Description Field Type Changes

**types/gear.ts**:
- Add `description: string | null` to `GearItem` interface (Section 1: General Info)
- Add `description: string` to `GearItemFormData` interface
- Add `description: ''` to `DEFAULT_GEAR_ITEM_FORM`

### Description Field Validation

**lib/validations/gear-schema.ts**:
```typescript
description: z.string().optional(),
```

### Form Conversion Updates

**lib/gear-utils.ts**:
- `gearItemToFormData`: Add `description: item.description ?? ''`
- `formDataToGearItem`: Add `description: formData.description || null`

### GeneralInfoSection Changes

Insert Textarea between brand and brandUrl:
```tsx
import { Textarea } from '@/components/ui/textarea';

{/* Product Description - between brand and brandUrl */}
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

### Delete Button in GearEditorForm Footer

Add trash icon button with AlertDialog:
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

{/* Delete button - only show when editing */}
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
```

### useGearEditor Hook Changes

Add handleDelete function:
```typescript
const deleteItemFromStore = useStore((state) => state.deleteItem);
const [isDeleting, setIsDeleting] = useState(false);

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

// Return in hook:
return {
  // ...existing
  handleDelete,
  isDeleting,
};
```

### Adapter Changes

**lib/firebase/adapter.ts**:
- Add `description` to adaptGearItem return object
- Add `description` to prepareGearItemForFirestore

## Validation Requirements

- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] Description field visible in General Info section
- [ ] Description persists after save
- [ ] Delete button visible only when editing
- [ ] AlertDialog shows on delete click
- [ ] Cancel closes dialog without deleting
- [ ] Confirm deletes item and redirects to inventory
- [ ] Toast shows after successful delete
