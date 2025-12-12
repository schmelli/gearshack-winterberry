# Data Model: Stabilization Sprint - i18n, Image Domains & MIME Fixes

**Feature**: 036-stabilization-sprint
**Date**: 2025-12-08

## Overview

This is a bug fix sprint. No new data models are introduced.

## Existing Entities (Unchanged)

### GearItem

The existing `GearItem` type from `@/types/gear` remains unchanged. The fixes affect:
- How images are handled during upload (MIME type validation)
- How translations are displayed (i18n parameters)

### Translation Message Format

The existing i18n messages remain unchanged:

**English** (`messages/en.json`):
```json
{
  "Inventory": {
    "showingItems": "Showing {filtered} of {total} items",
    "itemCount": "{count} items"
  }
}
```

**German** (`messages/de.json`):
```json
{
  "Inventory": {
    "showingItems": "Zeige {filtered} von {total} Gegenständen",
    "itemCount": "{count} Gegenstände"
  }
}
```

## MIME Type Handling

### Valid Image MIME Types

The following MIME types are accepted by Firebase Storage:
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

### Fallback Logic

When the proxy returns an invalid or missing MIME type:
1. Check if `content-type` header starts with `image/`
2. If yes, use the provided content-type
3. If no, default to `image/jpeg`

## Summary

This sprint does not introduce new data models. All changes are:
- Passing correct parameters to i18n functions
- Validating MIME types during image upload
