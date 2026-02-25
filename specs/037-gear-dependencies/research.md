# Research: Smart Gear Dependencies (Parent/Child Items)

**Feature Branch**: `037-gear-dependencies`
**Date**: 2025-12-09

## Executive Summary

This research documents the technical decisions for implementing gear dependencies. The existing codebase provides clear patterns for extending GearItem, modifying the Gear Editor, and intercepting item additions in the Loadout Builder.

---

## Decision 1: Dependency Storage Location

**Question**: Where should dependency relationships be stored?

**Decision**: Store as array field `dependencyIds: string[]` on the GearItem entity

**Rationale**:
- Aligns with existing patterns (GearItem has `galleryImageUrls: string[]`, Loadout has `itemIds: string[]`)
- Simple to query - dependencies are always fetched with the parent item
- No need for a separate collection or join operations
- Persists automatically via existing Firestore sync in `useStore`

**Alternatives Considered**:
- Separate `dependencies` collection: Rejected - adds complexity, requires additional queries
- Junction table pattern: Rejected - overkill for 1-to-many relationship without metadata
- Storing on Loadout entity: Rejected - dependencies are gear-level, not loadout-level

---

## Decision 2: Transitive Dependency Resolution Algorithm

**Question**: How to efficiently resolve transitive dependencies without infinite loops?

**Decision**: Depth-first traversal with visited set tracking

**Rationale**:
- Simple to implement and understand
- Handles circular references naturally via visited set
- Memory efficient - only tracks IDs, not full objects
- Can be implemented as pure utility function for testability

**Implementation Pattern**:
```typescript
function resolveTransitiveDependencies(
  itemId: string,
  itemsMap: Map<string, GearItem>,
  visited = new Set<string>()
): string[] {
  if (visited.has(itemId)) return [];
  visited.add(itemId);

  const item = itemsMap.get(itemId);
  if (!item?.dependencyIds?.length) return [];

  const allDeps: string[] = [];
  for (const depId of item.dependencyIds) {
    if (!visited.has(depId)) {
      allDeps.push(depId);
      allDeps.push(...resolveTransitiveDependencies(depId, itemsMap, visited));
    }
  }
  return allDeps;
}
```

**Alternatives Considered**:
- Breadth-first search: Equivalent correctness, slightly more complex for tree structures
- Iterative with stack: Equivalent to recursive DFS, marginally more memory efficient

---

## Decision 3: Gear Editor UI Pattern for Dependencies

**Question**: How to integrate dependency management into the existing Gear Editor?

**Decision**: New "Dependencies" tab with combobox selector

**Rationale**:
- Consistent with existing tab structure (6 tabs: General, Classification, Weight, Purchase, Media, Status)
- Combobox provides search/filter capability for large inventories
- Matches shadcn/ui patterns already used (see TaxonomySelect)
- Non-blocking - users can skip dependencies tab entirely

**UI Components Required**:
- New `DependenciesSection.tsx` component (follows existing section pattern)
- Combobox from shadcn/ui for item search/selection
- Badge/chip display for selected dependencies
- Remove button per dependency

**Alternatives Considered**:
- Inline in General tab: Rejected - tab already has 6 fields
- Modal picker: Rejected - inconsistent with other editor sections
- Drag-and-drop: Rejected - over-engineered for simple link management

---

## Decision 4: Modal Dialog Implementation

**Question**: How to implement the dependency detection modal in Loadout Builder?

**Decision**: Use shadcn/ui Dialog with checkbox list

**Rationale**:
- Dialog component already used throughout app (AlertDialog for delete confirmations)
- Checkbox list allows selective addition per FR-008
- Three action buttons: "Add All", "Add Selected", "Skip"
- Modal ensures user acknowledgment before proceeding

**Integration Point**:
- Hook into `addItem` function in `useLoadoutEditor.ts` (line 132-144)
- Before calling `addItemToLoadout`, check for dependencies
- If dependencies exist and not all in loadout, show modal
- After modal resolution, proceed with adding items

**Alternatives Considered**:
- Sheet (slide-out panel): Rejected - less prominent, user might miss it
- Toast with action: Rejected - not suitable for multiple selections
- Inline expansion: Rejected - disrupts picker flow

---

## Decision 5: Firestore Schema Update

**Question**: How to handle Firestore storage for new dependency field?

**Decision**: Add `dependency_ids` field (snake_case) to existing gear document

**Rationale**:
- Follows existing snake_case convention for Firestore fields
- Adapter pattern already handles camelCase ↔ snake_case conversion
- Backward compatible - old documents without field treated as empty array
- No migration needed - field is optional

**Schema Change**:
```
userBase/{userId}/gearInventory/{gearId}
{
  ...existing fields...,
  dependency_ids: ["gearId1", "gearId2"]  // NEW: array of gear item IDs
}
```

