# Research: Integrated Image Search

**Feature**: 030-integrated-image-search
**Date**: 2025-12-07

## Research Summary

This document captures design decisions and technical patterns for implementing the integrated image search feature.

---

## Decision 1: API Choice - Serper.dev

**Decision**: Use Serper.dev Google Images API

**Rationale**:
- User has existing API key configured
- Simple REST API with straightforward authentication
- Returns both thumbnail and full-size image URLs
- Cost-effective (generous free tier, low per-request cost)
- Returns up to 100 results per request (we need only 9)

**Alternatives Considered**:
- Google Custom Search API: More complex setup, requires custom search engine configuration
- Bing Image Search: Different API structure, additional Azure setup required
- Unsplash API: Only stock photos, not product images
- Direct scraping: Unreliable, against TOS, legal issues

---

## Decision 2: Server Action Pattern

**Decision**: Use Next.js Server Action for API proxy

**Rationale**:
- Built into Next.js App Router (no additional dependencies)
- API key stays server-side only (never exposed to client)
- Automatic request/response serialization
- Can be called directly from client components
- TypeScript type safety end-to-end

**Implementation Pattern**:
```typescript
// app/actions/image-search.ts
'use server';

export async function searchGearImages(query: string): Promise<ImageSearchResult[]> {
  // Validate input
  // Call Serper.dev API with server-side API key
  // Transform response to our schema
  // Return results (or empty array on error)
}
```

**Alternatives Considered**:
- API Route (`/api/image-search`): More boilerplate, requires manual fetch from client
- Edge Function: Overkill for simple proxy, adds complexity
- Client-side with exposed key: Security violation (rejected)

---

## Decision 3: Serper.dev API Integration

**Decision**: POST to `https://google.serper.dev/images` with `X-API-KEY` header

**API Request Format**:
```json
{
  "q": "MSR Hubba Hubba tent",
  "num": 9
}
```

**API Response Format** (relevant fields):
```json
{
  "images": [
    {
      "title": "MSR Hubba Hubba 2-Person Tent",
      "imageUrl": "https://example.com/full-size.jpg",
      "thumbnailUrl": "https://example.com/thumbnail.jpg",
      "source": "rei.com",
      "domain": "rei.com",
      "link": "https://rei.com/product/..."
    }
  ]
}
```

**Transformed Output**:
```typescript
interface ImageSearchResult {
  imageUrl: string;      // Full-size image for form field
  thumbnailUrl: string;  // Smaller image for grid display
  title: string;         // Alt text / tooltip
}
```

---

## Decision 4: UI State Management

**Decision**: Local useState in ImageUploadInput component

**Rationale**:
- State is ephemeral (only exists during search interaction)
- No need for global state or persistence
- Search results are discarded after selection
- Keeps component self-contained

**State Structure**:
```typescript
const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [searchError, setSearchError] = useState<string | null>(null);
```

**Alternatives Considered**:
- Zustand store: Overkill for ephemeral UI state
- React Query: Adds dependency, caching not needed (fresh search each time)
- Custom hook: Would just wrap useState, no benefit

---

## Decision 5: Grid Layout

**Decision**: 3x3 CSS Grid with AspectRatio 1:1 thumbnails

**Rationale**:
- 9 images fits well in available space
- Square thumbnails are consistent and predictable
- AspectRatio component handles image sizing gracefully
- Responsive: works on mobile (may need scroll on very small screens)

**CSS Pattern**:
```tsx
<div className="grid grid-cols-3 gap-2">
  {results.map((result) => (
    <AspectRatio ratio={1} key={result.imageUrl}>
      <img
        src={result.thumbnailUrl}
        alt={result.title}
        className="object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-primary"
        onClick={() => handleSelect(result.imageUrl)}
      />
    </AspectRatio>
  ))}
</div>
```

---

## Decision 6: Error Handling Strategy

**Decision**: Graceful degradation with user-friendly messages

**Error Scenarios**:

| Scenario | Behavior |
|----------|----------|
| API key missing | Log server error, return empty array, show "Search unavailable" |
| Network failure | Catch exception, return empty array, show "Could not complete search" |
| No results | Return empty array, show "No images found. Try different terms." |
| Invalid query (empty) | Prevent search, show "Enter brand or name to search" |

**Rationale**:
- Never expose technical errors to users
- Always provide actionable guidance
- Console logging for debugging on server

---

## Decision 7: Query Construction

**Decision**: Combine brand + name with space separator

**Implementation**:
```typescript
const query = [brand, name].filter(Boolean).join(' ').trim();
if (!query) {
  setSearchError('Enter brand or name to search');
  return;
}
```

**Edge Cases**:
- Only brand: Search with brand only
- Only name: Search with name only
- Neither: Block search, show message
- Special characters: Automatically URL-encoded by fetch

---

## Environment Configuration

**Required Environment Variable**:
```env
SERPER_API_KEY=your-serper-dev-api-key
```

**Validation**: Server Action checks for key presence before making request.

---

## Security Considerations

- API key stored in `.env.local` (gitignored)
- Server Action runs on server only (key never sent to browser)
- No API key in client bundle (verified via build inspection)
- Rate limiting handled by Serper.dev (no additional implementation needed)
