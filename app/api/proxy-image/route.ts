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

  if (!url) {
    return NextResponse.json({ error: 'MISSING_URL' }, { status: 400 });
  }

  // Validate URL presence and protocol
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 });
  }

  if (isBlockedUrl(url)) {
    return NextResponse.json({ error: 'BLOCKED_URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

    if (!response.ok) {
      console.error(`Proxy upstream error: ${response.status} for ${url}`);
      return NextResponse.json(
        { error: 'FETCH_FAILED', details: `Upstream status: ${response.status}` },
        { status: 502 } // Bad Gateway ist passender
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Manche Server senden 'binary/octet-stream' oder keinen Type. 
    // Wir sind hier etwas toleranter, solange wir Daten bekommen.
    // Aber idealerweise sollte es image/* sein.

    const imageBuffer = await response.arrayBuffer();

    if (imageBuffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'TOO_LARGE' }, { status: 413 });
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg', // Fallback
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Proxy Fatal Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}