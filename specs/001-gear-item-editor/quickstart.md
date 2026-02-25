# Quickstart: Gear Item Editor

**Feature**: 001-gear-item-editor
**Date**: 2025-12-04

## Prerequisites

- Node.js 18+
- npm or pnpm
- Repository cloned and dependencies installed

```bash
npm install
```

## Development Server

```bash
npm run dev
```

Open [http://localhost:3000/inventory](http://localhost:3000/inventory) to see the gear inventory.

## Feature Routes

| Route | Purpose |
|-------|---------|
| `/inventory` | List all gear items |
| `/inventory/new` | Create new gear item |
| `/inventory/[id]/edit` | Edit existing gear item |

## Key Files

### Types (`@/types/`)

```
types/
├── gear.ts           # GearItem, GearItemFormData, enums
└── taxonomy.ts       # Category, Subcategory, ProductType
```

### Components (`@/components/gear-editor/`)

```
components/gear-editor/
├── GearEditorForm.tsx           # Main form with tabs
├── TaxonomySelect.tsx           # Cascading category selects
└── sections/
    ├── GeneralInfoSection.tsx   # Name, Brand, Model
    ├── ClassificationSection.tsx # Taxonomy selection
    ├── WeightSpecsSection.tsx   # Weight, Dimensions
    ├── PurchaseSection.tsx      # Price, Date, Store
    ├── MediaSection.tsx         # Image URLs
    └── StatusSection.tsx        # Condition, Status, Notes
```

### Hook (`@/hooks/`)

```
hooks/
└── useGearEditor.ts    # All form logic, validation, handlers
```

### Utilities (`@/lib/`)

```
lib/
├── taxonomy/
│   ├── taxonomy-data.json   # Converted from ontology
│   └── taxonomy-utils.ts    # Filter functions
├── validations/
│   └── gear-schema.ts       # Zod schemas
└── gear-utils.ts            # Conversion functions
```

## Usage Examples

### Creating a New Gear Item

```tsx
// app/inventory/new/page.tsx
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import { useGearEditor } from '@/hooks/useGearEditor';

export default function NewGearPage() {
  const editor = useGearEditor();

  const handleSave = (data: GearItem) => {
    // Save to storage (implement your persistence layer)
    console.log('Saving:', data);
  };

  return (
    <GearEditorForm
      form={editor.form}
      onSubmit={handleSave}
      onCancel={() => router.back()}
      taxonomyState={editor.taxonomyState}
    />
  );
}
```

### Editing an Existing Gear Item

```tsx
// app/inventory/[id]/edit/page.tsx
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import { useGearEditor } from '@/hooks/useGearEditor';

export default function EditGearPage({ params }: { params: { id: string } }) {
  // Fetch existing item (implement your data fetching)
  const existingItem = useGearItem(params.id);

  const editor = useGearEditor(existingItem);

  const handleSave = (data: GearItem) => {
    // Update in storage
    console.log('Updating:', params.id, data);
  };

  return (
    <GearEditorForm
      form={editor.form}
      onSubmit={handleSave}
      onCancel={() => router.back()}
      taxonomyState={editor.taxonomyState}
      isEditing
    />
  );
}
```

### Using the Taxonomy Selection

```tsx
// The TaxonomySelect component handles cascading automatically
import { TaxonomySelect } from '@/components/gear-editor/TaxonomySelect';

<TaxonomySelect
  categoryId={form.watch('categoryId')}
  subcategoryId={form.watch('subcategoryId')}
  productTypeId={form.watch('productTypeId')}
  onCategoryChange={(id) => {
    form.setValue('categoryId', id);
    form.setValue('subcategoryId', '');
    form.setValue('productTypeId', '');
  }}
  onSubcategoryChange={(id) => {
    form.setValue('subcategoryId', id);
    form.setValue('productTypeId', '');
  }}
  onProductTypeChange={(id) => form.setValue('productTypeId', id)}
/>
```

## Testing

### Run All Tests

```bash
npm test
```

### Test the Form Validation

```typescript
import { validateGearItemForm } from '@/lib/validations/gear-schema';

// Valid data
const result = validateGearItemForm({
  name: 'My Tent',
  weightValue: '1500',
  weightDisplayUnit: 'g',
  condition: 'new',
  status: 'active',
  // ... other fields
});

console.log(result.success); // true

// Invalid data
const invalid = validateGearItemForm({
  name: '', // Required field empty
  weightValue: '-100', // Negative weight
});

console.log(invalid.errors); // ZodError with field errors
```

## Common Tasks

### Adding a New Form Section

1. Create section component in `components/gear-editor/sections/`
2. Add tab to `GearEditorForm.tsx`
3. Update `GearItemFormData` type if adding new fields
4. Update Zod schema in `contracts/gear-item.schema.ts`
5. Update `useGearEditor` hook if section needs special logic

### Updating the Taxonomy

1. Update the source ontology TTL file
2. Re-run the conversion script (see `research.md`)
3. Replace `lib/taxonomy/taxonomy-data.json`
4. TypeScript will catch any breaking changes

### Adding Validation Rules

1. Update the Zod schema in `contracts/gear-item.schema.ts`
2. Copy updated schema to `lib/validations/gear-schema.ts`
3. Form will automatically pick up new validation

## Troubleshooting

### Form Not Submitting

- Check browser console for validation errors
- Ensure all required fields are filled
- Check that Zod schema matches form field names

### Taxonomy Not Cascading

- Verify `taxonomy-data.json` is properly formatted
- Check that category IDs match between levels
- Ensure `onCategoryChange` clears subcategory and productType

### Unsaved Changes Warning Not Showing

- Ensure `form.formState.isDirty` is being checked
- Verify `beforeunload` event listener is attached
- Check for any errors in `useGearEditor` hook initialization

## Related Documentation

- [Specification](./spec.md) - Feature requirements
- [Data Model](./data-model.md) - TypeScript interfaces
- [Research](./research.md) - Technology decisions
- [Contracts](./contracts/) - Zod schemas
