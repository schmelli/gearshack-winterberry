# ADR-003: Feature-Sliced Light Architecture

**Status**: ✅ Accepted & Active
**Date**: 2025-11-15
**Decision Makers**: Development Team

## Context

As Gearshack grew from a prototype to a production application, the codebase became increasingly difficult to maintain:

### Problems

1. **Mixed Concerns**: UI components contained business logic, API calls, state management
2. **Tight Coupling**: Components tightly coupled to data fetching and state
3. **Poor Testability**: Couldn't test logic without rendering components
4. **Difficult Reuse**: Logic embedded in components couldn't be reused
5. **Large Components**: 500+ line components with everything mixed together

**Example** (before):
```tsx
function GearCard({ itemId }: Props) {
  const [item, setItem] = useState<GearItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('gear_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (error) throw error;
        setItem(data);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [itemId]);

  const handleUpdate = async (updates: Partial<GearItem>) => {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from('gear_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      setItem({ ...item!, ...updates });
    } catch (e) {
      toast.error('Update failed');
    }
  };

  if (loading) return <Skeleton />;
  if (error) return <Error message={error.message} />;
  if (!item) return null;

  return (
    <Card>
      <h3>{item.name}</h3>
      <p>{item.weight}g</p>
      <Button onClick={() => handleUpdate({ status: 'archived' })}>
        Archive
      </Button>
    </Card>
  );
}
```

**Problems with this approach**:
- Component handles data fetching, error handling, state management, AND UI
- Can't test business logic without rendering React component
- Can't reuse fetch/update logic in other components
- `useEffect` dependencies error-prone
- Difficult to optimize (memo, useMemo, useCallback everywhere)

## Decision

We will adopt **Feature-Sliced Light** architecture:

### Principles

1. **Separation of Concerns**: Business logic ↔ UI completely separate
2. **Custom Hooks for Logic**: All data fetching, calculations, state management in hooks
3. **Stateless UI Components**: Components receive data via props only
4. **No useEffect in Components**: Keep components pure and predictable
5. **Types First**: Define data models in `/types` before implementation

### Directory Structure

```
app/              # Next.js routes (pages, layouts)
components/       # UI components (stateless)
  ├── ui/        # shadcn/ui base components
  ├── layout/    # Header, Footer, Shell
  └── feature/   # Feature-specific UI
hooks/            # Custom hooks (business logic)
  ├── useItems.ts
  ├── useLoadouts.ts
  └── useSupabaseStore.ts
lib/              # Utilities, services
  ├── supabase/  # Supabase client, services
  └── utils.ts   # Helper functions
types/            # TypeScript types
  ├── gear.ts
  └── database.ts
```

### Code Structure

**After** (Feature-Sliced Light):

**1. Define Types** (`types/gear.ts`):
```typescript
export interface GearItem {
  id: string;
  user_id: string;
  name: string;
  weight: number;
  status: 'inventory' | 'wishlist' | 'archived';
  // ...
}
```

**2. Create Hook** (`hooks/useGearItem.ts`):
```typescript
export function useGearItem(itemId: string) {
  const [item, setItem] = useState<GearItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('gear_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (error) throw error;
        setItem(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [itemId]);

  const updateItem = async (updates: Partial<GearItem>) => {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from('gear_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      setItem(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Item updated');
    } catch (e) {
      toast.error('Update failed');
      throw e;
    }
  };

  return { item, loading, error, updateItem };
}
```

**3. Create Component** (`components/gear/GearCard.tsx`):
```typescript
interface GearCardProps {
  item: GearItem;
  onUpdate: (updates: Partial<GearItem>) => void;
  isLoading?: boolean;
}

export function GearCard({ item, onUpdate, isLoading }: GearCardProps) {
  return (
    <Card>
      <h3>{item.name}</h3>
      <p>{item.weight}g</p>
      <Button
        onClick={() => onUpdate({ status: 'archived' })}
        disabled={isLoading}
      >
        Archive
      </Button>
    </Card>
  );
}
```

