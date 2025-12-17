/**
 * Fuzzy matching logic for product name matching
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

import { createClient } from '@/lib/supabase/client';
import type { FuzzyMatch } from '@/types/price-tracking';

/**
 * Find fuzzy matches using Supabase fuzzy_search_products RPC
 */
export async function findFuzzyMatches(
  itemName: string,
  threshold: number = 0.3
): Promise<{ type: 'auto_match' | 'requires_confirmation'; matches: FuzzyMatch[] }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('fuzzy_search_products', {
    search_query: itemName,
    similarity_threshold: threshold,
  });

  if (error) {
    console.error('Fuzzy search error:', error);
    throw new Error(`Failed to find fuzzy matches: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { type: 'requires_confirmation', matches: [] };
  }

  // Map to FuzzyMatch type and use correct field name
  const matches: FuzzyMatch[] = data.map(item => ({
    product_name: item.name,
    similarity: item.similarity_score,
    source_name: 'Catalog',
    source_url: `/gear/${item.gear_item_id}`,
    price_amount: 0, // Not available from catalog search
  }));

  // High confidence: similarity > 0.7
  if (matches[0].similarity > 0.7) {
    return {
      type: 'auto_match',
      matches: [matches[0]],
    };
  }

  // Ambiguous: 0.3 < similarity < 0.7
  return {
    type: 'requires_confirmation',
    matches: matches.slice(0, 5), // Return top 5 matches
  };
}

/**
 * Calculate text similarity score using Levenshtein distance
 * (Fallback for client-side filtering)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}
