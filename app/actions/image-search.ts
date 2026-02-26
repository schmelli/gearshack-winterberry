/**
 * Image Search Server Action
 *
 * Feature: 030-integrated-image-search
 * Proxies image search requests to Serper.dev API
 * Keeps API key secure on server side (FR-011, FR-012)
 */

'use server';

import { z } from 'zod';

// =============================================================================
// Types & Validation
// =============================================================================

export interface ImageSearchResult {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
}

// Zod schema for validating Serper API image results
const SerperImageSchema = z.object({
  title: z.string().default('Product image'),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  source: z.string().optional(),
  domain: z.string().optional(),
  link: z.string().optional(),
});

const SerperResponseSchema = z.object({
  images: z.array(SerperImageSchema),
});


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

    const rawData = await response.json();

    // Validate API response with Zod
    const parseResult = SerperResponseSchema.safeParse(rawData);
    if (!parseResult.success) {
      console.error('[Image Search] Invalid API response:', parseResult.error);
      throw new Error('Image search returned invalid data. Please try again later.');
    }

    const data = parseResult.data;

    // Transform to our schema (3x2 grid = 6 images, already validated by Zod)
    return data.images
      .slice(0, 6)
      .map((img) => ({
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        title: img.title,
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
