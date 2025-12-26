/**
 * GET /api/catalog/products/search
 * Fuzzy search for products by name with optional brand filtering
 * Feature: 044-intelligence-integration
 *
 * Uses the catalog_products table synced from GearGraph.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Public endpoint - no authentication required
export const dynamic = 'force-dynamic';

// Response types
interface ProductSearchResult {
  id: string;
  name: string;
  brand: { id: string; name: string } | null;
  categoryMain: string | null;
  subcategory: string | null;
  productType: string | null;
  weightGrams: number | null;
  priceUsd: number | null;
  description: string | null;
  score: number;
}

interface ProductSearchResponse {
  results: ProductSearchResult[];
  query: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const brandId = searchParams.get('brand_id') || undefined;
    const limitParam = searchParams.get('limit') || '8';
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 8, 1), 20);

    // Require minimum query length
    if (q.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

    // Build query - use ILIKE for case-insensitive search
    const normalizedQuery = q.toLowerCase().trim();

    // Simplified query without FK join - use brand_external_id for brand name
    let queryBuilder = supabase
      .from('catalog_products')
      .select(`
        id,
        name,
        brand_id,
        brand_external_id,
        category_main,
        subcategory,
        product_type,
        weight_grams,
        price_usd,
        description
      `)
      .ilike('name', `%${normalizedQuery}%`)
      .limit(limit);

    // Filter by brand if provided
    if (brandId) {
      queryBuilder = queryBuilder.eq('brand_id', brandId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Product search error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    // Calculate simple similarity scores and format results
    const results: ProductSearchResult[] = (data || []).map((product) => {
      const nameLower = product.name.toLowerCase();
      const matchIndex = nameLower.indexOf(normalizedQuery);
      const score =
        matchIndex === 0
          ? 0.9 + 0.1 * (normalizedQuery.length / nameLower.length)
          : matchIndex > 0
            ? 0.5 + 0.3 * (normalizedQuery.length / nameLower.length)
            : 0.3;

      // Use brand_external_id as brand name (no FK join needed)
      return {
        id: product.id,
        name: product.name,
        brand: product.brand_external_id
          ? { id: product.brand_id || '', name: product.brand_external_id }
          : null,
        categoryMain: product.category_main,
        subcategory: product.subcategory,
        productType: product.product_type,
        weightGrams: product.weight_grams,
        priceUsd: product.price_usd,
        description: product.description,
        score: Math.round(score * 100) / 100,
      };
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    const response: ProductSearchResponse = {
      results,
      query: q,
      count: results.length,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Product search error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
