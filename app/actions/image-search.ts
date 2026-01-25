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
    throw new Error('Image search is temporarily unavailable. Please try again later.');
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
        num: 6,
      }),
    });

    if (!response.ok) {
      console.error('[Image Search] API error:', response.status, response.statusText);
      throw new Error('Image search is temporarily unavailable. Please try again later.');
    }

    const data: SerperImageResponse = await response.json();

    // Transform to our schema, filtering out invalid entries (3x2 grid = 6 images)
    return (data.images || [])
      .filter((img) => img.imageUrl && img.thumbnailUrl)
      .slice(0, 6)
      .map((img) => ({
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        title: img.title || 'Product image',
      }));
  } catch (error) {
    // Preserve existing error message if already thrown
    if (error instanceof Error && error.message.includes('temporarily unavailable')) {
      throw error;
    }

    // Network error or other fetch failure - log details server-side only
    console.error('[Image Search] Request failed:', error);
    throw new Error('Image search failed. Please try again later.');
  }
}
