/**
 * Loadout Constants
 *
 * Feature: 047-loadout-creation-form
 * Single source of truth for loadout-related constants
 */

// =============================================================================
// Season Constants
// =============================================================================

/** All available seasons for loadout classification */
export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;

// =============================================================================
// Activity Type Constants
// =============================================================================

/** All available activity types for loadout classification */
export const ACTIVITIES = [
  'hiking',
  'camping',
  'climbing',
  'skiing',
  'backpacking',
] as const;