**4. Use in Page** (`app/[locale]/inventory/page.tsx`):
```typescript
export default function InventoryPage() {
  const { items, loading, updateItem } = useItems();

  return (
    <div>
      {loading && <LoadingSpinner />}
      {items.map(item => (
        <GearCard
          key={item.id}
          item={item}
          onUpdate={(updates) => updateItem(item.id, updates)}
        />
      ))}
    </div>
  );
}
```

### Benefits

**Testability**:
```typescript
// Test hook logic without React
describe('useGearItem', () => {
  it('fetches item', async () => {
    const { result } = renderHook(() => useGearItem('123'));
    await waitFor(() => expect(result.current.item).toBeDefined());
  });
});

// Test component with mock data
describe('GearCard', () => {
  it('renders item', () => {
    const mockItem = { id: '1', name: 'Tent', weight: 1200 };
    render(<GearCard item={mockItem} onUpdate={jest.fn()} />);
    expect(screen.getByText('Tent')).toBeInTheDocument();
  });
});
```

**Reusability**:
```typescript
// Use same hook in multiple components
function GearCard() {
  const { item, updateItem } = useGearItem(itemId);
  // ...
}

function GearModal() {
  const { item, updateItem } = useGearItem(itemId);
  // ...
}
```

**Performance**:
```typescript
// Components are pure → easy to memoize
export const GearCard = memo(GearCardComponent);

// No unnecessary re-renders (no useEffect)
```

## Alternatives Considered

### 1. Fat Components (Current State)

**Pro:** Simple for small apps

**Con:**
- Mixed concerns
- Difficult to test
- Can't reuse logic
- Large components (500+ lines)

**Verdict:** Not scalable

### 2. Feature-Sliced Design (Full)

**Pro:** Complete architecture with slices, segments, layers

**Con:**
- Overkill for our size
- Too many folders/files
- Steep learning curve
- Over-engineering

**Verdict:** Too complex

### 3. Smart/Dumb Components (Container/Presentational)

**Pro:** Separates logic from UI

**Con:**
- Still mixes data fetching with React
- Requires two components per feature
- Less flexible than hooks
- Older pattern (pre-hooks era)

**Verdict:** Hooks are better

### 4. MVC Architecture

**Pro:** Well-known pattern

**Con:**
- Doesn't fit React's component model
- Controllers awkward in React
- Over-engineering

**Verdict:** Not React-idiomatic

### 5. Service Layer (Angular-style)

**Pro:** Centralized business logic

**Con:**
- Difficult to integrate with React
- No access to React hooks
- State management becomes complex

**Verdict:** Doesn't leverage React strengths

## Implementation

### Migration Strategy

