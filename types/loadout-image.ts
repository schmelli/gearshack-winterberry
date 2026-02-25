/**
 * Loadout Image Generation Types
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Types MUST be defined in @/types directory
 */

// =============================================================================
// Generation State Machine
// =============================================================================

/**
 * State for image generation workflow
 */
export type ImageGenerationStatus =
  | 'idle'          // No generation in progress
  | 'generating'    // Initial API call in progress
  | 'retrying'      // Automatic retry after failure
  | 'success'       // Generation completed successfully
  | 'error'         // Permanent failure (after retry)
  | 'fallback';     // Using curated default image

/**
 * State tracking for image generation operations
 */
export interface ImageGenerationState {
  status: ImageGenerationStatus;
  progress?: number; // 0-100 percentage (if available from API)
  error?: string;
  generatedImageId?: string;
}

// =============================================================================
// Generated Image Entity
// =============================================================================

/**
 * Represents a single AI-generated image for a loadout
 * Maps to generated_images table
 */
export interface GeneratedLoadoutImage {
  /** Unique identifier */
  id: string;

  /** Parent loadout reference */
  loadoutId: string;

  /** Cloudinary public_id for asset management */
  cloudinaryPublicId: string;

  /** Full HTTPS URL to the image on Cloudinary CDN */
  cloudinaryUrl: string;

  /** The exact prompt used to generate this image */
  promptUsed: string;

  /** Style preferences applied (null for basic generations) */
  stylePreferences: StylePreferences | null;

  /** When this image was generated (for history ordering) */
  generationTimestamp: Date;

  /** Descriptive alt-text for screen readers */
  altText: string | null;

  /** True if this is the active hero image for the loadout */
  isActive: boolean;

  /** Record creation timestamp */
  createdAt: Date;
}

// =============================================================================
// Style Preferences (P3 Feature)
// =============================================================================

/**
 * User-selected style preferences for image generation
 */
export interface StylePreferences {
  /** Visual style template */
  template?: 'cinematic' | 'documentary' | 'magazine' | 'instagram';

  /** Time of day for lighting */
  timeOfDay?: 'golden_hour' | 'blue_hour' | 'midday' | 'dawn' | 'dusk';

  /** Atmospheric quality hints (e.g., "misty morning") */
  atmosphere?: string;
}

// =============================================================================
// Image History
// =============================================================================

/**
 * Collection of generated images for a single loadout
 * Maximum 3 images maintained
 */
export interface LoadoutImageHistory {
  /** Loadout this history belongs to */
  loadoutId: string;

  /** Up to 3 most recent images, ordered by generation_timestamp DESC */
  images: GeneratedLoadoutImage[];

  /** UUID of the currently active image (if any) */
  activeImageId: string | null;
}

// =============================================================================
// Extended Loadout Type
// =============================================================================

/**
 * Extension to existing Loadout interface
 * Add these fields to types/loadout.ts
 */
export interface LoadoutImageFields {
  /** Reference to active hero image (nullable) */
  heroImageId: string | null;

  /** User preference: ai_generated or manual_upload */
  imageSourcePreference: 'ai_generated' | 'manual_upload' | null;
}

// =============================================================================
// Fallback Images
// =============================================================================

/**
 * Curated default image categorized by activity and season
 */
export interface FallbackImage {
  /** Unique identifier */
  id: string;

  /** Cloudinary URL to curated image */
  url: string;

  /** Primary activity type this image suits */
  activityType: 'hiking' | 'camping' | 'climbing' | 'skiing' | 'backpacking' | 'generic';

  /** Season this image is appropriate for */
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'generic';

  /** Descriptive alt-text */
  altText: string;
}
