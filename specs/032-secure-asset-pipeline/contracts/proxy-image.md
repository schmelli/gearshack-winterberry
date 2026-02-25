# API Contract: Image Proxy Route

**Feature**: 032-secure-asset-pipeline
**Endpoint**: `/api/proxy-image`
**Method**: GET

## Overview

Server-side image proxy that fetches external images on behalf of the client, bypassing CORS restrictions while validating content safety.

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | URL-encoded external image URL to fetch |

### Example Request

```http
GET /api/proxy-image?url=https%3A%2F%2Fexample.com%2Fimage.jpg
```

### Validation Rules

1. `url` must be present and non-empty
2. `url` must be a valid HTTP or HTTPS URL
3. `url` must not point to:
   - `localhost` or `127.0.0.1`
   - Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
   - Internal domains

## Response

### Success Response (200 OK)

Binary image data with proxied headers.

**Headers**:
- `Content-Type`: Original content type from source (e.g., `image/jpeg`)
- `Content-Length`: Size in bytes
- `Cache-Control`: `public, max-age=86400` (24 hours)

**Body**: Raw image binary data

### Error Responses

#### 400 Bad Request - Missing URL

```json
{
  "error": "MISSING_URL",
  "message": "URL parameter is required"
}
```

#### 400 Bad Request - Invalid URL

```json
{
  "error": "INVALID_URL",
  "message": "Invalid or malformed URL"
}
```

#### 400 Bad Request - Blocked URL

```json
{
  "error": "BLOCKED_URL",
  "message": "URLs pointing to localhost or internal IPs are not allowed"
}
```

#### 403 Forbidden - Not an Image

```json
{
  "error": "NOT_IMAGE",
  "message": "The URL does not point to an image"
}
```

#### 404 Not Found - Source Not Found

```json
{
  "error": "NOT_FOUND",
  "message": "Image not found at the specified URL"
}
```

#### 413 Payload Too Large - File Too Large

```json
{
  "error": "TOO_LARGE",
  "message": "Image exceeds maximum size of 10MB"
}
```

#### 500 Internal Server Error - Fetch Failed

```json
{
  "error": "FETCH_FAILED",
  "message": "Failed to retrieve image from source"
}
```

#### 504 Gateway Timeout - Timeout

```json
{
  "error": "TIMEOUT",
  "message": "Request to source timed out"
}
```

## Security Measures

### SSRF Protection

- Block `localhost`, `127.0.0.1`, and `::1`
- Block private IP ranges
- Only allow `http://` and `https://` protocols

### Content Validation

- Verify `Content-Type` header starts with `image/`
- Enforce 10MB file size limit
- 30-second timeout for external requests

### Rate Limiting

- Relies on upstream Vercel/hosting rate limits
- No additional rate limiting in this implementation

## Implementation Notes

### Redirect Handling

The proxy follows HTTP redirects (301, 302, 307, 308) automatically. If the final destination fails validation, the request is rejected.

### Supported Image Types

Any content type starting with `image/`:
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`
- etc.

### Error Mapping for Client

| HTTP Status | Error Code | User Message |
|-------------|------------|--------------|
| 400 | MISSING_URL, INVALID_URL, BLOCKED_URL | "Invalid image URL. Please try a different image." |
| 403 | NOT_IMAGE | "The URL does not point to an image. Please try a different image." |
| 404 | NOT_FOUND | "Image not found. Please try a different image." |
| 413 | TOO_LARGE | "Image is too large (max 10MB). Please try a different image." |
| 500 | FETCH_FAILED | "Could not download image. Please try again or use direct upload." |
| 504 | TIMEOUT | "Image download timed out. Please try again or use direct upload." |
