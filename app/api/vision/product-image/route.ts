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

const SERPER_TIMEOUT_MS = 5000;

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

  const body = await request.json();
  const productName = body?.productName;

  if (!productName || typeof productName !== 'string') {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }

  const brand = typeof body?.brand === 'string' ? body.brand : null;
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ imageUrl: null });
  }

  const query = [brand, productName, 'outdoor gear product']
    .filter(Boolean)
    .join(' ');

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
      return NextResponse.json({ imageUrl: null });
    }

    const data = await response.json();
    const imageUrl = data?.images?.[0]?.imageUrl ?? null;

    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}
