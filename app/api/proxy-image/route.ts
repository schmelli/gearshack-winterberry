import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API Route (Stealth Mode)
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const TIMEOUT_MS = 30000; // 30 seconds

/**
 * SSRF protection: block internal/private URLs
 * Covers RFC 1918, RFC 4193, RFC 6598, and other reserved ranges
 *
 * NOTE: DNS rebinding attacks are a known limitation. A fully secure solution
 * would require resolving DNS before fetch and validating the resolved IP.
 * Current mitigations: comprehensive IP range blocking, timeout limits,
 * and this route should only be used for image URLs from trusted search APIs.
 */
function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variations
    const localhostPatterns = [
      'localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0',
      '[::1]',
    ];
    if (localhostPatterns.includes(hostname)) {
      return true;
    }

    // Block .local and .internal domains
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
      return true;
    }

    // Block private and reserved IP ranges (comprehensive list)
    const privatePatterns = [
      // RFC 1918 - Private networks
      /^10\./,                            // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\./,       // 172.16.0.0/12
      /^192\.168\./,                       // 192.168.0.0/16
      // RFC 6598 - Shared Address Space (CGNAT)
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64.0.0/10
      // Link-local
      /^169\.254\./,                       // 169.254.0.0/16
      // Loopback
      /^127\./,                            // 127.0.0.0/8
      // RFC 5737 - Documentation
      /^192\.0\.2\./,                      // 192.0.2.0/24 (TEST-NET-1)
      /^198\.51\.100\./,                   // 198.51.100.0/24 (TEST-NET-2)
      /^203\.0\.113\./,                    // 203.0.113.0/24 (TEST-NET-3)
      // RFC 3927 - Link-local (zeroconf)
      /^0\./,                              // 0.0.0.0/8
      // Benchmarking
      /^198\.18\./,                        // 198.18.0.0/15
      /^198\.19\./,
      // Reserved
      /^224\./,                            // 224.0.0.0/4 (Multicast)
      /^240\./,                            // 240.0.0.0/4 (Reserved)
      // IPv6 private/reserved
      /^fc00:/i,                           // ULA
      /^fd[0-9a-f]{2}:/i,                  // ULA
      /^fe80:/i,                           // Link-local
      /^ff[0-9a-f]{2}:/i,                  // Multicast
      /^::ffff:/i,                         // IPv4-mapped
    ];

    if (privatePatterns.some((pattern) => pattern.test(hostname))) {
      return true;
    }

    // Block non-http(s) protocols that might be in the URL
    if (!['http:', 'https:'].includes(parsed.protocol)) {
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
    return NextResponse.json({ error: 'MISSING_URL', message: 'No URL provided' }, { status: 400 });
  }

  // Validate URL presence and protocol
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: 'INVALID_URL', message: 'Invalid URL format' }, { status: 400 });
  }

  if (isBlockedUrl(url)) {
    return NextResponse.json({ error: 'BLOCKED_URL', message: 'URL is blocked for security' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Extract origin for Referer header (bypasses hotlink protection)
    const parsedUrl = new URL(url);
    const referer = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;

    // FIX: Full browser disguise with Referer to bypass hotlink protection
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': referer,
        'Origin': parsedUrl.origin,
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[Proxy] Upstream error: ${response.status} ${response.statusText} for ${url}`);
      return NextResponse.json(
        { error: 'FETCH_FAILED', message: `Failed to fetch: HTTP ${response.status}`, details: response.statusText },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || '';

    const imageBuffer = await response.arrayBuffer();

    if (imageBuffer.byteLength > MAX_FILE_SIZE) {
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
    }

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
  } finally {
    // Always clear the timeout to prevent memory leaks
    clearTimeout(timeout);
  }
}