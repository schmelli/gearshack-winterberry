/**
 * GET /api/catalog/items/search
 * Fuzzy search for catalog products
 * Feature: 042-catalog-sync-api (US1, US2)
 *
 * Note: Uses catalog_products table (not catalog_items) per actual database schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { productSearchParamsSchema } from '@/lib/validations/catalog-schema';
import type { Database } from '@/types/database';
import type { ProductSearchResponse, ProductSearchResult } from '@/types/catalog';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      q: searchParams.get('q') || undefined,
      mode: searchParams.get('mode') || 'fuzzy',
      brand_id: searchParams.get('brand_id') || undefined,
      category_main: searchParams.get('category_main') || undefined,
      limit: searchParams.get('limit') || '5',
    };

    // Validate parameters
    const parseResult = productSearchParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      const issues = parseResult.error.issues;
      return NextResponse.json(
        { error: issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { q, mode, brand_id, category_main, limit } = parseResult.data;

    // Validate required parameters based on mode
    if (mode === 'fuzzy' && !q) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required for fuzzy mode" },
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

    let results: ProductSearchResult[] = [];

    if (mode === 'fuzzy' && q) {
      results = await performFuzzySearch(supabase, q, { brand_id, category_main, limit });
    }

    const response: ProductSearchResponse = {
      results,
      query: q || '',
      mode,
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

/**
 * Perform fuzzy text search using ILIKE on catalog_products
 */
async function performFuzzySearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  options: { brand_id?: string; category_main?: string; limit: number }
): Promise<ProductSearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();

  let queryBuilder = supabase
    .from('catalog_products')
    .select(`
      id,
      name,
      category_main,
      subcategory,
      product_type,
      description,
      price_usd,
      weight_grams,
      brand_id,
      catalog_brands!catalog_products_brand_id_fkey (
        id,
        name
      )
    `)
    .ilike('name', `%${normalizedQuery}%`)
    .limit(options.limit);

  if (options.brand_id) {
    queryBuilder = queryBuilder.eq('brand_id', options.brand_id);
  }

  if (options.category_main) {
    queryBuilder = queryBuilder.eq('category_main', options.category_main);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Fuzzy search error:', error);
    return [];
  }

  return (data || []).map((product) => {
    const normalized = product.name.toLowerCase();
    const matchIndex = normalized.indexOf(normalizedQuery);
    const score = matchIndex === 0
      ? 0.9 + (0.1 * (normalizedQuery.length / normalized.length))
      : matchIndex > 0
        ? 0.5 + (0.3 * (normalizedQuery.length / normalized.length))
        : 0.3;

    return {
      id: product.id,
      name: product.name,
      brand: product.catalog_brands
        ? { id: product.catalog_brands.id, name: product.catalog_brands.name }
        : null,
      categoryMain: product.category_main,
      subcategory: product.subcategory,
      productType: product.product_type,
      description: product.description,
      priceUsd: product.price_usd,
      weightGrams: product.weight_grams,
      score: Math.round(score * 100) / 100,
    };
  }).sort((a, b) => b.score - a.score);
}
