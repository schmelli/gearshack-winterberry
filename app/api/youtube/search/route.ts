/**
 * YouTube Search API Route
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T026-T032
 *
 * Searches YouTube for product review videos based on gear item brand and name.
 * Results are cached in the database for 7 days to minimize API quota usage.
 *
 * GET /api/youtube/search?brand=NEMO&name=Hornet+Elite+2P&limit=5
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getFromCache, setCache, generateCacheKey } from '@/lib/supabase/cache';
import type { YouTubeSearchResponse, YouTubeVideo } from '@/types/youtube';

// =============================================================================
// Zod Schemas (from contracts/youtube-search.md)
// =============================================================================

const youtubeSearchParamsSchema = z.object({
  brand: z.string().max(100).optional(),
  name: z.string().min(1, 'Product name is required').max(200),
  limit: z.coerce.number().min(1).max(10).default(5),
});

// =============================================================================
// Types
// =============================================================================

interface YouTubeApiResponse {
  items?: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: {
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }>;
  pageInfo?: {
    totalResults: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

// =============================================================================
// Constants
// =============================================================================

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search';
const CACHE_TTL_DAYS = 7;

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      brand: searchParams.get('brand') ?? undefined,
      name: searchParams.get('name') ?? '',
      limit: searchParams.get('limit') ?? '5',
    };

    // T030, T031: Validate request params with Zod
    const parseResult = youtubeSearchParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      // T031: Handle missing name parameter with 400 error
      if (errors.name) {
        return NextResponse.json(
          { error: 'MISSING_NAME', message: 'Product name is required' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'INVALID_PARAMS', message: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const { brand, name, limit } = parseResult.data;

    // Build search query
    const searchQuery = `${brand ?? ''} ${name} review outdoor gear`.trim();

    // T027: Generate cache key and check cache
    const cacheKey = await generateCacheKey(`${brand ?? ''}|${name}|review outdoor gear`);
    const cached = await getFromCache<YouTubeSearchResponse>('youtube', cacheKey);

    if (cached) {
      // Return cached response
      return NextResponse.json({
        ...cached.data,
        cached: true,
        expiresAt: cached.expiresAt,
      });
    }

    // T028: Call YouTube Data API v3
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY not configured');
      // T032: Handle API quota exhaustion / unavailable with 503
      return NextResponse.json(
        { error: 'SERVICE_UNAVAILABLE', message: 'Unable to load reviews' },
        { status: 503 }
      );
    }

    const url = new URL(YOUTUBE_API_BASE);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(limit));
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('key', apiKey);

    const apiResponse = await fetch(url.toString());
    const apiData: YouTubeApiResponse = await apiResponse.json();

    // T032: Handle API errors (quota, unavailable)
    if (apiData.error) {
      console.error('YouTube API error:', JSON.stringify(apiData.error, null, 2));
      // Provide more specific error messages for debugging
      const errorMessage = apiData.error.code === 403
        ? 'YouTube API quota exceeded or API key invalid'
        : apiData.error.code === 400
        ? 'Invalid YouTube API request'
        : 'Unable to load reviews';
      return NextResponse.json(
        { error: 'SERVICE_UNAVAILABLE', message: errorMessage },
        { status: 503 }
      );
    }

    // Transform API response to our format
    const videos: YouTubeVideo[] = (apiData.items ?? []).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl:
        item.snippet.thumbnails.medium?.url ??
        item.snippet.thumbnails.default?.url ??
        '',
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    const responseData: YouTubeSearchResponse = {
      videos,
      query: searchQuery,
      totalResults: apiData.pageInfo?.totalResults ?? videos.length,
      cached: false,
      expiresAt: '', // Will be set by cache
    };

    // T029: Store response in cache with 7-day TTL
    const cacheEntry = await setCache('youtube', cacheKey, responseData, CACHE_TTL_DAYS);

    return NextResponse.json({
      ...responseData,
      cached: false,
      expiresAt: cacheEntry.expiresAt,
    });
  } catch (error) {
    console.error('YouTube search error:', error);
    // T032: Handle service unavailable gracefully
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE', message: 'Unable to load reviews' },
      { status: 503 }
    );
  }
}
