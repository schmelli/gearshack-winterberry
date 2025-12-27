/**
 * GET /api/catalog/products/search
 * Fuzzy search for products by name with optional brand filtering
 * Feature: 044-intelligence-integration
 *
 * Uses the catalog_products table synced from GearGraph.
 * Category hierarchy (categoryMain, subcategory, productType) is derived from
 * the categories table via product_type_id FK.
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
  productTypeId: string | null;
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

    // Query catalog_products with FK joins to catalog_brands and categories
    // The product_type_id references categories at level 3 (product type)
    let queryBuilder = supabase
      .from('catalog_products')
      .select(`
        id,
        name,
        product_type,
        product_type_id,
        weight_grams,
        price_usd,
        description,
        brand_id,
        catalog_brands!catalog_products_brand_id_fkey (
          id,
          name
        )
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

    // Collect all product_type_ids to fetch category hierarchy in batch
    const productTypeIds = (data || [])
      .map((p) => p.product_type_id)
      .filter((id): id is string => id !== null);

    // Fetch category hierarchy for all product types in one query
    // We need to get the full parent chain for each category
    const categoryMap = new Map<
      string,
      { categoryMain: string | null; subcategory: string | null; productType: string | null }
    >();

    if (productTypeIds.length > 0) {
      // Get all categories to build the hierarchy
      const { data: allCategories } = await supabase
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
