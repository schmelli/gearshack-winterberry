# Server Action Contract: Image Search

**Feature**: 030-integrated-image-search
**Date**: 2025-12-07

## searchGearImages

Server Action that proxies image search requests to Serper.dev API.

### Signature

```typescript
export async function searchGearImages(query: string): Promise<ImageSearchResult[]>
```

### Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search query (typically brand + name) |

### Output

Returns `ImageSearchResult[]` (array of 0-9 items)

```typescript
interface ImageSearchResult {
  imageUrl: string;      // Full-size image URL
  thumbnailUrl: string;  // Thumbnail for grid display
  title: string;         // Image description
}
```

### Behavior

| Scenario | Response |
|----------|----------|
| Valid query with results | Array of ImageSearchResult (max 9) |
| Valid query with no results | Empty array `[]` |
| Empty/whitespace query | Empty array `[]` |
| API key not configured | Empty array `[]` (logs error server-side) |
| API request fails | Empty array `[]` (logs error server-side) |

### Example Usage

```typescript
import { searchGearImages } from '@/app/actions/image-search';

// In a client component
const results = await searchGearImages('MSR Hubba Hubba');
// Returns: [{ imageUrl: '...', thumbnailUrl: '...', title: '...' }, ...]
```

### Security

- API key (`SERPER_API_KEY`) is read from environment on server only
- Never exposed in client bundle or network requests visible to browser
- Complies with FR-011, FR-012 (API credentials protection)

### Error Handling

All errors are caught and logged server-side. The function never throws - it returns an empty array on any failure. The calling code should handle empty results gracefully.
