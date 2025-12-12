/**
 * Loadout Types and Interfaces
 *
 * Feature: 005-loadout-management
 * Constitution: Types MUST be defined in @/types directory
 */

// =============================================================================
// Weight Thresholds for Color Coding
// =============================================================================

/** Maximum weight for ultralight category (grams) */
export const WEIGHT_THRESHOLDS = {
  ULTRALIGHT_MAX: 4500,
  MODERATE_MAX: 9000,
} as const;

// =============================================================================
// Weight Category Type
// =============================================================================

export type WeightCategory = 'ultralight' | 'moderate' | 'heavy';

// =============================================================================
// Activity and Season Types (Feature: 006-ui-makeover)
// =============================================================================

/** Activity type classification for loadout filtering (FR-007) */
export type ActivityType = 'hiking' | 'camping' | 'climbing' | 'skiing' | 'backpacking';

/** Season classification for loadout filtering (FR-008) */
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

/** Activity type labels for UI display */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  hiking: 'Hiking',
  camping: 'Camping',
  climbing: 'Climbing',
  skiing: 'Skiing',
  backpacking: 'Backpacking',
};

/** Season labels for UI display */
export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

// =============================================================================
// Sort Options (Feature: 017-loadouts-search-filter)
// =============================================================================

/** Sort options for loadout list */
export type LoadoutSortOption = 'date-newest' | 'date-oldest' | 'weight-lightest' | 'weight-heaviest';

/** Sort option labels for UI display */
export const SORT_OPTION_LABELS: Record<LoadoutSortOption, string> = {
  'date-newest': 'Date (Newest)',
  'date-oldest': 'Date (Oldest)',
  'weight-lightest': 'Weight (Lightest)',
  'weight-heaviest': 'Weight (Heaviest)',
};

// =============================================================================
// LoadoutItemState (NEW - Feature: 007-grand-polish-sprint)
// =============================================================================

/**
 * Per-item state within a loadout
 * Determines whether item contributes to Base Weight
 */
export interface LoadoutItemState {
  /** Reference to GearItem.id */
  itemId: string;

  /** Item is worn on body (clothing, shoes, watch) - excluded from Base Weight */
  isWorn: boolean;

  /** Item is consumable (food, fuel, water) - excluded from Base Weight */
  isConsumable: boolean;
}

// =============================================================================
// WeightSummary (NEW - Feature: 007-grand-polish-sprint)
// =============================================================================

/**
 * Computed weight summary for a loadout
 * Used in LoadoutHeader display
 */
export interface WeightSummary {
  /** Sum of all item weights in grams */
  totalWeight: number;

  /** Total minus worn and consumable items */
  baseWeight: number;

  /** Weight of worn items only */
  wornWeight: number;

  /** Weight of consumable items only */
  consumableWeight: number;
}

// =============================================================================
// Loadout Entity (Storage/Domain Model)
// =============================================================================

export interface Loadout {
  /** Unique identifier (UUID) */
  id: string;

  /** User-defined name for the loadout */
  name: string;

  /** Optional trip date for organization */
  tripDate: Date | null;

  /** Array of GearItem IDs included in this loadout */
  itemIds: string[];

  /** Optional activity types for classification (FR-007) */
  activityTypes?: ActivityType[];

  /** Optional seasons for classification (FR-008) */
  seasons?: Season[];

  /** Optional description for loadout context/notes (Feature: 007) */
  description: string | null;

  /** Per-item state for worn/consumable tracking (Feature: 007) */
  itemStates: LoadoutItemState[];

  /** Timestamp when loadout was created */
  createdAt: Date;

  /** Timestamp when loadout was last modified */
  updatedAt: Date;
}

// =============================================================================
// Form Data Types
// =============================================================================

/** Form data for creating/editing a loadout */
export interface LoadoutFormData {
  name: string;
  tripDate: string; // ISO date string for form input
  description: string; // Optional description (Feature: 007)
}

/** Default values for new loadout form */
export const DEFAULT_LOADOUT_FORM: LoadoutFormData = {
  name: '',
  tripDate: '',
  description: '',
};

// =============================================================================
// Computed/Derived Types
// =============================================================================

/** Aggregated weight data for visualization */
export interface CategoryWeight {
  /** Category ID from taxonomy */
  categoryId: string;

  /** Human-readable category label */
  categoryLabel: string;

  /** Total weight in grams for this category */
  totalWeightGrams: number;

  /** Number of items in this category */
  itemCount: number;

  /** Percentage of total loadout weight */
  percentage: number;
}

// =============================================================================
// Activity Priority Matrix Types (Feature: 009-grand-visual-polish)
// =============================================================================

/**
 * Priority scores for gear selection criteria.
 * Values 0-100 represent importance level for each dimension.
 */
export interface ActivityPriorities {
  /** Weight optimization priority (higher = lighter gear preferred) */
  weight: number;
  /** Comfort priority (higher = more comfort-focused) */
  comfort: number;
  /** Durability priority (higher = more rugged gear preferred) */
  durability: number;
  /** Safety priority (higher = safety-critical gear preferred) */
  safety: number;
}

/**
 * Matrix mapping activity types to their priority profiles.
 */
export type ActivityPriorityMatrix = Record<ActivityType, ActivityPriorities>;

// =============================================================================
// Dashboard Summary Types
// =============================================================================

/** Summary data for dashboard cards */
export interface LoadoutSummary {
  /** Loadout ID */
  id: string;

  /** Loadout name */
  name: string;

  /** Trip date (formatted for display) */
  tripDateFormatted: string | null;

  /** Total weight in grams */
  totalWeightGrams: number;

  /** Number of items */
  itemCount: number;

  /** Weight breakdown by category (for mini donut) */
  categoryWeights: CategoryWeight[];
}
