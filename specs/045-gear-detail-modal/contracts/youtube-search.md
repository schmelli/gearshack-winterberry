# API Contract: YouTube Search

**Endpoint**: `GET /api/youtube/search`
**Feature**: 045-gear-detail-modal
**FR Reference**: FR-008, FR-009, FR-010, FR-011, FR-012

## Purpose

Search YouTube for product review videos based on gear item brand and name. Results are cached in the database for 7 days to minimize API quota usage.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand` | string | No | Product brand (e.g., "NEMO") |
| `name` | string | Yes | Product name (e.g., "Hornet Elite 2P") |
| `limit` | number | No | Max results (default: 5, max: 10) |

### Example Request

```http
GET /api/youtube/search?brand=NEMO&name=Hornet+Elite+2P&limit=5
```

## Response

### Success (200 OK)

```typescript
interface YouTubeSearchResponse {
  videos: YouTubeVideo[];
  query: string;
  totalResults: number;
  cached: boolean;
  expiresAt: string; // ISO 8601
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}
```

### Example Response

```json
{
  "videos": [
    {
      "videoId": "abc123xyz",
      "title": "NEMO Hornet Elite 2P Review - Ultralight Tent Test",
      "thumbnailUrl": "https://i.ytimg.com/vi/abc123xyz/mqdefault.jpg",
      "channelTitle": "Outdoor Gear Review",
      "publishedAt": "2024-06-15T10:30:00Z"
    },
    {
      "videoId": "def456uvw",
      "title": "Is the NEMO Hornet Elite Worth It?",
      "thumbnailUrl": "https://i.ytimg.com/vi/def456uvw/mqdefault.jpg",
      "channelTitle": "Backpacking Light",
      "publishedAt": "2024-03-22T14:00:00Z"
    }
  ],
  "query": "NEMO Hornet Elite 2P review outdoor gear",
  "totalResults": 127,
  "cached": false,
  "expiresAt": "2025-12-18T22:30:00Z"
}
```

### Error Responses

#### 400 Bad Request - Missing name parameter

```json
{
  "error": "MISSING_NAME",
  "message": "Product name is required"
}
```

#### 503 Service Unavailable - API quota exceeded or service down

```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Unable to load reviews"
}
```

## Implementation Notes

### Cache Key Generation

```typescript
const cacheKey = sha256(`${brand ?? ''}|${name}|review outdoor gear`);
```

### Query Construction

```typescript
const searchQuery = `${brand ?? ''} ${name} review outdoor gear`.trim();
```

### Cache Flow

1. Check `api_cache` for existing entry with `service='youtube'` and matching `cache_key`
2. If found and `expires_at > NOW()`, return cached `response_data`
3. If miss or expired, call YouTube API, store result, return fresh data

### Rate Limiting

- YouTube API quota: ~100 searches/day (free tier)
- Cache hit ratio target: >95% after initial population
- No per-user rate limiting (cache is shared)

## Zod Schema

```typescript
import { z } from 'zod';

export const youtubeSearchParamsSchema = z.object({
  brand: z.string().max(100).optional(),
  name: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(10).default(5),
});

export const youtubeVideoSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().max(500),
  thumbnailUrl: z.string().url(),
  channelTitle: z.string(),
  publishedAt: z.string().datetime(),
});

export const youtubeSearchResponseSchema = z.object({
  videos: z.array(youtubeVideoSchema),
  query: z.string(),
  totalResults: z.number(),
  cached: z.boolean(),
  expiresAt: z.string().datetime(),
});
```
