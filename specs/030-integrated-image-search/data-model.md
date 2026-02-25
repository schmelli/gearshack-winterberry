# Data Model: Integrated Image Search

**Feature**: 030-integrated-image-search
**Date**: 2025-12-07

## Entities

### ImageSearchResult

Represents a single image result from the Serper.dev API, transformed into our application schema.

```typescript
/**
 * Image search result from Serper.dev API
 * Feature: 030-integrated-image-search
 */
export interface ImageSearchResult {
  /** Full-size image URL - used when user selects the image (form field value) */
  imageUrl: string;

  /** Thumbnail URL - used for grid display (faster loading) */
  thumbnailUrl: string;

  /** Image title/description - used for alt text and tooltips */
  title: string;
}
```

**Field Details**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| imageUrl | string | Yes | Full-resolution image URL from source website |
| thumbnailUrl | string | Yes | Smaller preview image (typically ~200px) |
| title | string | Yes | Descriptive text from source, used for accessibility |

**Source Mapping** (from Serper.dev API):

| Our Field | Serper.dev Field |
|-----------|-----------------|
| imageUrl | images[].imageUrl |
| thumbnailUrl | images[].thumbnailUrl |
| title | images[].title |

---

### SerperImageResponse (Internal)

Raw response structure from Serper.dev API (for type-safe parsing).

```typescript
/**
 * Raw Serper.dev API response structure (internal use only)
 * Not exported - used only within Server Action
 */
interface SerperImageResponse {
  images: Array<{
    title: string;
    imageUrl: string;
    thumbnailUrl: string;
    source: string;
    domain: string;
    link: string;
  }>;
  searchParameters: {
    q: string;
    type: string;
    num: number;
  };
}
```

---

### ImageSearchState (UI Component)

Local state structure for the search UI.

```typescript
/**
 * Component-local state for image search UI
 * Not a persisted entity - exists only during search interaction
 */
interface ImageSearchState {
  /** Array of search results to display in grid */
  results: ImageSearchResult[];

  /** True while API request is in progress */
  isSearching: boolean;

  /** User-friendly error message (null if no error) */
  error: string | null;
}
```

---

## Validation Rules

### Search Query Validation

| Rule | Constraint | Error Message |
|------|------------|---------------|
| Non-empty | At least one of brand or name must be provided | "Enter brand or name to search" |
| Max length | Query should be reasonable length (< 200 chars) | Implicit - forms already limit field lengths |

### API Response Validation

| Rule | Constraint | Handling |
|------|------------|----------|
| Valid images array | Response must contain images array | Return empty array if missing |
| Required fields | Each image must have imageUrl and thumbnailUrl | Filter out invalid entries |
| URL format | URLs should be valid http/https | Trust API, don't re-validate |

---

## State Transitions

### Search Flow States

```
IDLE → SEARCHING → RESULTS (success)
                 → ERROR (failure)
                 → EMPTY (no results)

RESULTS → IDLE (user selects image or dismisses)
ERROR → IDLE (user dismisses)
EMPTY → IDLE (user dismisses)
```

### State Values by Phase

| Phase | isSearching | results.length | error |
|-------|-------------|----------------|-------|
| IDLE | false | 0 | null |
| SEARCHING | true | 0 | null |
| RESULTS | false | > 0 | null |
| EMPTY | false | 0 | "No images found..." |
| ERROR | false | 0 | "Could not complete..." |

---

## Relationships

### Integration with Existing Entities

```
GearItemFormData.primaryImageUrl ← ImageSearchResult.imageUrl
                                   (user selects image from search)

GearItemFormData.brand + name → Search Query
                                 (used to construct API query)
```

The image search feature does not create or modify any persisted entities. It only:
1. Reads brand/name from form context
2. Provides imageUrl to populate form field

---

## File Location

Types will be defined inline in the Server Action file since they are simple and feature-specific:

```text
app/actions/image-search.ts
├── ImageSearchResult (exported interface)
├── SerperImageResponse (internal interface)
└── searchGearImages (exported Server Action)
```

If types need to be shared with other components, they can be extracted to `types/image-search.ts`.
