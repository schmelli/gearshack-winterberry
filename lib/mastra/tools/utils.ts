/**
 * Shared utilities for Mastra composite tools
 * Feature: 060-ai-agent-evolution
 */

/**
 * Extract userId from Mastra execution context
 *
 * @param executionContext - Mastra tool execution context
 * @returns userId string or null if not authenticated
 */
export function extractUserId(executionContext: unknown): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestContext = (executionContext as any)?.requestContext as Map<string, unknown> | undefined;
  return requestContext?.get('userId') as string | undefined || null;
}

/**
 * Extract currentLoadoutId from Mastra execution context
 *
 * @param executionContext - Mastra tool execution context
 * @returns currentLoadoutId string or null if not in loadout context
 */
export function extractCurrentLoadoutId(executionContext: unknown): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestContext = (executionContext as any)?.requestContext as Map<string, unknown> | undefined;
  return requestContext?.get('currentLoadoutId') as string | undefined || null;
}

/**
 * Format weight in grams to human-readable string
 *
 * @param grams - Weight in grams
 * @returns Formatted weight string (e.g., "1.23kg" or "450g")
 */
export function formatWeight(grams: number | null | undefined): string {
  if (grams == null || grams === 0) return '?';
  if (grams < 1000) return `${Math.round(grams)}g`;
  return `${(grams / 1000).toFixed(2)}kg`;
}

/**
 * Standard error response for composite tools
 */
export interface ToolErrorResponse {
  success: false;
  error: string;
}

/**
 * Create a standardized error response
 *
 * @param error - Error message
 * @returns Standardized error object
 */
export function createErrorResponse(error: string): ToolErrorResponse {
  return { success: false, error };
}
