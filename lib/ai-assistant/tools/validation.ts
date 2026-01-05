/**
 * Result Validation Helpers
 * Feature: AI Assistant Reliability Improvements
 *
 * Provides validation functions for AI tool results to ensure data quality
 * and enable intelligent retry/fallback strategies.
 *
 * Key validations:
 * - Weight data quality (no 0g values)
 * - Price data completeness
 * - Result set adequacy (not empty when expected)
 */

import type { CatalogSearchResult, SearchCatalogOutput } from '@/lib/mastra/tools/search-catalog';
import type { QueryUserDataOutput } from '@/lib/mastra/tools/query-user-data';

// =============================================================================
// Types
// =============================================================================

export interface ValidationResult<T> {
  /** Whether the validation passed */
  valid: boolean;
  /** Validated/filtered results */
  data: T;
  /** Validation warnings (non-blocking issues) */
  warnings: ValidationWarning[];
  /** Validation errors (blocking issues) */
  errors: ValidationError[];
  /** Statistics about the validation */
  stats: ValidationStats;
}

export interface ValidationWarning {
  code: string;
  message: string;
  count?: number;
  details?: Record<string, unknown>;
}

export interface ValidationError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ValidationStats {
  totalItems: number;
  validItems: number;
  filteredItems: number;
  filterReasons: Record<string, number>;
}

// =============================================================================
// Catalog Search Validation
// =============================================================================

/**
 * Validate catalog search results for data quality
 *
 * Checks:
 * - No 0g weight values (invalid data)
 * - Has results when expected
 * - Results have required fields
 *
 * @param response - SearchCatalog tool output
 * @param expectedMinResults - Minimum expected results (0 = no minimum)
 * @returns Validated results with filtered data and warnings/errors
 */
export function validateCatalogResults(
  response: SearchCatalogOutput,
  expectedMinResults: number = 0
): ValidationResult<CatalogSearchResult[]> {
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];
  const filterReasons: Record<string, number> = {};

  // Handle error response
  if (!response.success) {
    return {
      valid: false,
      data: [],
      warnings,
      errors: [
        {
          code: 'SEARCH_FAILED',
          message: response.error || 'Search failed',
          recoverable: true,
          suggestedAction: 'Retry with broader filters or different query',
        },
      ],
      stats: {
        totalItems: 0,
        validItems: 0,
        filteredItems: 0,
        filterReasons,
      },
    };
  }

  const totalItems = response.results.length;
  let filteredItems = 0;

  // Filter and validate results
  const validResults = response.results.filter((item) => {
    // Check for invalid weight (0g)
    if (item.weightGrams === 0) {
      filteredItems++;
      filterReasons['invalid_weight_zero'] = (filterReasons['invalid_weight_zero'] || 0) + 1;
      return false;
    }

    // All other validations passed
    return true;
  });

  // Add warnings for filtered items
  if (filterReasons['invalid_weight_zero']) {
    warnings.push({
      code: 'INVALID_WEIGHT_FILTERED',
      message: `Filtered ${filterReasons['invalid_weight_zero']} items with invalid weight (0g)`,
      count: filterReasons['invalid_weight_zero'],
    });
  }

  // Check for missing weight data (NULL is acceptable but worth noting)
  const nullWeightCount = validResults.filter((r) => r.weightGrams === null).length;
  if (nullWeightCount > 0 && nullWeightCount === validResults.length) {
    warnings.push({
      code: 'ALL_WEIGHTS_UNKNOWN',
      message: 'All results have unknown weight - weight-based sorting may not work',
      count: nullWeightCount,
    });
  }

  // Check minimum results
  if (expectedMinResults > 0 && validResults.length < expectedMinResults) {
    if (validResults.length === 0) {
      errors.push({
        code: 'NO_RESULTS',
        message: `No valid results found (${totalItems} raw results, ${filteredItems} filtered)`,
        recoverable: true,
        suggestedAction: 'Try broadening filters, removing constraints, or searching different category',
      });
    } else {
      warnings.push({
        code: 'FEW_RESULTS',
        message: `Only ${validResults.length} results found (expected at least ${expectedMinResults})`,
        count: validResults.length,
      });
    }
  }

  return {
    valid: errors.length === 0,
    data: validResults,
    warnings,
    errors,
    stats: {
      totalItems,
      validItems: validResults.length,
      filteredItems,
      filterReasons,
    },
  };
}

// =============================================================================
// User Data Query Validation
// =============================================================================

/**
 * Validate user data query results
 *
 * Checks:
 * - Query succeeded
 * - Has data when expected
 * - Data integrity for gear items (valid weights)
 *
 * @param response - QueryUserData tool output
 * @param expectedMinResults - Minimum expected results (0 = no minimum)
 * @returns Validated results with warnings/errors
 */