**Alternatives Considered**:
- Subcollection: Rejected - overkill for simple array of IDs
- Separate document: Rejected - requires additional queries

---

## Decision 6: Circular Dependency Prevention

**Question**: How to prevent circular references when creating dependencies?

**Decision**: Validate at link creation time using transitive resolution

**Rationale**:
- Catch errors early, before they're persisted
- Use same `resolveTransitiveDependencies` function
- If adding item B as dependency of A, check if A appears in B's transitive deps
- Show user-friendly error message if circular detected

**Implementation**:
```typescript
function wouldCreateCircle(
  parentId: string,
  candidateDepId: string,
  itemsMap: Map<string, GearItem>
): boolean {
  const candidateDeps = resolveTransitiveDependencies(candidateDepId, itemsMap);
  return candidateDeps.includes(parentId);
}
```

**Alternatives Considered**:
- Allow circles but break at runtime: Rejected - confusing user experience
- Database constraint: Rejected - Firestore doesn't support such constraints

---

## Decision 7: Broken Link Handling

**Question**: How to handle dependencies when linked items are deleted?

**Decision**: Clean up on read, notify user via toast

**Rationale**:
- Lazy cleanup is simpler than maintaining referential integrity
- When loading a gear item, filter out non-existent dependency IDs
- Toast notification: "Some linked accessories no longer exist"
- Optionally auto-save cleaned array

**Implementation Location**:
- In `useGearEditor` hook when loading item for edit
- In dependency resolution functions when building loadout

**Alternatives Considered**:
- Eager cleanup on delete: Rejected - requires scanning all items when one is deleted
- Keep broken links: Rejected - clutters UI with invalid references

---

## Decision 8: State Management for Dependencies Modal

**Question**: How to manage modal state in Loadout Builder?

**Decision**: Local React state in new `useDependencyPrompt` hook

**Rationale**:
- Modal state is ephemeral, doesn't need Zustand persistence
- Custom hook keeps LoadoutPicker component stateless (Constitution Principle I)
- Hook exposes: `pendingItems`, `showModal`, `onAddAll`, `onAddSelected`, `onSkip`

**Hook Interface**:
```typescript
interface UseDependencyPromptReturn {
  pendingDependencies: GearItem[];
  showPrompt: boolean;
  triggerCheck: (itemId: string) => void;
  onAddAll: () => void;
  onAddSelected: (selectedIds: string[]) => void;
  onSkip: () => void;
}
```

**Alternatives Considered**:
- Global Zustand state: Rejected - modal is transient, not persisted
- Context provider: Rejected - adds unnecessary complexity for single-use modal

---

## Existing Code Patterns to Follow

### Type Definition Pattern (from `types/gear.ts`)
```typescript
export interface GearItem {
  // ... existing fields ...
  dependencyIds: string[];  // NEW field
}
```

### Form Data Pattern (from `types/gear.ts`)
```typescript
export interface GearItemFormData {
  // ... existing fields ...
  dependencyIds: string[];  // NEW field
}
```

### Section Component Pattern (from `components/gear-editor/sections/`)
- Stateless component receiving `form` via FormContext
- Uses `FormField`, `FormItem`, `FormLabel`, `FormControl` from shadcn/ui
- Located in `components/gear-editor/sections/DependenciesSection.tsx`

### Hook Pattern (from `hooks/useLoadoutEditor.ts`)
- Business logic isolated from UI
- Memoized computed values
- Callback handlers with `useCallback`
- Clear return type interface

---

## Files to Create

| File | Purpose |
|------|---------|
| `components/gear-editor/sections/DependenciesSection.tsx` | Dependencies tab UI |
| `components/loadouts/DependencyPromptDialog.tsx` | Modal for missing deps |
| `hooks/useDependencyPrompt.ts` | Modal state management |
| `lib/dependency-utils.ts` | Transitive resolution, validation |

## Files to Modify

| File | Changes |
|------|---------|
| `types/gear.ts` | Add `dependencyIds` to GearItem and GearItemFormData |
| `lib/validations/gear-schema.ts` | Add Zod validation for dependencyIds |
| `lib/firebase/adapter.ts` | Handle `dependency_ids` ↔ `dependencyIds` conversion |
| `components/gear-editor/GearEditorForm.tsx` | Add Dependencies tab |
| `hooks/useGearEditor.ts` | Handle dependency field in form state |
| `hooks/useLoadoutEditor.ts` | Integrate dependency detection |
| `components/loadouts/LoadoutPicker.tsx` | Connect to dependency prompt |

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Storage | `dependencyIds: string[]` on GearItem |
| Algorithm | DFS with visited set |
| Editor UI | New "Dependencies" tab |
| Modal | shadcn/ui Dialog with checkboxes |
| Firestore | `dependency_ids` field, snake_case |
| Circular Prevention | Validate at link creation |
| Broken Links | Clean on read, toast notify |
| Modal State | Local hook, not Zustand |
