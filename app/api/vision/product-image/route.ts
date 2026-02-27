/**
 * Product Image Search API Route
 *
 * Feature: Image-to-Inventory via Vision
 *
 * On-demand image lookup for catalog products via Serper.
 * Called lazily from the client when the user opens the disambiguation view,
 * avoiding N+1 Serper calls during the initial scan.
 *
 * POST /api/vision/product-image
 * - Auth required
 * - JSON body: { brand?: string, productName: string }
 * - Returns: { imageUrl: string | null }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productImageLimiter } from '@/lib/rate-limit';
import {
  buildProductImageQuery,
  sanitizeImageUrl,
  SERPER_TIMEOUT_MS,
} from '@/lib/serper-helpers';

export async function POST(request: Request) {
  // Authenticate
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ imageUrl: null }, { status: 401 });
  }

  // Rate limit: 30 image lookups per hour per user
  const rateLimitResult = productImageLimiter.check(user.id);
  if (!rateLimitResult.allowed) {
    const retryAfterSec = Math.ceil(
      Math.max(0, rateLimitResult.resetAt - Date.now()) / 1000
    );
    return NextResponse.json(
      { imageUrl: null },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      }
    );
  }

  const body = await request.json();
  const productName = body?.productName;

  if (!productName || typeof productName !== 'string') {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }

  const brand = typeof body?.brand === 'string' ? body.brand : null;
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.error('SERPER_API_KEY is not configured.');
    return NextResponse.json(
      { imageUrl: null, error: 'Image search service is not configured.' },
      { status: 500 }
    );
  }

  const query = buildProductImageQuery(brand, productName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);

    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 1 }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Map all upstream errors to generic 502 to avoid leaking internal
      // provider details (e.g. Serper 402 billing state) to the client
      return NextResponse.json(
        { imageUrl: null, error: 'Failed to fetch image from provider.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    // Validate URL scheme to prevent javascript:/data: URLs from Serper
    const imageUrl = sanitizeImageUrl(data?.images?.[0]?.imageUrl);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { imageUrl: null, error: 'Image search timed out' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { imageUrl: null, error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
