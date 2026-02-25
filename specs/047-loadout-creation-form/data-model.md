# Data Model: Loadout Creation - Step 1 Form

**Branch**: `047-loadout-creation-form` | **Date**: 2025-12-13

## Entities

### LoadoutCreationFormData (New)

Form data structure for the enhanced creation form.

```typescript
interface LoadoutCreationFormData {
  /** User-defined name for the loadout (required, max 100 chars) */
  name: string;

  /** Optional trip date (ISO string from date input) */
  tripDate: string;

  /** Optional description explaining the trip context (max 500 chars) */
  description: string;

  /** Selected seasons (multi-select, can be empty) */
  seasons: Season[];

  /** Selected activity types (multi-select, can be empty) */
  activityTypes: ActivityType[];
}
```

### Season (Existing - No Changes)

Enumeration of seasonal contexts.

```typescript
// From types/loadout.ts
type Season = 'spring' | 'summer' | 'fall' | 'winter';

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};
```

### ActivityType (Existing - No Changes)

Enumeration of activity categories.

```typescript
// From types/loadout.ts
type ActivityType = 'hiking' | 'camping' | 'climbing' | 'skiing' | 'backpacking';

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  hiking: 'Hiking',
  camping: 'Camping',
  climbing: 'Climbing',
  skiing: 'Skiing',
  backpacking: 'Backpacking',
};
```

## Validation Rules

### Extended Loadout Form Schema

```typescript
// Extension to lib/validations/loadout-schema.ts
import { z } from 'zod';
import type { Season, ActivityType } from '@/types/loadout';

const seasonValues: Season[] = ['spring', 'summer', 'fall', 'winter'];
const activityTypeValues: ActivityType[] = ['hiking', 'camping', 'climbing', 'skiing', 'backpacking'];

export const loadoutCreationFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),

  tripDate: z.string()
    .optional()
    .transform(val => val && val.trim() ? new Date(val) : null)
    .refine(val => val === null || !isNaN(val.getTime()), 'Invalid date'),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .default(''),

  seasons: z.array(z.enum(['spring', 'summer', 'fall', 'winter'] as const))
    .optional()
    .default([]),

  activityTypes: z.array(z.enum(['hiking', 'camping', 'climbing', 'skiing', 'backpacking'] as const))
    .optional()
    .default([]),
});

export type LoadoutCreationFormData = z.infer<typeof loadoutCreationFormSchema>;
```

## State Transitions

### Form Submission Flow

```
┌─────────────────┐
│   Empty Form    │
│  (initial state)│
└────────┬────────┘
         │ User fills fields
         ▼
┌─────────────────┐
│  Filled Form    │
│  (valid/invalid)│
└────────┬────────┘
         │ User clicks Submit
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Validation    │────▶│  Show Errors    │
│                 │fail │  (stay on form) │
└────────┬────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────┐
│ createLoadout() │
│  (store action) │
└────────┬────────┘
         │ returns loadoutId
         ▼
┌─────────────────┐
│  Navigate to    │
│ /loadouts/[id]  │
│    (Step 2)     │
└─────────────────┘
```

### Cancel Flow

```
┌─────────────────┐
│   Any Form      │
│     State       │
└────────┬────────┘
         │ User clicks Cancel
         ▼
┌─────────────────┐
│  Navigate to    │
│   /loadouts     │
│  (list page)    │
└─────────────────┘
```

## Database Mapping

The form data maps to existing Supabase columns in the `loadouts` table:

| Form Field | Supabase Column | Type |
|------------|-----------------|------|
| name | name | text (NOT NULL) |
| tripDate | trip_date | timestamp with time zone |
| description | description | text |
| seasons | seasons | text[] |
| activityTypes | activity_types | text[] |

**Note**: The Supabase table already has these columns from previous features. No schema migration required.

## i18n Keys Structure

```json
{
  "LoadoutCreation": {
    "title": "Create New Loadout",
    "subtitle": "Start planning your trip by defining the basics",
    "nameLabel": "Loadout Name",
    "namePlaceholder": "e.g., Alpine Crossing April",
    "descriptionLabel": "Description",
    "descriptionPlaceholder": "What kind of trip is this? Any special considerations?",
    "tripDateLabel": "Trip Date (optional)",
    "seasonLabel": "Season",
    "activityLabel": "Activity Type",
    "submitButton": "Continue to Packing List",
    "cancelButton": "Cancel",
    "seasons": {
      "spring": "Spring",
      "summer": "Summer",
      "fall": "Fall",
      "winter": "Winter"
    },
    "activities": {
      "hiking": "Hiking",
      "camping": "Camping",
      "climbing": "Climbing",
      "skiing": "Skiing",
      "backpacking": "Backpacking"
    },
    "validation": {
      "nameRequired": "Name is required",
      "nameTooLong": "Name must be 100 characters or less",
      "descriptionTooLong": "Description must be 500 characters or less"
    }
  }
}
```
