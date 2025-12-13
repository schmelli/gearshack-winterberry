# Quickstart: Loadout Creation - Step 1 Form

**Branch**: `047-loadout-creation-form` | **Date**: 2025-12-13

## Overview

This feature enhances the loadout creation form at `/loadouts/new` to include four fields: Name, Description, Season, and Activity Type. Users spend ~60 seconds defining their trip context before proceeding to gear selection.

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `hooks/useLoadoutCreationForm.ts` | CREATE | Form logic hook (react-hook-form + zod) |
| `app/[locale]/loadouts/new/page.tsx` | MODIFY | Enhanced form UI with all 4 fields |
| `lib/validations/loadout-schema.ts` | MODIFY | Extended validation schema |
| `hooks/useSupabaseStore.ts` | MODIFY | Extend createLoadout action signature |
| `messages/en.json` | MODIFY | Add LoadoutCreation namespace |
| `messages/de.json` | MODIFY | Add German translations |

## Implementation Order

### Step 1: Extend Validation Schema

Modify `lib/validations/loadout-schema.ts` to add the new schema:

```typescript
export const loadoutCreationFormSchema = z.object({
  name: z.string().min(1).max(100),
  tripDate: z.string().optional().transform(/* ... */),
  description: z.string().max(500).optional().default(''),
  seasons: z.array(z.enum(['spring', 'summer', 'fall', 'winter'])).default([]),
  activityTypes: z.array(z.enum(['hiking', 'camping', 'climbing', 'skiing', 'backpacking'])).default([]),
});
```

### Step 2: Extend Store Action

Modify `hooks/useSupabaseStore.ts` createLoadout action:

```typescript
createLoadout: async (
  name: string,
  tripDate: Date | null,
  options?: {
    description?: string;
    seasons?: Season[];
    activityTypes?: ActivityType[];
  }
) => { /* ... */ }
```

### Step 3: Create Form Hook

Create `hooks/useLoadoutCreationForm.ts`:

```typescript
export function useLoadoutCreationForm() {
  const form = useForm<LoadoutCreationFormData>({
    resolver: zodResolver(loadoutCreationFormSchema),
    defaultValues: { name: '', description: '', seasons: [], activityTypes: [] },
  });

  const createLoadout = useStore(state => state.createLoadout);
  const router = useRouter();

  const onSubmit = async (data: LoadoutCreationFormData) => {
    const id = await createLoadout(data.name, data.tripDate, {
      description: data.description,
      seasons: data.seasons,
      activityTypes: data.activityTypes,
    });
    router.push(`/loadouts/${id}`);
  };

  const onCancel = () => router.push('/loadouts');

  return { form, onSubmit, onCancel, isSubmitting: form.formState.isSubmitting };
}
```

### Step 4: Add i18n Keys

Add to `messages/en.json` and `messages/de.json` the `LoadoutCreation` namespace (see data-model.md for full structure).

### Step 5: Update Form UI

Modify `app/[locale]/loadouts/new/page.tsx` to use the new hook and render all fields with toggle badges for seasons and activities.

## UI Layout Reference

```
┌────────────────────────────────────────────────────┐
│  Create New Loadout                                │
│  Start planning your trip by defining the basics   │
├────────────────────────────────────────────────────┤
│                                                    │
│  Loadout Name *                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Alpine Crossing April                         │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Description                                       │
│  ┌──────────────────────────────────────────────┐ │
│  │ 5-day hiking trip through alpine passes...    │ │
│  │                                                │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Season                                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Spring │ │ Summer │ │ Fall   │ │ Winter │     │
│  └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                    │
│  Activity Type                                     │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐            │
│  │ Hiking  │ │ Camping │ │ Climbing │            │
│  └─────────┘ └─────────┘ └──────────┘            │
│  ┌─────────┐ ┌─────────────┐                     │
│  │ Skiing  │ │ Backpacking │                     │
│  └─────────┘ └─────────────┘                     │
│                                                    │
│  Trip Date (optional)                              │
│  ┌──────────────────────────────────────────────┐ │
│  │ 📅 Select date                                │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│       ┌─────────────────────────────────────┐     │
│       │     Continue to Packing List  →     │     │
│       └─────────────────────────────────────┘     │
│                                                    │
│                    Cancel                          │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Testing Checklist

- [ ] Form renders with all 4 fields visible without scrolling (768px+)
- [ ] Name field validates on blur (required, max 100 chars)
- [ ] Description field accepts multi-line text (max 500 chars)
- [ ] Season badges toggle on/off with visual feedback
- [ ] Activity badges toggle on/off with visual feedback
- [ ] Submit creates loadout and navigates to editor
- [ ] Cancel navigates to loadouts list
- [ ] All text displays in German locale
- [ ] Form completes in under 60 seconds
