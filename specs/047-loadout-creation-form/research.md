# Research: Loadout Creation - Step 1 Form

**Branch**: `047-loadout-creation-form` | **Date**: 2025-12-13

## Research Tasks Completed

### 1. Existing Activity Types

**Decision**: Use existing `ActivityType` enum from `types/loadout.ts`

**Values**: `hiking`, `camping`, `climbing`, `skiing`, `backpacking`

**Display Labels** (from `ACTIVITY_TYPE_LABELS`):
- hiking → "Hiking"
- camping → "Camping"
- climbing → "Climbing"
- skiing → "Skiing"
- backpacking → "Backpacking"

**Rationale**: Reusing existing types ensures consistency with the loadout editor (Step 2) which already uses these values for the priority matrix display in `LoadoutHeader.tsx` and `ActivityMatrix.tsx`.

**Alternatives considered**:
- Creating new German-specific activity types → Rejected: Would break existing loadout editor integration
- Adding more activity types → Deferred: Can be added later via type extension

### 2. Existing Season Types

**Decision**: Use existing `Season` enum from `types/loadout.ts`

**Values**: `spring`, `summer`, `fall`, `winter`

**Display Labels** (from `SEASON_LABELS`):
- spring → "Spring"
- summer → "Summer"
- fall → "Fall"
- winter → "Winter"

**Rationale**: Existing type already used in loadout filtering and metadata. The spec originally requested "Ganzjährig" (year-round) but this is not in the existing enum. Users can select multiple seasons to indicate year-round applicability.

**Alternatives considered**:
- Adding "year-round" option → Deferred: Requires type migration, multi-select achieves same result

### 3. Current Loadout Creation Flow

**Findings**:

| Route | File | Current Fields |
|-------|------|----------------|
| `/loadouts/new` | `app/[locale]/loadouts/new/page.tsx` | name (required), tripDate (optional) |
| `/loadouts/[id]` | `app/[locale]/loadouts/[id]/page.tsx` | Full editor with metadata |

**Current Validation Schema** (`lib/validations/loadout-schema.ts`):
```typescript
export const loadoutFormSchema = z.object({
  name: z.string().min(1).max(100),
  tripDate: z.string().optional()
    .transform(val => val && val.trim() ? new Date(val) : null)
    .refine(val => val === null || !isNaN(val.getTime()), 'Invalid date')
});
```

**Decision**: Extend existing schema to include `description`, `seasons`, `activityTypes`

### 4. Data Storage & State Management

**Findings**:

The `Loadout` interface in `types/loadout.ts` already supports all required fields:
- `name: string` ✅
- `description: string | null` ✅
- `seasons?: Season[]` ✅
- `activityTypes?: ActivityType[]` ✅

**Store Action** (`useSupabaseStore.ts` line 304-371):
```typescript
createLoadout: async (name: string, tripDate: Date | null) => {
  // Currently only accepts name and tripDate
  // NEEDS EXTENSION to accept additional fields
}
```

**Decision**: Extend `createLoadout` action to accept optional metadata:
```typescript
createLoadout: async (
  name: string,
  tripDate: Date | null,
  options?: {
    description?: string;
    seasons?: Season[];
    activityTypes?: ActivityType[];
  }
) => { ... }
```

### 5. i18n Infrastructure

**Findings**:

The project uses `next-intl` with message files:
- `/messages/en.json` - English translations
- `/messages/de.json` - German translations

**Current loadout-related keys**: None specifically for the creation form. Labels are hardcoded.

**Decision**: Add new i18n namespace `LoadoutCreation` with keys:
- `title`, `description` (page metadata)
- `nameLabel`, `namePlaceholder`
- `descriptionLabel`, `descriptionPlaceholder`
- `seasonLabel`, season values
- `activityLabel`, activity values
- `submitButton`, `cancelButton`

### 6. UI Component Selection

**Decision**: Use shadcn/ui components for consistency

| Field | Component | Behavior |
|-------|-----------|----------|
| Name | `Input` | Single text input, required |
| Description | `Textarea` | Multi-line optional text |
| Season | `Badge` + toggle | Multi-select chips (similar to LoadoutHeader) |
| Activity Type | `Badge` + toggle | Multi-select chips (similar to LoadoutHeader) |
| Submit | `Button` (primary) | "Weiter zu Packliste" |
| Cancel | `Button` (ghost) | "Abbrechen" |

**Rationale**: The `LoadoutHeader.tsx` already implements activity type selection as clickable badges. Reusing this pattern ensures visual consistency.

**Reference Implementation** (`components/loadouts/LoadoutHeader.tsx` lines 187-194):
```tsx
{ACTIVITY_OPTIONS.map((activity) => (
  <Badge
    key={activity}
    variant={activityTypes.includes(activity) ? 'default' : 'outline'}
    className="cursor-pointer"
    onClick={() => toggleActivity(activity)}
  >
    {ACTIVITY_TYPE_LABELS[activity]}
  </Badge>
))}
```

## Resolved Clarifications

All technical unknowns from the spec have been resolved:

| Item | Resolution |
|------|------------|
| Activity Types | Use existing 5 values from `ActivityType` enum |
| Season Types | Use existing 4 values from `Season` enum |
| Form validation | Extend existing Zod schema |
| Data persistence | Extend existing `createLoadout` action |
| i18n | Add new keys to existing message files |

## Dependencies

No new dependencies required. Using existing:
- `react-hook-form` 7.x
- `zod` 4.x
- `next-intl`
- `@/components/ui/*` (shadcn/ui)
