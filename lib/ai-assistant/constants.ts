/**
 * AI Assistant Constants
 * Feature 050: AI Assistant
 *
 * Shared constants for AI assistant configuration and validation.
 */

/**
 * Maximum message length in characters
 * Applied to both streaming and non-streaming endpoints
 */
export const MAX_MESSAGE_LENGTH = 1000;

/**
 * Minimum message length in characters
 */
export const MIN_MESSAGE_LENGTH = 1;

/**
 * Rate limit: Maximum messages per hour for Trailblazer users
 */
export const RATE_LIMIT_MESSAGES_PER_HOUR = 30;

/**
 * Rate limit window in hours
 */
export const RATE_LIMIT_WINDOW_HOURS = 1;
