/**
 * Configuration Constants for AI Image Generation
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Centralized configuration to avoid magic numbers
 */

// =============================================================================
// Image Generation Timeouts
// =============================================================================

/**
 * Timeout for AI image generation requests (milliseconds)
 * Default: 30 seconds
 */
export const AI_GENERATION_TIMEOUT_MS = 30000;

/**
 * Retry delay before attempting second generation (milliseconds)
 * Default: 1 second
 */
export const AI_GENERATION_RETRY_DELAY_MS = 1000;

// =============================================================================
// Image History Limits
// =============================================================================

/**
 * Maximum number of generated images to keep per loadout
 * Older images are automatically deleted when this limit is exceeded
 * Default: 3 images
 */
export const MAX_IMAGES_PER_LOADOUT = 3;

// =============================================================================
// Image Quality Settings
// =============================================================================

/**
 * Default aspect ratio for generated images
 * Options: '16:9' | '1:1' | '4:3'
 */
export const DEFAULT_IMAGE_ASPECT_RATIO = '16:9' as const;

/**
 * Default image quality mode
 * Options: 'standard' | 'hd'
 */
export const DEFAULT_IMAGE_QUALITY_MODE = 'hd' as const;

/**
 * Image size for 16:9 aspect ratio
 */
export const IMAGE_SIZE_16_9 = {
  width: 1024,
  height: 576,
} as const;

/**
 * Image size for 1:1 aspect ratio
 */
export const IMAGE_SIZE_1_1 = {
  width: 1024,
  height: 1024,
} as const;

// =============================================================================
// Retry Logic
// =============================================================================

/**
 * Maximum number of retry attempts for AI generation
 * Default: 1 retry (2 total attempts)
 */
export const MAX_AI_GENERATION_RETRIES = 1;

/**
 * Whether to use fallback images when AI generation fails
 */
export const ENABLE_FALLBACK_IMAGES = true;

// =============================================================================
// Cloudinary Storage Configuration
// =============================================================================

/**
 * Cloudinary folder path for generated loadout images
 * Can be overridden via environment variable: CLOUDINARY_GENERATED_IMAGES_FOLDER
 */
export const CLOUDINARY_GENERATED_IMAGES_FOLDER =
  process.env.CLOUDINARY_GENERATED_IMAGES_FOLDER || 'gearshack/loadouts/generated';
