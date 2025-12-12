# Data Model: Search Save Fix & i18n Repair Sprint

**Feature**: 031-search-save-i18n-fix
**Date**: 2025-12-08

## Overview

This is a bugfix sprint with no new data models. Existing entities are unchanged.

## Affected Entities

### GearItem (Existing - No Changes)

The `primaryImageUrl` field already supports both Firebase Storage URLs and external URLs:

```typescript
interface GearItem {
  // ... other fields
  primaryImageUrl: string | null;  // Can be Firebase URL or external URL
  nobgImages?: NobgImages;         // Only populated for Firebase URLs by Cloud Functions
  // ... other fields
}
```

**Behavior Clarification**:
- When `primaryImageUrl` is a Firebase Storage URL: `nobgImages` may be populated by Cloud Functions
- When `primaryImageUrl` is an external URL (search-selected): `nobgImages` remains null/undefined

### Translation Messages (Existing - Verification Only)

The `showingItems` key must have consistent placeholders:

```json
// messages/en.json
{
  "Inventory": {
    "showingItems": "Showing {filtered} of {total} items"
  }
}

// messages/de.json
{
  "Inventory": {
    "showingItems": "Zeige {filtered} von {total} Gegenständen"
  }
}
```

**Placeholder Variables**:
- `{filtered}` - Number of items after filtering
- `{total}` - Total number of items

## State Changes

### ImageUploadInput Component State

Local state that must be cleared when search image is selected:

```typescript
// In ImageUploadInput component
const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [searchError, setSearchError] = useState<string | null>(null);

// Parent component state (passed via onFileSelect)
interface LocalImageState {
  file: File | null;
  previewUrl: string | null;
}
```

**State Transition on Search Selection**:
```
Before: { file: File, previewUrl: 'blob:...' } or null
Action: User clicks search result
After:  { file: null, previewUrl: null }
        + form.primaryImageUrl = external URL
```

## No New Contracts

This bugfix sprint does not introduce new API contracts. All changes are internal component state management and translation verification.