**Phase 1**: New features (don't touch existing)
**Phase 2**: Refactor high-traffic pages
**Phase 3**: Refactor remaining pages (as needed)

### Rules

1. **No `useEffect` in components** (exceptions: refs, DOM manipulation)
2. **No API calls in components** (use hooks)
3. **Components receive data via props** (no direct Supabase calls)
4. **Types first** (define in `/types` before coding)
5. **Hooks for everything** (state, data fetching, calculations)

### Exceptions

**When to break rules**:
- **One-off pages**: Simple pages with unique logic can violate rules
- **Third-party integrations**: Some libraries require `useEffect`
- **DOM manipulation**: `useEffect` for refs, focus, scrolling
- **Performance**: Sometimes inline logic is faster (measure first)

**But always prefer hooks** unless there's a strong reason not to.

## Consequences

### Positive

1. **Better Testability**
   - Test hooks with `@testing-library/react-hooks`
   - Test components with mock data
   - Faster tests (no API calls)

2. **Code Reuse**
   - Same hook in multiple components
   - Same hook in pages and modals
   - Logic abstracted from UI

3. **Easier Refactoring**
   - Change logic without touching UI
   - Change UI without touching logic
   - Clear separation of concerns

4. **Better Performance**
   - Pure components → easy to memoize
   - No unnecessary re-renders
   - Clearer optimization points

5. **Easier Onboarding**
   - New developers: "Logic in hooks, UI in components"
   - Clear structure
   - Consistent patterns

### Negative

1. **More Files**
   - Feature now spans 3 files (type, hook, component)
   - More navigation between files
   - Can feel like boilerplate

2. **Learning Curve**
   - Team needs to learn pattern
   - Some resistance initially ("why so many files?")
   - Requires discipline

3. **Potential Over-Abstraction**
   - Simple features feel over-engineered
   - Temptation to create hooks for everything
   - Need judgment on when to simplify

### Neutral

1. **Hook Dependencies**
   - Still need to manage `useEffect` dependencies (in hooks)
   - But isolated to one place
   - Easier to review

2. **Performance**
   - Not inherently faster or slower
   - Easier to optimize (pure components)
   - Need to measure (don't assume)

## Examples in Codebase

### Good Examples

**`hooks/useLoadouts.ts`**:
- Handles all loadout state
- Provides CRUD operations
- Manages optimistic updates
- 300 lines of pure logic

**`components/loadouts/LoadoutCard.tsx`**:
- Stateless component
- Receives loadout data via props
- Callbacks for actions
- 50 lines of pure UI

**`hooks/useSupabaseStore.ts`**:
- Global state with Zustand
- Syncs with Supabase
- Handles offline/online
- 500+ lines of logic, zero UI

### Bad Examples (Before Refactor)

**`components/gear/GearEditor.tsx` (old)**:
- 800 lines
- Mixed API calls, state, validation, UI
- Impossible to test
- Hard to understand

**After refactor**:
- `hooks/useGearEditor.ts`: 400 lines (logic)
- `components/gear/GearEditorForm.tsx`: 200 lines (UI)
- `types/gear.ts`: 50 lines (types)
- Total: 650 lines (20% reduction + better separation)

## Enforcement

### ESLint Rules (TODO)

```javascript
// .eslintrc.js
rules: {
  // Warn on useEffect in components (with exceptions)
  'react-hooks/exhaustive-deps': 'error',

  // Prefer hooks over class components
  'react/prefer-stateless-function': 'error',
}
```

### Code Review Checklist

- [ ] Business logic in custom hooks?
- [ ] Components stateless (props only)?
- [ ] No `useEffect` in components (unless exception)?
- [ ] Types defined in `/types`?
- [ ] Hook exports testable functions?

## Related Patterns

### With Zustand (Global State)

```typescript
// hooks/useItemsStore.ts
const useItemsStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}));

// Component uses store
function Component() {
  const { items, addItem } = useItemsStore();
  return <List items={items} onAdd={addItem} />;
}
```

### With Server Actions (Next.js 15+)

```typescript
// actions/updateItem.ts
'use server';
export async function updateItem(id: string, updates: Partial<GearItem>) {
  const supabase = createServerClient();
  await supabase.from('gear_items').update(updates).eq('id', id);
  revalidatePath('/inventory');
}

// Component
<Button onClick={() => updateItem(id, { status: 'archived' })}>
  Archive
</Button>
```

## Future Improvements

- [ ] Extract more common hooks (useOptimisticUpdate, usePagination)
- [ ] Better hook composition (useGearItem → useGearActions + useGearData)
- [ ] Auto-generate hooks from database schema
- [ ] Stricter ESLint rules

## Related Docs

- [System Architecture](../architecture/overview.md)
- [Development Setup](../guides/development-setup.md)
- [Testing Guide](../guides/testing.md)

---

**Decision Date**: 2025-11-15
**Status**: ✅ Active & Enforced
**Adoption**: 80% (new code follows, old code being refactored)
