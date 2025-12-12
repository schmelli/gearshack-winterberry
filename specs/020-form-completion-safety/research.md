# Research: Form Completion & Safety Sprint

**Feature**: 020-form-completion-safety
**Date**: 2025-12-06

## Research Areas

### 1. Description Field Placement

**Question**: Where exactly should the description field be placed?

**Decision**: Between brand and brandUrl (Brand Website) fields

**Rationale**:
- The spec explicitly states "between brand and brand_website fields"
- This keeps product-related information (name, brand, description) grouped together
- brandUrl and productUrl are less frequently used and can go after

**Alternatives Considered**:
- After all general info fields - Rejected: Spec explicitly specifies placement
- In a separate "Details" tab - Rejected: Overcomplicates the form

### 2. Textarea Component Configuration

**Question**: What size and behavior should the description Textarea have?

**Decision**: Use `min-h-[100px] resize-y` for flexible height

**Rationale**:
- 100px minimum provides enough space for a few sentences
- `resize-y` allows users to expand vertically if needed
- Prevents horizontal resize which could break layout
- Edge case: Very long descriptions handled by scrolling

**Alternatives Considered**:
- Fixed height - Rejected: Restricts user flexibility
- Auto-resize on content - Rejected: More complex, less control

### 3. Delete Button Styling

**Question**: How should the delete button be styled for safety?

**Decision**: Ghost variant with destructive icon color, red hover background

**Rationale**:
- `variant="ghost"` keeps button subtle when not in focus
- `text-destructive` (red) icon clearly indicates danger
- `hover:bg-destructive/10` provides visual feedback on hover
- `size="icon"` makes it compact and less prominent than Save
- Positioned left of Save to maintain focus on primary action

**Alternatives Considered**:
- `variant="destructive"` - Rejected: Too prominent, draws attention from Save
- `variant="outline"` - Rejected: Still too prominent for a destructive action
- Text button "Delete" - Rejected: Takes more space, spec calls for icon

### 4. AlertDialog Confirmation Pattern

**Question**: How should the confirmation dialog be structured?

**Decision**: Standard AlertDialog with title, description, Cancel/Delete actions

**Rationale**:
- Title: "Delete Gear Item?" - Clear, question format
- Description: "This cannot be undone." - Concise warning
- Cancel: Neutral styling, left position
- Delete: Destructive styling (red), right position
- Following shadcn/ui AlertDialog best practices

**Alternatives Considered**:
- Custom Dialog - Rejected: AlertDialog is purpose-built for confirmations
- Browser confirm() - Rejected: Poor UX, not styleable

### 5. Delete Logic in Hook

**Question**: Should delete logic be in component or hook?

**Decision**: In useGearEditor hook

**Rationale**:
- Constitution requires business logic in hooks (Feature-Sliced Light)
- Keeps component stateless
- Reusable if other components need delete functionality
- Allows testing of delete logic independently

**Alternatives Considered**:
- In component directly - Rejected: Violates constitution
- Separate useDeleteGear hook - Rejected: Overcomplicates, one-off use

## Existing Code Analysis

### Current GearItem Type (types/gear.ts)

```typescript
// Section 1: General Info
name: string;
brand: string | null;
brandUrl: string | null;
modelNumber: string | null;
productUrl: string | null;
```

Description will be added after `brand` in the interface order.

### Current GearItemFormData (types/gear.ts)

```typescript
// Section 1: General Info
name: string;
brand: string;
brandUrl: string;
modelNumber: string;
productUrl: string;
```

Description will be added after `brand`.

### Store deleteItem (hooks/useStore.ts)

Already implemented with:
- Optimistic update (removes immediately)
- Rollback on failure
- Removes from loadouts that reference the item
- Handles Firestore deletion

No changes needed to store - just need to call it from hook.

## Implementation Notes

1. **Type Changes**: Add `description` field to both GearItem (nullable) and GearItemFormData (string)
2. **Form Schema**: Add optional string field to Zod schema
3. **Conversion Functions**: Update gearItemToFormData and formDataToGearItem
4. **Adapter**: Pass through description in both directions
5. **GeneralInfoSection**: Add Textarea between brand and brandUrl FormFields
6. **GearEditorForm**: Add AlertDialog with delete button in footer
7. **useGearEditor**: Add handleDelete and isDeleting state
