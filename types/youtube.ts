/**
 * YouTube API Types
 *
 * Feature: 045-gear-detail-modal
 * Task: T001
 *
 * Types for YouTube Data API v3 search responses used in the gear detail modal
 * to display product review videos.
 */

import { z } from 'zod';

// =============================================================================
// Core Types
// =============================================================================

/**
 * Represents a YouTube video search result for display in the carousel.
 */
export interface YouTubeVideo {
  /** YouTube video ID (e.g., "dQw4w9WgXcQ") */
  videoId: string;
  /** Video title */
  title: string;
  /** Thumbnail URL (medium quality, 320x180) */
  thumbnailUrl: string;
  /** Channel name */
  channelTitle: string;
  /** Video publish date (ISO 8601) */
  publishedAt: string;
}

/**
 * Response from the YouTube search API route.
 */
export interface YouTubeSearchResponse {
  /** Array of video results */
  videos: YouTubeVideo[];
  /** Search query used */
  query: string;
  /** Total results available (may exceed returned count) */
  totalResults: number;
  /** Whether this response came from cache */
  cached: boolean;
  /** When the cache entry expires (ISO 8601) */
  expiresAt: string;
}

/**
 * Error response from the YouTube search API route.
 */
export interface YouTubeSearchError {
  error: 'MISSING_NAME' | 'SERVICE_UNAVAILABLE';
  message: string;
}

// =============================================================================
// Zod Schemas (for validation)
// =============================================================================

/**
 * Schema for validating YouTube search request parameters.
 */
export const youtubeSearchParamsSchema = z.object({
  brand: z.string().max(100).optional(),
  name: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(10).default(5),
});

export type YouTubeSearchParams = z.infer<typeof youtubeSearchParamsSchema>;

/**
 * Schema for validating a single YouTube video.
 */
export const youtubeVideoSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().max(500),
  thumbnailUrl: z.string().url(),
  channelTitle: z.string(),
  publishedAt: z.string(),
});

/**
 * Schema for validating the full YouTube search response.
 */
export const youtubeSearchResponseSchema = z.object({
  videos: z.array(youtubeVideoSchema),
  query: z.string(),
  totalResults: z.number(),
  cached: z.boolean(),
  expiresAt: z.string(),
});