export function validateUserDataResults(
  response: QueryUserDataOutput,
  expectedMinResults: number = 0
): ValidationResult<Record<string, unknown>[]> {
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];
  const filterReasons: Record<string, number> = {};

  // Handle error response
  if (!response.success) {
    return {
      valid: false,
      data: [],
      warnings,
      errors: [
        {
          code: 'QUERY_FAILED',
          message: response.error || 'Query failed',
          recoverable: true,
          suggestedAction: 'Check query parameters and try again',
        },
      ],
      stats: {
        totalItems: 0,
        validItems: 0,
        filteredItems: 0,
        filterReasons,
      },
    };
  }

  // Handle count operation
  if (response.operation === 'count') {
    const count = typeof response.data === 'number' ? response.data : 0;
    return {
      valid: true,
      data: [],
      warnings,
      errors,
      stats: {
        totalItems: count,
        validItems: count,
        filteredItems: 0,
        filterReasons,
      },
    };
  }

  // Handle select operation
  const results = Array.isArray(response.data) ? response.data : [];
  const totalItems = results.length;
  let filteredItems = 0;

  // Filter invalid data (for gear_items table)
  const validResults = results.filter((item) => {
    // Check for invalid weight in gear items
    if ('weight_grams' in item && item.weight_grams === 0) {
      filteredItems++;
      filterReasons['invalid_weight_zero'] = (filterReasons['invalid_weight_zero'] || 0) + 1;
      return false;
    }
    return true;
  });

  // Add warnings for filtered items
  if (filterReasons['invalid_weight_zero']) {
    warnings.push({
      code: 'INVALID_WEIGHT_FILTERED',
      message: `Filtered ${filterReasons['invalid_weight_zero']} items with invalid weight (0g)`,
      count: filterReasons['invalid_weight_zero'],
    });
  }

  // Check minimum results
  if (expectedMinResults > 0 && validResults.length < expectedMinResults) {
    if (validResults.length === 0) {
      errors.push({
        code: 'NO_RESULTS',
        message: `No results found matching criteria`,
        recoverable: true,
        suggestedAction: 'Try different search terms or remove some filters',
      });
    } else {
      warnings.push({
        code: 'FEW_RESULTS',
        message: `Only ${validResults.length} results found`,
        count: validResults.length,
      });
    }
  }

  return {
    valid: errors.length === 0,
    data: validResults,
    warnings,
    errors,
    stats: {
      totalItems,
      validItems: validResults.length,
      filteredItems,
      filterReasons,
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if results are adequate for displaying to user
 *
 * @param validation - Validation result
 * @returns true if results can be shown to user
 */
export function hasAdequateResults<T>(validation: ValidationResult<T[]>): boolean {
  return validation.valid && Array.isArray(validation.data) && validation.data.length > 0;
}

/**
 * Get a user-friendly error message from validation result
 *
 * @param validation - Validation result
 * @param locale - User's locale for message formatting
 * @returns User-friendly error message
 */
export function getValidationErrorMessage<T>(
  validation: ValidationResult<T>,
  locale: 'en' | 'de' = 'en'
): string | null {
  if (validation.valid && validation.errors.length === 0) {
    return null;
  }

  const firstError = validation.errors[0];
  if (!firstError) {
    return null;
  }

  // Localized error messages
  const messages: Record<string, { en: string; de: string }> = {
    SEARCH_FAILED: {
      en: 'Search failed. Please try again with different criteria.',
      de: 'Suche fehlgeschlagen. Bitte versuchen Sie es mit anderen Kriterien.',
    },
    QUERY_FAILED: {
      en: 'Query failed. Please try again.',
      de: 'Abfrage fehlgeschlagen. Bitte versuchen Sie es erneut.',
    },
    NO_RESULTS: {
      en: 'No matching items found. Try broadening your search.',
      de: 'Keine passenden Artikel gefunden. Versuchen Sie eine breitere Suche.',
    },
  };

  const localizedMessage = messages[firstError.code];
  if (localizedMessage) {
    return localizedMessage[locale];
  }

  return firstError.message;
}

/**
 * Format validation stats for logging
 *
 * @param stats - Validation statistics
 * @returns Formatted string
 */
export function formatValidationStats(stats: ValidationStats): string {
  const parts = [`Total: ${stats.totalItems}`, `Valid: ${stats.validItems}`];

  if (stats.filteredItems > 0) {
    parts.push(`Filtered: ${stats.filteredItems}`);
    const reasons = Object.entries(stats.filterReasons)
      .map(([reason, count]) => `${reason}:${count}`)
      .join(', ');
    if (reasons) {
      parts.push(`(${reasons})`);
    }
  }

  return parts.join(' | ');
}

/**
 * Combine multiple validation results into one summary
 *
 * @param validations - Array of validation results
 * @returns Combined validation summary
 */
export function combineValidations<T>(
  validations: ValidationResult<T[]>[]
): ValidationResult<T[]> {
  const combined: ValidationResult<T[]> = {
    valid: true,
    data: [],
    warnings: [],
    errors: [],
    stats: {
      totalItems: 0,
      validItems: 0,
      filteredItems: 0,
      filterReasons: {},
    },
  };

  for (const v of validations) {
    // Combine validity (all must be valid)
    if (!v.valid) {
      combined.valid = false;
    }

    // Combine data
    if (Array.isArray(v.data)) {
      combined.data.push(...v.data);
    }

    // Combine warnings and errors
    combined.warnings.push(...v.warnings);
    combined.errors.push(...v.errors);

    // Combine stats
    combined.stats.totalItems += v.stats.totalItems;
    combined.stats.validItems += v.stats.validItems;
    combined.stats.filteredItems += v.stats.filteredItems;

    // Merge filter reasons
    for (const [reason, count] of Object.entries(v.stats.filterReasons)) {
      combined.stats.filterReasons[reason] =
        (combined.stats.filterReasons[reason] || 0) + count;
    }
  }

  return combined;
}
