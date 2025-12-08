import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API Route
 * FR-001: Server-side endpoint to proxy external image requests
 * FR-002: Validate content is an image
 * FR-003: Validate URLs are valid HTTP/HTTPS
 * FR-007: Handle failures gracefully
 * FR-008: Follow HTTP redirects
 * FR-009: Apply same file size limits as direct uploads (10MB)
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const TIMEOUT_MS = 30000; // 30 seconds

/**
 * SSRF protection: block internal/private URLs
 */
function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variations
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    ) {
      return true;
    }

    // Block private IP ranges (RFC 1918)
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^fc00:/, // IPv6 private
      /^fe80:/, // IPv6 link-local
    ];

    if (privatePatterns.some((pattern) => pattern.test(hostname))) {
      return true;
    }

    return false;
  } catch {
    return true; // Invalid URL = blocked
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  // Validate URL presence
  if (!url) {
    return NextResponse.json(
      { error: 'MISSING_URL', message: 'URL parameter is required' },
      { status: 400 }
    );
  }

  // Validate URL format and protocol
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return NextResponse.json(
      { error: 'INVALID_URL', message: 'Invalid or malformed URL' },
      { status: 400 }
    );
  }

  // SSRF protection
  if (isBlockedUrl(url)) {
    return NextResponse.json(
      {
        error: 'BLOCKED_URL',
        message: 'URLs pointing to localhost or internal IPs are not allowed',
      },
      { status: 400 }
    );
  }

  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GearshackImageProxy/1.0',
      },
      redirect: 'follow', // FR-008: Follow redirects
    });

    clearTimeout(timeout);

    // Handle 404
    if (response.status === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Image not found at the specified URL' },
        { status: 404 }
      );
    }

    // Handle other non-success status codes
    if (!response.ok) {
      return NextResponse.json(
        { error: 'FETCH_FAILED', message: 'Failed to retrieve image from source' },
        { status: 500 }
      );
    }

    // FR-002: Validate content type is an image
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'NOT_IMAGE', message: 'The URL does not point to an image' },
        { status: 403 }
      );
    }

    // FR-009: Check size limit via Content-Length header
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'TOO_LARGE', message: 'Image exceeds maximum size of 10MB' },
        { status: 413 }
      );
    }

    // Get image data
    const imageBuffer = await response.arrayBuffer();

    // FR-009: Double-check size after download (in case Content-Length was missing/wrong)
    if (imageBuffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'TOO_LARGE', message: 'Image exceeds maximum size of 10MB' },
        { status: 413 }
      );
    }

    // Return proxied image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'TIMEOUT', message: 'Request to source timed out' },
        { status: 504 }
      );
    }

    // Handle other fetch errors
    return NextResponse.json(
      { error: 'FETCH_FAILED', message: 'Failed to retrieve image from source' },
      { status: 500 }
    );
  }
}
