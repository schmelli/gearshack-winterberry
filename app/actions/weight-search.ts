/**
 * Weight Search Server Action
 *
 * Feature: XXX-weight-lookup
 * Searches the web for product weight specifications using Serper.dev API.
 * Parses weight values from search results and returns the most common weight in grams.
 */

'use server';

// =============================================================================
// Types
// =============================================================================

export interface WeightSearchResult {
  /** Weight in grams */
  weightGrams: number;
  /** Confidence level based on how many sources agree */
  confidence: 'high' | 'medium' | 'low';
  /** Number of sources that reported this weight */
  sourceCount: number;
  /** Original unit the weight was found in */
  originalUnit: 'g' | 'kg' | 'oz' | 'lb';
  /** Original value before conversion */
  originalValue: number;
}

interface SerperSearchResponse {
  organic: Array<{
    title: string;
    snippet: string;
    link: string;
  }>;
  knowledgeGraph?: {
    title?: string;
    description?: string;
    attributes?: Record<string, string>;
  };
}

interface ParsedWeight {
  grams: number;
  originalValue: number;
  originalUnit: 'g' | 'kg' | 'oz' | 'lb';
}

// =============================================================================
// Weight Parsing Utilities
// =============================================================================

/**
 * Convert weight to grams based on unit
 */
function convertToGrams(value: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();

  if (normalizedUnit === 'g' || normalizedUnit === 'grams' || normalizedUnit === 'gram') {
    return value;
  }
  if (normalizedUnit === 'kg' || normalizedUnit === 'kilograms' || normalizedUnit === 'kilogram') {
    return value * 1000;
  }
  if (normalizedUnit === 'oz' || normalizedUnit === 'ounces' || normalizedUnit === 'ounce') {
    return Math.round(value * 28.3495);
  }
  if (normalizedUnit === 'lb' || normalizedUnit === 'lbs' || normalizedUnit === 'pounds' || normalizedUnit === 'pound') {
    return Math.round(value * 453.592);
  }

  // Default assume grams
  return value;
}

/**
 * Determine the original unit type for the result
 */
function getUnitType(unit: string): 'g' | 'kg' | 'oz' | 'lb' {
  const normalizedUnit = unit.toLowerCase().trim();

  if (normalizedUnit === 'kg' || normalizedUnit === 'kilograms' || normalizedUnit === 'kilogram') {
    return 'kg';
  }
  if (normalizedUnit === 'oz' || normalizedUnit === 'ounces' || normalizedUnit === 'ounce') {
    return 'oz';
  }
  if (normalizedUnit === 'lb' || normalizedUnit === 'lbs' || normalizedUnit === 'pounds' || normalizedUnit === 'pound') {
    return 'lb';
  }
  return 'g';
}

/**
 * Parse weight values from text
 * Matches patterns like: "450g", "1.2 kg", "16 oz", "2.5 lbs", "Weight: 450 grams"
 */
function parseWeightsFromText(text: string): ParsedWeight[] {
  const weights: ParsedWeight[] = [];

  // Patterns to match weight specifications
  const patterns = [
    // "450g" or "450 g" or "450 grams"
    /(\d+(?:\.\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)\b/gi,
    // "Weight: 450g" or "Weight 450 grams"
    /weight[:\s]+(\d+(?:\.\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)\b/gi,
    // "weighs 450g"
    /weighs?\s+(\d+(?:\.\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)\b/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      const unit = match[2];

      // Skip unreasonable weights (< 1g or > 50kg for gear items)
      const grams = convertToGrams(value, unit);
      if (grams >= 1 && grams <= 50000) {
        weights.push({
          grams,
          originalValue: value,
          originalUnit: getUnitType(unit),
        });
      }
    }
  }

  return weights;
}

/**
 * Find the most common weight from a list of parsed weights
 * Groups weights within 5% tolerance as the same weight
 */
function findMostCommonWeight(weights: ParsedWeight[]): { weight: ParsedWeight; count: number } | null {
  if (weights.length === 0) return null;

  // Group weights within 5% tolerance
  const groups: { representative: ParsedWeight; members: ParsedWeight[] }[] = [];

  for (const weight of weights) {
    let foundGroup = false;

    for (const group of groups) {
      const diff = Math.abs(weight.grams - group.representative.grams);
      const tolerance = group.representative.grams * 0.05; // 5% tolerance

      if (diff <= tolerance) {
        group.members.push(weight);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push({ representative: weight, members: [weight] });
    }
  }

  // Find largest group
  let largestGroup = groups[0];
  for (const group of groups) {
    if (group.members.length > largestGroup.members.length) {
      largestGroup = group;
    }
  }

  // Use the median weight from the largest group
  const sortedMembers = largestGroup.members.sort((a, b) => a.grams - b.grams);
  const medianIndex = Math.floor(sortedMembers.length / 2);

  return {
    weight: sortedMembers[medianIndex],
    count: largestGroup.members.length,
  };
}

// =============================================================================
// Server Action
// =============================================================================

export async function searchProductWeight(query: string): Promise<WeightSearchResult | null> {
  // Validate API key exists
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('[Weight Search] SERPER_API_KEY not configured');
    throw new Error('Weight search is temporarily unavailable. Please try again later.');
  }

  // Validate query
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return null;
  }

  try {
    // Search for product weight/specs
    const searchQuery = `${trimmedQuery} weight specifications`;

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10, // Get more results for better accuracy
      }),
    });

    if (!response.ok) {
      console.error('[Weight Search] API error:', response.status, response.statusText);
      throw new Error('Weight search is temporarily unavailable. Please try again later.');
    }

    const data: SerperSearchResponse = await response.json();

    // Collect all weights from search results
    const allWeights: ParsedWeight[] = [];

    // Check knowledge graph first (often has accurate specs)
    if (data.knowledgeGraph?.attributes) {
      const attributes = data.knowledgeGraph.attributes;
      for (const [key, value] of Object.entries(attributes)) {
        if (key.toLowerCase().includes('weight')) {
          allWeights.push(...parseWeightsFromText(value));
        }
      }
    }

    // Parse weights from organic results
    for (const result of data.organic || []) {
      // Check title
      allWeights.push(...parseWeightsFromText(result.title));
      // Check snippet (description)
      allWeights.push(...parseWeightsFromText(result.snippet));
    }

    // Find the most common weight
    const mostCommon = findMostCommonWeight(allWeights);

    if (!mostCommon) {
      console.log('[Weight Search] No weights found for:', trimmedQuery);
      return null;
    }

    // Determine confidence based on source count
    let confidence: 'high' | 'medium' | 'low';
    if (mostCommon.count >= 3) {
      confidence = 'high';
    } else if (mostCommon.count >= 2) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    console.log('[Weight Search] Found weight:', {
      query: trimmedQuery,
      grams: mostCommon.weight.grams,
      sources: mostCommon.count,
      confidence,
    });

    return {
      weightGrams: Math.round(mostCommon.weight.grams),
      confidence,
      sourceCount: mostCommon.count,
      originalUnit: mostCommon.weight.originalUnit,
      originalValue: mostCommon.weight.originalValue,
    };
  } catch (error) {
    // Preserve existing error message if already thrown
    if (error instanceof Error && error.message.includes('temporarily unavailable')) {
      throw error;
    }

    // Network error or other fetch failure
    console.error('[Weight Search] Request failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Weight search failed: ${errorMessage}`);
  }
}
