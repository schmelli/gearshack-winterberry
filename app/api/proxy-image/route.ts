import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API Route (Stealth Mode)
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

    // Block private IP ranges
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/,
    ];

    if (privatePatterns.some((pattern) => pattern.test(hostname))) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  console.log('[Proxy] ====== IMAGE PROXY REQUEST ======');
  console.log('[Proxy] Requested URL:', url);

  if (!url) {
    console.log('[Proxy] ERROR: Missing URL parameter');
    return NextResponse.json({ error: 'MISSING_URL', message: 'No URL provided' }, { status: 400 });
  }

  // Validate URL presence and protocol
  try {
    const parsed = new URL(url);
    console.log('[Proxy] Parsed URL:', { protocol: parsed.protocol, hostname: parsed.hostname });
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    console.log('[Proxy] ERROR: Invalid URL format');
    return NextResponse.json({ error: 'INVALID_URL', message: 'Invalid URL format' }, { status: 400 });
  }

  if (isBlockedUrl(url)) {
    console.log('[Proxy] ERROR: Blocked URL (security)');
    return NextResponse.json({ error: 'BLOCKED_URL', message: 'URL is blocked for security' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    console.log('[Proxy] Fetching external URL...');

    // FIX: Tarnung als echter Browser
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);
    console.log('[Proxy] Fetch response:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      console.error(`[Proxy] Upstream error: ${response.status} ${response.statusText} for ${url}`);
      return NextResponse.json(
        { error: 'FETCH_FAILED', message: `Failed to fetch: HTTP ${response.status}`, details: response.statusText },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('[Proxy] Response content-type:', contentType);

    const imageBuffer = await response.arrayBuffer();
    console.log('[Proxy] Downloaded bytes:', imageBuffer.byteLength);

    if (imageBuffer.byteLength > MAX_FILE_SIZE) {
      console.log('[Proxy] ERROR: File too large:', imageBuffer.byteLength);
      return NextResponse.json({ error: 'TOO_LARGE', message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }, { status: 413 });
    }

    // Determine final content type - be more intelligent about it
    let finalContentType = contentType;
    if (!finalContentType || !finalContentType.startsWith('image/')) {
      // Try to detect from URL extension
      const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
      const extMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      finalContentType = extMap[ext || ''] || 'image/jpeg';
      console.log('[Proxy] Detected content-type from extension:', finalContentType);
    }

    console.log('[Proxy] SUCCESS - Returning image with type:', finalContentType, 'size:', imageBuffer.byteLength);

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': finalContentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Proxy] FATAL ERROR:', errorMessage, error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: `Proxy error: ${errorMessage}` },
      { status: 500 }
    );
  }
}