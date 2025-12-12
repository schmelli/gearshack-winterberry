# Quickstart: Integrated Image Search

**Feature**: 030-integrated-image-search
**Date**: 2025-12-07

## Overview

This guide walks through implementing the integrated image search feature for the Gear Editor. The feature adds a functional search button that displays a grid of product images from Serper.dev, allowing users to select images without leaving the app.

---

## Prerequisites

1. Serper.dev API key (add to `.env.local`):
   ```env
   SERPER_API_KEY=your-api-key-here
   ```

2. Existing files to modify:
   - `components/gear-editor/sections/MediaSection.tsx`

3. New files to create:
   - `app/actions/image-search.ts`

---

## Step 1: Create Server Action

**File**: `app/actions/image-search.ts`

```typescript
/**
 * Image Search Server Action
 *
 * Feature: 030-integrated-image-search
 * Proxies image search requests to Serper.dev API
 * Keeps API key secure on server side (FR-011, FR-012)
 */

'use server';

// =============================================================================
// Types
// =============================================================================

export interface ImageSearchResult {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
}

interface SerperImageResponse {
  images: Array<{
    title: string;
    imageUrl: string;
    thumbnailUrl: string;
    source: string;
    domain: string;
    link: string;
  }>;
}

// =============================================================================
// Server Action
// =============================================================================

export async function searchGearImages(query: string): Promise<ImageSearchResult[]> {
  // Validate API key exists
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('[Image Search] SERPER_API_KEY not configured');
    return [];
  }

  // Validate query
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  try {
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: trimmedQuery,
        num: 9,
      }),
    });

    if (!response.ok) {
      console.error('[Image Search] API error:', response.status, response.statusText);
      return [];
    }

    const data: SerperImageResponse = await response.json();

    // Transform to our schema, filtering out invalid entries
    return (data.images || [])
      .filter((img) => img.imageUrl && img.thumbnailUrl)
      .slice(0, 9)
      .map((img) => ({
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        title: img.title || 'Product image',
      }));
  } catch (error) {
    console.error('[Image Search] Request failed:', error);
    return [];
  }
}
```

---

## Step 2: Update MediaSection Component

**File**: `components/gear-editor/sections/MediaSection.tsx`

### 2.1 Add Imports

```typescript
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { searchGearImages, type ImageSearchResult } from '@/app/actions/image-search';
```

### 2.2 Add State in ImageUploadInput

Inside the `ImageUploadInput` component, add search state:

```typescript
// Image search state (Feature 030)
const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [searchError, setSearchError] = useState<string | null>(null);
```

### 2.3 Add Search Handler

```typescript
// Get form context for brand/name values
const form = useFormContext<GearItemFormData>();

const handleImageSearch = useCallback(async () => {
  const brand = form.getValues('brand') || '';
  const name = form.getValues('name') || '';
  const query = [brand, name].filter(Boolean).join(' ').trim();

  if (!query) {
    setSearchError('Enter brand or name to search');
    return;
  }

  setIsSearching(true);
  setSearchError(null);
  setSearchResults([]);

  const results = await searchGearImages(query);

  setIsSearching(false);

  if (results.length === 0) {
    setSearchError('No images found. Try different search terms.');
  } else {
    setSearchResults(results);
  }
}, [form]);

const handleSelectImage = useCallback((imageUrl: string) => {
  onChange(imageUrl);
  setSearchResults([]); // Close grid after selection
  setSearchError(null);
}, [onChange]);

const handleDismissSearch = useCallback(() => {
  setSearchResults([]);
  setSearchError(null);
}, []);
```

### 2.4 Replace Popover with Search Button

Replace the existing Popover (lines ~280-298) with:

```typescript
{/* Image Search Button (Feature 030) */}
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={handleImageSearch}
  disabled={isSearching || isProcessingBg || isUploading}
>
  {isSearching ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    <Search className="w-4 h-4" />
  )}
</Button>
```

### 2.5 Add Search Results Grid

Add after the URL input (after the `{mode === 'url' && (...)}` block):

```typescript
{/* Image Search Results Grid (Feature 030) */}
{(searchResults.length > 0 || searchError) && (
  <div className="mt-3 p-3 border rounded-lg bg-muted/30">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-medium">Search Results</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDismissSearch}
        className="h-6 w-6 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>

    {searchError ? (
      <p className="text-sm text-muted-foreground">{searchError}</p>
    ) : (
      <div className="grid grid-cols-3 gap-2">
        {searchResults.map((result, index) => (
          <AspectRatio ratio={1} key={`${result.imageUrl}-${index}`}>
            <img
              src={result.thumbnailUrl}
              alt={result.title}
              className="w-full h-full object-cover rounded-lg cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:opacity-90"
              onClick={() => handleSelectImage(result.imageUrl)}
              title={result.title}
            />
          </AspectRatio>
        ))}
      </div>
    )}
  </div>
)}
```

---

## Step 3: Verify AspectRatio Component

Ensure `@/components/ui/aspect-ratio` exists. If not, add it via shadcn:

```bash
npx shadcn@latest add aspect-ratio
```

---

## Step 4: Test

1. Start dev server: `npm run dev`
2. Navigate to gear editor (`/inventory/new`)
3. Enter a brand (e.g., "MSR") and name (e.g., "Hubba Hubba")
4. Click the search (magnifying glass) button
5. Verify:
   - Loading spinner appears
   - 9 images display in 3x3 grid
   - Clicking an image populates the URL field
   - Grid closes after selection

---

## Validation Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Search button shows loading state
- [ ] Results display in 3x3 grid
- [ ] Clicking image populates form field
- [ ] Empty query shows helpful message
- [ ] No API key visible in browser DevTools Network tab
- [ ] Error states show user-friendly messages
