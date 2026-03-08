/**
 * GET /api/catalog/products/search
 * Fuzzy search for products by name with optional brand filtering
 * Feature: 044-intelligence-integration
 *
 * Uses the catalog_products table synced from GearGraph.
 * Category hierarchy (categoryMain, subcategory, productType) is derived from
 * the categories table via product_type_id FK.
 *
 * If catalog_products table is empty or unavailable, falls back to searching
 * the user's own gear_items for product name suggestions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

// Public endpoint - no authentication required
export const dynamic = 'force-dynamic';

// Response types
interface ProductSearchResult {
  id: string;
  name: string;
  brand: { id: string; name: string; websiteUrl: string | null } | null;
  categoryMain: string | null;
  subcategory: string | null;
  productType: string | null;
  productTypeId: string | null;
  weightGrams: number | null;
  priceUsd: number | null;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
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
    const brandIdParam = searchParams.get('brand_id') || undefined;
    const brandNameParam = searchParams.get('brand_name') || undefined;
    const limitParam = searchParams.get('limit') || '8';
    const parsedLimit = parseInt(limitParam, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 8;

    // Determine brand filtering strategy:
    // 1. If brand_name is provided, use it for ILIKE filtering (most reliable)
    // 2. If brand_id is a catalog UUID (not starting with 'inventory-'), use exact match
    // 3. If brand_id is an inventory format, try to extract brand name as fallback
    let catalogBrandId: string | undefined;
    let brandNameFilter: string | undefined;

    if (brandNameParam) {
      // Preferred: use explicit brand name for ILIKE filtering
      brandNameFilter = brandNameParam.toLowerCase().trim();
    } else if (brandIdParam) {
      if (brandIdParam.startsWith('inventory-')) {
        // Extract brand name from inventory format: inventory-{userId}-{brandName}
        const parts = brandIdParam.split('-');
        if (parts.length >= 3) {
          // Skip 'inventory' and userId, join remaining parts with spaces
          brandNameFilter = parts.slice(2).join(' ');
        }
      } else {
        // Catalog UUID - use for exact match on brand_id FK
        catalogBrandId = brandIdParam;
      }
    }

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
    // Escape ILIKE special characters to prevent injection
    // Order matters: escape backslash first, then wildcards
    const normalizedQuery = q.toLowerCase().trim()
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');

    // Query catalog_products with FK joins to catalog_brands and categories
    // The product_type_id references categories at level 3 (product type)
    let queryBuilder = supabase
      .from('catalog_products')
      .select(`
        id,
        name,
        product_type,
        product_type_id,
        product_url,
        image_url,
        weight_grams,
        price_usd,
        description,
        brand_id,
        catalog_brands!catalog_products_brand_id_fkey (
          id,
          name,
          website_url
        )
      `)
      .ilike('name', `%${normalizedQuery}%`)
      .limit(limit);

    // Filter by brand if a catalog brand ID was provided (UUID format)
    if (catalogBrandId) {
      queryBuilder = queryBuilder.eq('brand_id', catalogBrandId);
    }

    const { data, error } = await queryBuilder;

    // If catalog search fails (table doesn't exist) or returns empty,
    // fall back to searching user's own gear_items
    if (error || !data || data.length === 0) {
      // Catalog products unavailable, falling back to user inventory search

      // Try to get authenticated user for inventory fallback
      const authSupabase = await createServerClient();
      const { data: { user } } = await authSupabase.auth.getUser();

      if (user) {
        // Build inventory query with optional brand filtering
        let inventoryQuery = authSupabase
          .from('gear_items')
          .select(`
            id,
            name,
            brand,
            weight_grams,
            product_type_id,
            description
          `)
          .eq('user_id', user.id)
          .not('name', 'is', null)
          .ilike('name', `%${normalizedQuery}%`);

        // Filter by brand name if we have a brand name filter
        if (brandNameFilter) {
          // Escape ILIKE special characters in brand filter
          const escapedBrandFilter = brandNameFilter
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_');
          inventoryQuery = inventoryQuery.ilike('brand', `%${escapedBrandFilter}%`);
        }

        const { data: inventoryItems, error: invError } = await inventoryQuery.limit(limit);

        if (!invError && inventoryItems && inventoryItems.length > 0) {
          // Deduplicate by name (keep first occurrence)
          const seenNames = new Set<string>();
          const uniqueItems = inventoryItems.filter((item) => {
            const nameLower = item.name?.toLowerCase() || '';
            if (seenNames.has(nameLower)) return false;
            seenNames.add(nameLower);
            return true;
          });

          const inventoryResults: ProductSearchResult[] = uniqueItems.map((item) => {
            const nameLower = (item.name || '').toLowerCase();
            const matchIndex = nameLower.indexOf(normalizedQuery);
            const score =
              matchIndex === 0
                ? 0.9 + 0.1 * (normalizedQuery.length / nameLower.length)
                : matchIndex > 0
                  ? 0.5 + 0.3 * (normalizedQuery.length / nameLower.length)
                  : 0.3;

            return {
              id: `inventory-${item.id}`,
              name: item.name || '',
              brand: item.brand ? { id: `inv-brand-${item.brand}`, name: item.brand, websiteUrl: null } : null,
              categoryMain: null,
              subcategory: null,
              productType: null,
              productTypeId: item.product_type_id || null,
              weightGrams: item.weight_grams || null,
              priceUsd: null,
              description: item.description || null,
              productUrl: null,
              imageUrl: null,
              score: Math.round(score * 100) / 100,
            };
          });

          inventoryResults.sort((a, b) => b.score - a.score);

          return NextResponse.json({
            results: inventoryResults,
            query: q,
            count: inventoryResults.length,
            source: 'inventory',
          });
        }
      }

      // No catalog and no inventory results
      if (error) {
        console.error('Product search error:', error);
      }

      // Return empty results rather than error (graceful degradation)
      return NextResponse.json({
        results: [],
        query: q,
        count: 0,
      });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- categories table not in generated types
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
          ? {
              id: product.catalog_brands.id,
              name: product.catalog_brands.name,
              websiteUrl: product.catalog_brands.website_url || null,
            }
          : null,
        categoryMain: categoryInfo?.categoryMain ?? null,
        subcategory: categoryInfo?.subcategory ?? null,
        productType: categoryInfo?.productType ?? product.product_type,
        productTypeId: product.product_type_id,
        // DB stores 0 for "unknown" — normalize to null for consumers
        weightGrams: product.weight_grams && product.weight_grams > 0 ? product.weight_grams : null,
        priceUsd: product.price_usd && product.price_usd > 0 ? product.price_usd : null,
        description: product.description || null,
        productUrl: product.product_url || null,
        imageUrl: product.image_url || null,
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

    // Cache catalog search results for 1 hour (public data)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('Product search error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
