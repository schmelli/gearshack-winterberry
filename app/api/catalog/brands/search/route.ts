/**
 * GET /api/catalog/brands/search
 * Fuzzy search for brands by name using pg_trgm similarity
 * Feature: 042-catalog-sync-api (US1), 044-intelligence-integration (US2)
 *
 * Updated to use search_brands_fuzzy RPC function for typo-tolerant search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

    // Try fuzzy search using RPC function (if deployed)
    // Falls back to ILIKE if function doesn't exist
    let results: BrandSearchResult[] = [];

    // Use type assertion since search_brands_fuzzy is a custom function
    // not in the generated Supabase types
    const { data: rpcData, error: rpcError } = await (supabase.rpc as CallableFunction)(
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
      const { data: fallbackData, error: fallbackError } = await supabase
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
      results = (fallbackData || []).map((brand) => {
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
        };
      });

      results.sort((a, b) => b.similarity - a.similarity);
    } else {
      // Use RPC results (already sorted by similarity)
      results = ((rpcData as FuzzySearchResult[]) || []).map((brand) => ({
        id: brand.id,
        name: brand.name,
        logoUrl: brand.logo_url,
        websiteUrl: brand.website_url,
        similarity: Math.round(brand.similarity * 100) / 100,
      }));
    }

    const response: BrandSearchResponse = {
      results,
      query: q,
      count: results.length,
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
