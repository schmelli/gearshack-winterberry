# Data Model: Repair Sprint - Proxy Route & Navigation Fixes

**Feature**: 035-repair-sprint
**Date**: 2025-12-08

## Overview

This is a bug fix sprint. No new data models are introduced.

## Existing Entities (Unchanged)

### GearItem

The existing `GearItem` type from `@/types/gear` remains unchanged. The fixes in this sprint only affect:
- How images are fetched via the proxy route (no schema change)
- How navigation links preserve locale (no data impact)

### Locale Configuration

The existing locale configuration from `@/i18n/config.ts` remains unchanged:

```typescript
export const locales = ['en', 'de'] as const;
export const defaultLocale = 'en' as const;
export type Locale = (typeof locales)[number];
```

## API Route (Existing)

### GET /api/proxy-image

**Purpose**: Proxy external image URLs to bypass CORS restrictions

**Query Parameters**:
- `url` (required): The external image URL to proxy

**Response Codes**:
| Code | Error Key | Description |
|------|-----------|-------------|
| 200 | - | Success - returns image binary |
| 400 | MISSING_URL | URL parameter not provided |
| 400 | INVALID_URL | URL is malformed or uses non-HTTP protocol |
| 400 | BLOCKED_URL | URL points to localhost or private IP |
| 403 | NOT_IMAGE | Content-Type is not image/* |
| 404 | NOT_FOUND | Image not found at source |
| 413 | TOO_LARGE | Image exceeds 10MB limit |
| 500 | FETCH_FAILED | Generic fetch failure |
| 504 | TIMEOUT | Request timed out after 30s |

## Navigation Components (Existing)

### @/i18n/navigation exports

| Export | Purpose | Replaces |
|--------|---------|----------|
| `Link` | Locale-aware anchor | `next/link` default |
| `useRouter` | Locale-aware router | `next/navigation` useRouter |
| `usePathname` | Locale-aware pathname | `next/navigation` usePathname |
| `redirect` | Server-side locale redirect | `next/navigation` redirect |

## Summary

This sprint does not introduce new data models or contracts. All changes are import corrections to use the existing locale-aware navigation utilities.
