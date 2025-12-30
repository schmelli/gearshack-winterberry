/**
 * GET /api/catalog/items/search
 * Fuzzy search for catalog products
 * Feature: 042-catalog-sync-api (US1, US2)
 *
 * Note: Uses catalog_products table (not catalog_items) per actual database schema
 * Category hierarchy (categoryMain, subcategory, productType) is derived from
 * the categories table via product_type_id FK.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { productSearchParamsSchema } from '@/lib/validations/catalog-schema';
import type { Database } from '@/types/database';
import type { ProductSearchResponse, ProductSearchResult } from '@/types/catalog';

// Type for category with parent chain
interface CategoryWithParent {
  id: string;
  label: string;
  slug: string;
  level: number;
  parent_id: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      q: searchParams.get('q') || undefined,
      mode: searchParams.get('mode') || 'fuzzy',
      brand_id: searchParams.get('brand_id') || undefined,
      product_type_id: searchParams.get('product_type_id') || undefined,
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

    const { q, mode, brand_id, product_type_id, limit } = parseResult.data;

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
      results = await performFuzzySearch(supabase, q, { brand_id, product_type_id, limit });
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
 * Derives category hierarchy from the categories table via product_type_id
 */
async function performFuzzySearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  options: { brand_id?: string; product_type_id?: string; limit: number }
): Promise<ProductSearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();

  let queryBuilder = supabase
    .from('catalog_products')
    .select(`
      id,
      name,
      product_type,
      product_type_id,
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

  if (options.product_type_id) {
    queryBuilder = queryBuilder.eq('product_type_id', options.product_type_id);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Fuzzy search error:', error);
    return [];
  }

  // Collect all product_type_ids to fetch category hierarchy in batch
  const productTypeIds = (data || [])
    .map((p) => p.product_type_id)
    .filter((id): id is string => id !== null);

  // Fetch category hierarchy for all product types in one query
  const categoryMap = new Map<
    string,
    { categoryMain: string | null; subcategory: string | null; productType: string | null }
  >();

  if (productTypeIds.length > 0) {
    // Get all categories to build the hierarchy
    const { data: allCategories } = await (supabase as any)
      .from('categories')
      .select('id, label, slug, level, parent_id')
      .order('level');

    if (allCategories) {
      // Build a lookup map by ID
      const catById = new Map<string, CategoryWithParent>();
      for (const cat of allCategories) {
        catById.set(cat.id, cat);
      }

      // For each product_type_id, walk up the tree to find subcategory and main category
      for (const ptId of productTypeIds) {
        const productTypeCat = catById.get(ptId);
        if (!productTypeCat) continue;

        let categoryMain: string | null = null;
        let subcategory: string | null = null;
        const productType = productTypeCat.label;

        // Walk up the parent chain
        if (productTypeCat.parent_id) {
          const subcategoryCat = catById.get(productTypeCat.parent_id);
          if (subcategoryCat) {
            subcategory = subcategoryCat.label;
            if (subcategoryCat.parent_id) {
              const mainCat = catById.get(subcategoryCat.parent_id);
              if (mainCat) {
                categoryMain = mainCat.label;
              }
            }
          }
        }

        categoryMap.set(ptId, { categoryMain, subcategory, productType });
      }
    }
  }

  return (data || []).map((product) => {
    const normalized = product.name.toLowerCase();
    const matchIndex = normalized.indexOf(normalizedQuery);
    const score = matchIndex === 0
      ? 0.9 + (0.1 * (normalizedQuery.length / normalized.length))
      : matchIndex > 0
        ? 0.5 + (0.3 * (normalizedQuery.length / normalized.length))
        : 0.3;

    // Get category hierarchy from the map, or fallback to product_type TEXT field
    const categoryInfo = product.product_type_id
      ? categoryMap.get(product.product_type_id)
      : null;

    return {
      id: product.id,
      name: product.name,
      brand: product.catalog_brands
        ? { id: product.catalog_brands.id, name: product.catalog_brands.name }
        : null,
      categoryMain: categoryInfo?.categoryMain ?? null,
      subcategory: categoryInfo?.subcategory ?? null,
      productType: categoryInfo?.productType ?? product.product_type,
      productTypeId: product.product_type_id,
      description: product.description,
      priceUsd: product.price_usd,
      weightGrams: product.weight_grams,
      score: Math.round(score * 100) / 100,
    };
  }).sort((a, b) => b.score - a.score);
}
