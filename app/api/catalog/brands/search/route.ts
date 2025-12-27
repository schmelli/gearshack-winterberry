/**
 * GET /api/catalog/brands/search
 * Fuzzy search for brands by name using pg_trgm similarity
 * Feature: 042-catalog-sync-api (US1), 044-intelligence-integration (US2)
 * Issue #87: Include user's custom brands from inventory
 *
 * Updated to use search_brands_fuzzy RPC function for typo-tolerant search.
 * Now also searches user's gear_items.brand for custom brands.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { brandSearchParamsSchema } from '@/lib/validations/catalog-schema';
import type { Database } from '@/types/database';
import type { BrandSearchResponse, BrandSearchResult } from '@/types/catalog';

// Type for the RPC function result
interface FuzzySearchResult {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  similarity: number;
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      q: searchParams.get('q') || '',
      limit: searchParams.get('limit') || '5',
    };

    // Validate parameters
    const parseResult = brandSearchParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      const issues = parseResult.error.issues;
      return NextResponse.json(
        { error: issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { q, limit } = parseResult.data;

    // Create Supabase client for authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Create public client for catalog search
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const publicSupabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

    // Search catalog brands using RPC function (if deployed)
    // Falls back to ILIKE if function doesn't exist
    let catalogResults: BrandSearchResult[] = [];

    // Use type assertion since search_brands_fuzzy is a custom function
    // not in the generated Supabase types
    const { data: rpcData, error: rpcError } = await (publicSupabase.rpc as CallableFunction)(
      'search_brands_fuzzy',
      {
        search_query: q,
        match_threshold: 0.3,
        result_limit: limit,
      }
    ) as { data: FuzzySearchResult[] | null; error: { message: string } | null };

    // If RPC fails OR returns no results, try fallback
    if (rpcError || !rpcData || rpcData.length === 0) {
      // Fallback to ILIKE search if RPC function not available
      const normalizedQuery = q.toLowerCase().trim();
      // Use ILIKE on 'name' column directly (case-insensitive) as most reliable fallback
      const { data: fallbackData, error: fallbackError } = await publicSupabase
        .from('catalog_brands')
        .select('id, name, logo_url, website_url')
        .ilike('name', `%${normalizedQuery}%`)
        .limit(limit);

      if (fallbackError) {
        console.error('Brand search fallback error:', fallbackError);
        return NextResponse.json(
          { error: 'Search failed' },
          { status: 500 }
        );
      }

      // Calculate simple similarity scores for fallback
      catalogResults = (fallbackData || []).map((brand) => {
        const normalized = brand.name.toLowerCase();
        const matchIndex = normalized.indexOf(normalizedQuery);
        const similarity = matchIndex === 0
          ? 0.9 + (0.1 * (normalizedQuery.length / normalized.length))
          : matchIndex > 0
            ? 0.5 + (0.3 * (normalizedQuery.length / normalized.length))
            : 0.3;

        return {
          id: brand.id,
          name: brand.name,
          logoUrl: brand.logo_url,
          websiteUrl: brand.website_url,
          similarity: Math.round(similarity * 100) / 100,
          source: 'catalog' as const,
        };
      });

      catalogResults.sort((a, b) => b.similarity - a.similarity);
    } else {
      // Use RPC results (already sorted by similarity)
      catalogResults = ((rpcData as FuzzySearchResult[]) || []).map((brand) => ({
        id: brand.id,
        name: brand.name,
        logoUrl: brand.logo_url,
        websiteUrl: brand.website_url,
        similarity: Math.round(brand.similarity * 100) / 100,
        source: 'catalog' as const,
      }));
    }

    // Issue #87: Search user's custom brands from gear_items if authenticated
    let inventoryResults: BrandSearchResult[] = [];
    if (user) {
      const normalizedQuery = q.toLowerCase().trim();

      // Get distinct brand names from user's gear items
      const { data: userBrands, error: userBrandsError } = await supabase
        .from('gear_items')
        .select('brand')
        .eq('user_id', user.id)
        .not('brand', 'is', null)
        .ilike('brand', `%${normalizedQuery}%`);

      if (!userBrandsError && userBrands) {
        // Extract unique brand names
        const uniqueBrands = Array.from(
          new Set(userBrands.map(item => item.brand).filter((b): b is string => b !== null))
        );

        // Calculate similarity scores for user brands
        inventoryResults = uniqueBrands.map((brandName) => {
          const normalized = brandName.toLowerCase();
          const matchIndex = normalized.indexOf(normalizedQuery);
          const similarity = matchIndex === 0
            ? 0.9 + (0.1 * (normalizedQuery.length / normalized.length))
            : matchIndex > 0
              ? 0.5 + (0.3 * (normalizedQuery.length / normalized.length))
              : 0.3;

          return {
            id: `inventory-${brandName.toLowerCase().replace(/\s+/g, '-')}`,
            name: brandName,
            logoUrl: null,
            websiteUrl: null,
            similarity: Math.round(similarity * 100) / 100,
            source: 'inventory' as const,
          };
        });

        inventoryResults.sort((a, b) => b.similarity - a.similarity);
      }
    }

    // Merge results: deduplicate (prefer catalog version), then sort
    const brandNameSet = new Set<string>();
    const results: BrandSearchResult[] = [];

    // Add catalog brands first (they have logos and URLs)
    for (const catalogBrand of catalogResults) {
      const normalizedName = catalogBrand.name.toLowerCase();
      if (!brandNameSet.has(normalizedName)) {
        brandNameSet.add(normalizedName);
        results.push(catalogBrand);
      }
    }

    // Add inventory brands that don't exist in catalog
    for (const inventoryBrand of inventoryResults) {
      const normalizedName = inventoryBrand.name.toLowerCase();
      if (!brandNameSet.has(normalizedName)) {
        brandNameSet.add(normalizedName);
        results.push(inventoryBrand);
      }
    }

    // Sort by similarity (exact matches first), then by source (catalog before inventory)
    results.sort((a, b) => {
      if (a.similarity !== b.similarity) {
        return b.similarity - a.similarity;
      }
      // If similarity is equal, prefer catalog brands
      return a.source === 'catalog' ? -1 : 1;
    });

    // Limit final results
    const limitedResults = results.slice(0, limit);

    const response: BrandSearchResponse = {
      results: limitedResults,
      query: q,
      count: limitedResults.length,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Brand search error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
