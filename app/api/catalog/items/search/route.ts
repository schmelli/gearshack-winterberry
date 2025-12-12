/**
 * GET /api/catalog/items/search
 * Fuzzy, semantic, and hybrid search for catalog items
 * Feature: 042-catalog-sync-api (US1, US2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { itemSearchParamsSchema } from '@/lib/validations/catalog-schema';
import type { Database } from '@/types/database';
import type { ItemSearchResponse, ItemSearchResult } from '@/types/catalog';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      q: searchParams.get('q') || undefined,
      embedding: searchParams.get('embedding') || undefined,
      mode: searchParams.get('mode') || 'fuzzy',
      weight_text: searchParams.get('weight_text') || '0.7',
      brand_id: searchParams.get('brand_id') || undefined,
      category: searchParams.get('category') || undefined,
      limit: searchParams.get('limit') || '5',
    };

    // Validate parameters
    const parseResult = itemSearchParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      const issues = parseResult.error.issues;
      return NextResponse.json(
        { error: issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { q, embedding, mode, weight_text, brand_id, category, limit } = parseResult.data;

    // Validate required parameters based on mode
    if ((mode === 'fuzzy' || mode === 'hybrid') && !q) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required for fuzzy and hybrid modes" },
        { status: 400 }
      );
    }

    if ((mode === 'semantic' || mode === 'hybrid') && !embedding) {
      return NextResponse.json(
        { error: "Query parameter 'embedding' is required for semantic and hybrid modes" },
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

    let results: ItemSearchResult[] = [];

    if (mode === 'fuzzy' && q) {
      results = await performFuzzySearch(supabase, q, { brand_id, category, limit });
    } else if (mode === 'semantic' && embedding) {
      const embeddingArray = decodeEmbedding(embedding);
      if (!embeddingArray) {
        return NextResponse.json(
          { error: 'Invalid embedding format' },
          { status: 400 }
        );
      }
      results = await performSemanticSearch(supabase, embeddingArray, { brand_id, category, limit });
    } else if (mode === 'hybrid' && q && embedding) {
      const embeddingArray = decodeEmbedding(embedding);
      if (!embeddingArray) {
        return NextResponse.json(
          { error: 'Invalid embedding format' },
          { status: 400 }
        );
      }
      results = await performHybridSearch(supabase, q, embeddingArray, { weight_text, brand_id, category, limit });
    }

    const response: ItemSearchResponse = {
      results,
      query: q || '',
      mode,
      count: results.length,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Item search error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Decode base64-encoded embedding to number array
 */
function decodeEmbedding(base64: string): number[] | null {
  try {
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed) && parsed.length === 1536 && parsed.every((n) => typeof n === 'number')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Perform fuzzy text search using ILIKE
 */
async function performFuzzySearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  options: { brand_id?: string; category?: string; limit: number }
): Promise<ItemSearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();

  let queryBuilder = supabase
    .from('catalog_items')
    .select(`
      id,
      name,
      name_normalized,
      category,
      description,
      specs_summary,
      brand_id,
      catalog_brands!catalog_items_brand_id_fkey (
        id,
        name
      )
    `)
    .ilike('name_normalized', `%${normalizedQuery}%`)
    .limit(options.limit);

  if (options.brand_id) {
    queryBuilder = queryBuilder.eq('brand_id', options.brand_id);
  }

  if (options.category) {
    queryBuilder = queryBuilder.eq('category', options.category);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Fuzzy search error:', error);
    return [];
  }

  return (data || []).map((item) => {
    const normalized = item.name_normalized || item.name.toLowerCase();
    const matchIndex = normalized.indexOf(normalizedQuery);
    const score = matchIndex === 0
      ? 0.9 + (0.1 * (normalizedQuery.length / normalized.length))
      : matchIndex > 0
        ? 0.5 + (0.3 * (normalizedQuery.length / normalized.length))
        : 0.3;

    return {
      id: item.id,
      name: item.name,
      brand: item.catalog_brands
        ? { id: item.catalog_brands.id, name: item.catalog_brands.name }
        : null,
      category: item.category,
      description: item.description,
      specsSummary: item.specs_summary,
      score: Math.round(score * 100) / 100,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Perform semantic search using vector embeddings
 * Note: Requires search_items_semantic RPC function in database
 * For MVP, returns empty results until RPC is created
 */
async function performSemanticSearch(
  _supabase: ReturnType<typeof createClient<Database>>,
  _embedding: number[],
  _options: { brand_id?: string; category?: string; limit: number }
): Promise<ItemSearchResult[]> {
  // MVP: Return empty results until semantic search RPC is implemented
  // When RPC is ready, uncomment below and remove placeholder
  console.warn('Semantic search RPC not yet implemented, returning empty results');
  return [];

  /*
  // Future implementation when RPC is available:
  try {
    const { data, error } = await supabase.rpc('search_items_semantic', {
      query_embedding: embedding,
      brand_filter: options.brand_id || null,
      category_filter: options.category || null,
      result_limit: options.limit,
    });

    if (error) {
      console.warn('Semantic search RPC error:', error.message);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand_id && item.brand_name
        ? { id: item.brand_id, name: item.brand_name }
        : null,
      category: item.category,
      description: item.description,
      specsSummary: item.specs_summary,
      score: item.similarity,
    }));
  } catch {
    return [];
  }
  */
}

/**
 * Perform hybrid search combining fuzzy and semantic
 * Note: Requires search_items_hybrid RPC function in database
 * For MVP, falls back to fuzzy search
 */
async function performHybridSearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  _embedding: number[],
  options: { weight_text: number; brand_id?: string; category?: string; limit: number }
): Promise<ItemSearchResult[]> {
  // MVP: Fall back to fuzzy search until hybrid RPC is implemented
  console.warn('Hybrid search RPC not yet implemented, falling back to fuzzy search');
  return performFuzzySearch(supabase, query, options);

  /*
  // Future implementation when RPC is available:
  try {
    const { data, error } = await supabase.rpc('search_items_hybrid', {
      search_query: query.toLowerCase().trim(),
      query_embedding: embedding,
      text_weight: options.weight_text,
      brand_filter: options.brand_id || null,
      category_filter: options.category || null,
      result_limit: options.limit,
    });

    if (error) {
      console.warn('Hybrid search RPC error, falling back to fuzzy:', error.message);
      return performFuzzySearch(supabase, query, options);
    }

    return (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand_id && item.brand_name
        ? { id: item.brand_id, name: item.brand_name }
        : null,
      category: item.category,
      description: item.description,
      specsSummary: item.specs_summary,
      score: item.score,
    }));
  } catch {
    return performFuzzySearch(supabase, query, options);
  }
  */
}
