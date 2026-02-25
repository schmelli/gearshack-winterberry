/**
 * VIP Feature Constants
 *
 * Feature: 052-vip-loadouts
 *
 * Centralized constants for VIP feature configuration.
 */

// =============================================================================
// Claim Invitation Constants
// =============================================================================

/**
 * Length of claim invitation tokens in bytes (produces 64 hex characters)
 */
export const CLAIM_TOKEN_BYTES = 32;

/**
 * Number of days until a claim invitation expires
 */
export const CLAIM_INVITATION_EXPIRY_DAYS = 30;

// =============================================================================
// Pagination Constants
// =============================================================================

/**
 * Default number of VIPs to return in directory listing
 */
export const DEFAULT_VIP_LIST_LIMIT = 20;

/**
 * Maximum number of VIPs that can be requested in a single query
 */
export const MAX_VIP_LIST_LIMIT = 50;

/**
 * Default number of featured VIPs to show
 */
export const DEFAULT_FEATURED_LIMIT = 6;

/**
 * Maximum number of featured VIPs that can be requested
 */
export const MAX_FEATURED_LIMIT = 12;
