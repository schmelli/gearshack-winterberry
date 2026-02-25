# Quickstart: Smart Gear Dependencies

**Feature Branch**: `037-gear-dependencies`
**Date**: 2025-12-09

## Quick Overview

This feature adds parent/child relationships between gear items. When you add a "Packraft" to a loadout, the system prompts you to also add the "Paddle" and "PFD" that you've linked to it.

---

## Development Setup

```bash
# Already on branch
git checkout 037-gear-dependencies

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

---

## Implementation Order

### Phase 1: Data Layer
1. **types/gear.ts** - Add `dependencyIds: string[]` to GearItem interface
2. **lib/validations/gear-schema.ts** - Add Zod validation
3. **lib/firebase/adapter.ts** - Handle snake_case conversion

### Phase 2: Utility Functions
4. **lib/dependency-utils.ts** - Create new file with:
   - `resolveDependencies()` - DFS traversal
   - `validateDependencyLink()` - Circular check
   - `checkMissingDependencies()` - Loadout check
   - `createItemsMap()` - Helper

### Phase 3: Gear Editor
5. **components/gear-editor/sections/DependenciesSection.tsx** - New tab UI
6. **components/gear-editor/GearEditorForm.tsx** - Add Dependencies tab
7. **hooks/useGearEditor.ts** - Handle dependencyIds in form state

### Phase 4: Loadout Builder
8. **hooks/useDependencyPrompt.ts** - Modal state management
9. **components/loadouts/DependencyPromptDialog.tsx** - Modal UI
10. **hooks/useLoadoutEditor.ts** - Integrate dependency check
11. **components/loadouts/LoadoutPicker.tsx** - Connect to prompt

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Type definitions | `types/gear.ts` |
| Existing gear form | `components/gear-editor/GearEditorForm.tsx` |
| Section pattern example | `components/gear-editor/sections/StatusSection.tsx` |
| Loadout add logic | `hooks/useLoadoutEditor.ts` (line 132) |
| Zustand store | `hooks/useStore.ts` |
| Firestore adapter | `lib/firebase/adapter.ts` |

---

## Testing the Feature

### Manual Test Flow

1. **Create Dependencies**:
   - Edit a gear item (e.g., "Packraft")
   - Go to Dependencies tab
   - Search and add "Paddle" and "PFD"
   - Save

2. **Verify Persistence**:
   - Close and reopen the gear item
   - Dependencies should still be visible

3. **Test Loadout Prompt**:
   - Create a new loadout
   - Add the "Packraft"
   - Modal should appear with "Paddle" and "PFD"
   - Test all three buttons: Add All, Add Selected, Skip

4. **Test Transitive**:
   - Add dependency to "Paddle" (e.g., "Paddle Bag")
   - Add "Packraft" to a new loadout
   - Should see: Paddle, PFD, AND Paddle Bag

5. **Test Edge Cases**:
   - Try to link item to itself → should fail
   - Try to create A→B→A cycle → should fail
   - Delete a dependency item → should handle gracefully

---

## Constitution Compliance Checklist

- [ ] UI components are stateless (logic in hooks)
- [ ] No `useEffect` in components (use hooks)
- [ ] Types defined in `@/types`
- [ ] Only shadcn/ui components used
- [ ] Tailwind CSS only (no custom CSS files)
- [ ] `@/*` absolute imports
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## Common Patterns

### Adding a Form Field (Section Pattern)
```tsx
// components/gear-editor/sections/DependenciesSection.tsx
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import type { GearItemFormData } from '@/types/gear';

export function DependenciesSection() {
  const form = useFormContext<GearItemFormData>();

  return (
    <FormField
      control={form.control}
      name="dependencyIds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Linked Accessories</FormLabel>
          <FormControl>
            {/* Your component here */}
          </FormControl>
        </FormItem>
      )}
    />
  );
}
```

### Adding a Modal Hook
```tsx
// hooks/useDependencyPrompt.ts
'use client';

import { useState, useCallback } from 'react';

export function useDependencyPrompt(options) {
  const [isOpen, setIsOpen] = useState(false);

  const triggerCheck = useCallback((itemId: string) => {
    // Check for dependencies
    // If found, setIsOpen(true) and return true
    // If none, return false
  }, [options.allItems]);

  return { isOpen, triggerCheck, /* ... */ };
}
```

---

## Debugging Tips

1. **Check Firestore**:
   - Firebase Console → Firestore → `userBase/{uid}/gearInventory`
   - Look for `dependency_ids` field

2. **Check Local Storage**:
   - DevTools → Application → Local Storage → `gearshack-store`
   - Look for `dependencyIds` in items

3. **Console Logging**:
   - `useStore` has logging for Firestore operations
   - Add `console.log` in `resolveDependencies()` for traversal debugging

---

## Estimated Implementation Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Data Layer | 3 files | Low |
| Utilities | 1 file | Medium |
| Gear Editor | 3 files | Medium |
| Loadout Builder | 4 files | Medium-High |

Total: ~11 files modified/created
