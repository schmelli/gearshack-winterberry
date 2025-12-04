# Research: Gear Item Editor

**Feature**: 001-gear-item-editor
**Date**: 2025-12-04
**Status**: Complete

## Research Topics

### 1. Ontology Conversion (TTL → JSON)

**Decision**: Convert GearGraph ontology TTL to static JSON at build time

**Rationale**:
- The ontology defines the Category → Subcategory → ProductType hierarchy
- TTL format is not directly usable in browser JavaScript
- Static JSON enables offline operation and fast lookups
- Build-time conversion ensures type safety and validation

**Alternatives Considered**:
- Runtime TTL parsing (rejected: adds ~50KB dependency, slower startup)
- Server-side API for taxonomy (rejected: adds complexity, requires backend)
- Manual JSON maintenance (rejected: sync issues with authoritative ontology)

**Implementation Approach**:
1. Create a build script to parse TTL and extract taxonomy hierarchy
2. Generate `taxonomy-data.json` with structure optimized for cascading selects
3. Generate TypeScript types from the extracted data

**JSON Structure**:
```json
{
  "categories": [
    {
      "id": "shelter",
      "label": "Shelter",
      "subcategories": [
        {
          "id": "tents",
          "label": "Tents",
          "productTypes": [
            { "id": "freestanding", "label": "Freestanding" },
            { "id": "non-freestanding", "label": "Non-freestanding" }
          ]
        }
      ]
    }
  ],
  "brands": [
    { "id": "brand-1", "name": "Brand Name", "url": "https://..." }
  ]
}
```

---

### 2. Form State Management Pattern

**Decision**: Use react-hook-form with Zod resolver in a custom hook

**Rationale**:
- Constitution mandates react-hook-form + Zod
- Custom hook (`useGearEditor`) satisfies Feature-Sliced Light principle
- react-hook-form provides optimal performance for large forms (20+ fields)
- Zod provides runtime validation with TypeScript inference

**Alternatives Considered**:
- Formik (rejected: constitution specifies react-hook-form)
- Native React state (rejected: poor performance with many fields)
- Redux Form (rejected: overkill, adds unnecessary dependency)

**Implementation Approach**:
```typescript
// hooks/useGearEditor.ts
export function useGearEditor(initialData?: GearItem) {
  const form = useForm<GearItemFormData>({
    resolver: zodResolver(gearItemSchema),
    defaultValues: initialData ?? defaultGearItem,
  });

  // Taxonomy cascade logic
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const filteredSubcategories = useMemo(() =>
    getSubcategoriesForCategory(selectedCategory), [selectedCategory]);

  // ... form handlers, validation, submission
  return { form, handlers, taxonomyState };
}
```

---

### 3. Form Section Organization

**Decision**: Use shadcn Tabs component for section navigation

**Rationale**:
- Tabs provide clear visual separation of form sections
- Better UX than collapsible cards (all sections equally accessible)
- Mobile-friendly with horizontal scroll
- Matches success criteria SC-004 (fewer than 10 visible fields)

**Alternatives Considered**:
- Accordion/Collapsible cards (rejected: harder to navigate between non-adjacent sections)
- Multi-step wizard (rejected: overkill for edit mode where user needs random access)
- Single scrollable form with anchors (rejected: overwhelming, poor mobile UX)

**Section Mapping**:
| Tab | Section Name | Fields |
|-----|--------------|--------|
| 1 | General | Name, Brand, Brand URL, Model, Product URL |
| 2 | Classification | Category, Subcategory, Product Type |
| 3 | Weight & Specs | Weight, Unit, Length, Width, Height |
| 4 | Purchase | Price, Currency, Date, Store, Store Link |
| 5 | Media | Primary Image, Gallery Images |
| 6 | Status | Condition, Status, Notes |

---

### 4. Unsaved Changes Warning

**Decision**: Use `beforeunload` event + custom dialog for in-app navigation

**Rationale**:
- FR-006 requires warning before discarding unsaved changes
- Browser `beforeunload` handles tab close/refresh
- Custom confirmation needed for in-app navigation (Next.js routing)

**Implementation Approach**:
```typescript
// In useGearEditor hook
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (form.formState.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [form.formState.isDirty]);
```

For Next.js App Router navigation, use the `useRouter` hook with confirmation dialog.

---

### 5. Image URL Validation & Preview

**Decision**: Validate URL format with Zod, lazy-load previews with error handling

**Rationale**:
- FR-019 requires image previews for valid URLs
- Cannot validate if URL actually points to an image without fetching
- Lazy loading prevents blocking form render

**Implementation Approach**:
```typescript
// Zod schema for URL validation
const imageUrlSchema = z.string().url().optional().or(z.literal(''));

// Preview component with error handling
function ImagePreview({ url }: { url: string }) {
  const [error, setError] = useState(false);
  if (!url || error) return <PlaceholderImage />;
  return <img src={url} onError={() => setError(true)} alt="Preview" />;
}
```

---

### 6. Weight Unit Display

**Decision**: Store weight in grams, display with user's preferred unit

**Rationale**:
- FR-020 mandates grams as canonical storage unit
- Users may prefer oz or lb for display
- Conversion is a display concern only

**Conversion Functions**:
```typescript
const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_LB = 453.592;

export function gramsToDisplay(grams: number, unit: WeightUnit): number {
  switch (unit) {
    case 'oz': return grams / GRAMS_PER_OZ;
    case 'lb': return grams / GRAMS_PER_LB;
    default: return grams;
  }
}

export function displayToGrams(value: number, unit: WeightUnit): number {
  switch (unit) {
    case 'oz': return value * GRAMS_PER_OZ;
    case 'lb': return value * GRAMS_PER_LB;
    default: return value;
  }
}
```

---

## Dependencies to Add

No new dependencies required. All tools already in package.json:
- react-hook-form: ✅ Already installed
- @hookform/resolvers: ✅ Already installed
- zod: ✅ Already installed

For ontology conversion (dev dependency, one-time script):
- Consider using `n3` or `rdflib` for TTL parsing, or manual extraction since ontology is stable

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Where to store taxonomy JSON? | `lib/taxonomy/taxonomy-data.json` |
| How to handle invalid image URLs? | Show placeholder, don't block save |
| Mobile layout for tabs? | Horizontal scroll with shadcn Tabs default behavior |
| Persistence layer? | Out of scope for this feature (local state only) |
