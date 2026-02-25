# Research: Restore Product Search with Cloudinary Integration

**Feature**: 039-product-search-cloudinary
**Date**: 2025-12-09

## Research Tasks

### 1. Cloudinary URL Upload Capability

**Question**: Can Cloudinary accept external URLs for upload (not just local files)?

**Decision**: Yes - Cloudinary supports URL uploads via the REST API

**Rationale**: Cloudinary's upload API accepts a `file` parameter that can be:
- A local file path
- A base64-encoded data URI
- **A publicly accessible URL** (HTTP/HTTPS)

When passing a URL, Cloudinary fetches the image server-side, which:
- Bypasses CORS restrictions (server-to-server)
- Handles hotlink protection issues
- Stores the image in Cloudinary's CDN

**Implementation**: Pass the external URL directly to the `file` field in FormData:
```typescript
formData.append('file', 'https://example.com/image.jpg'); // URL as string
```

**Alternatives Considered**:
- Proxy through our server → Extra latency, bandwidth costs
- Client-side fetch + upload → CORS issues, hotlink blocking

### 2. Existing Server Action Reuse

**Question**: Can we reuse the existing `searchGearImages` server action from Feature 030?

**Decision**: Yes - fully reusable without modification

**Rationale**: The server action at `app/actions/image-search.ts`:
- Returns `ImageSearchResult[]` with `imageUrl`, `thumbnailUrl`, `title`
- Already configured with Serper.dev API
- Handles API key security (server-side only)
- Returns up to 9 results

**Implementation**: Import and call directly:
```typescript
import { searchGearImages } from '@/app/actions/image-search';
const results = await searchGearImages(query);
```

**Alternatives Considered**:
- Create new API route → Redundant, server action already secure
- Modify existing action → Not needed, interface is sufficient

### 3. Hook Extension Strategy

**Question**: How to add URL upload capability to `useCloudinaryUpload`?

**Decision**: Add new `uploadUrl` method alongside existing `uploadLocal`

**Rationale**:
- Preserves existing local file upload functionality
- Cleaner separation of concerns (File vs URL handling)
- Different progress tracking (URL uploads don't have background removal step)
- Consistent return type (`secure_url` string or null)

**Implementation**:
```typescript
export interface UseCloudinaryUploadReturn {
  // Existing
  uploadLocal: (file: File, options: {...}) => Promise<string | null>;
  // New
  uploadUrl: (url: string, options: { userId: string; itemId: string }) => Promise<string | null>;
}
```

**Alternatives Considered**:
- Single method with union type → Complex conditionals, harder to type
- Separate hook → Code duplication, inconsistent state management

### 4. UI Integration Approach

**Question**: Where to place the product search UI relative to existing upload options?

**Decision**: Add search UI at the TOP of ImageUploadZone, above drag-drop

**Rationale** (per spec FR-016):
- Product Search is the PRIMARY image selection method
- Drag-and-drop becomes secondary (still prominent)
- Cloud Import (Unsplash) becomes tertiary (below "Or" divider)

**UI Layout**:
```
┌─────────────────────────────────────┐
│ 🔍 [ Search for product images... ] │  ← NEW: Search input + button
├─────────────────────────────────────┤
│ [Search Results Grid - 3x3]         │  ← NEW: ProductSearchGrid
├─────────────────────────────────────┤
│ ─────────── Or ───────────          │
├─────────────────────────────────────┤
│ [Drag & Drop Zone]                  │  ← EXISTING
├─────────────────────────────────────┤
│ [Remove Background Toggle]          │  ← EXISTING
├─────────────────────────────────────┤
│ ─────────── Or ───────────          │
├─────────────────────────────────────┤
│ [Import from Cloud (Unsplash)]      │  ← EXISTING (demoted)
└─────────────────────────────────────┘
```

**Alternatives Considered**:
- Tabs (Search | Upload | Cloud) → More clicks, hides options
- Modal for search → Extra interaction, context switch

### 5. Search State Management

**Question**: Where should search state (query, results, loading) live?

**Decision**: Create new `useProductSearch` hook for search logic

**Rationale**:
- Constitution requires logic in hooks, not components
- Separate from upload state (different lifecycle)
- Reusable if search needed elsewhere
- Clean component code

**Implementation**:
```typescript
// hooks/useProductSearch.ts
export function useProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'searching' | 'error'>('idle');

  const search = useCallback(async (searchQuery: string) => {
    // Debounce + call server action
  }, []);

  return { query, setQuery, results, status, search, clear };
}
```

**Alternatives Considered**:
- State in ImageUploadZone → Violates constitution
- Extend useCloudinaryUpload → Mixing concerns

## Summary

| Decision | Approach |
|----------|----------|
| Cloudinary URL Upload | Pass URL string directly to upload API |
| Server Action | Reuse existing `searchGearImages` unchanged |
| Hook Extension | Add `uploadUrl` method to `useCloudinaryUpload` |
| Search Hook | New `useProductSearch` hook for search state |
| UI Layout | Search at top, drag-drop middle, cloud import bottom |
