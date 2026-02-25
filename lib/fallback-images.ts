/**
 * Fallback Image Selection Logic
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Pure utility functions for selecting curated default images
 *
 * Uses local images from /public/fallback-images/ for reliable fallback
 * when AI generation fails or is rate-limited.
 */

import type { FallbackImage } from '@/types/loadout-image';

// =============================================================================
// Curated Fallback Image Definitions
// =============================================================================

/**
 * Curated set of high-quality outdoor images stored locally
 * These serve as fallbacks when AI generation fails or is rate-limited
 *
 * Source: Unsplash/Pexels (royalty-free, commercial use permitted)
 * Storage: /public/fallback-images/ (local, always available)
 */
export const FALLBACK_IMAGES: FallbackImage[] = [
  // === Hiking ===
  {
    id: 'hiking-spring',
    url: '/fallback-images/hiking-spring.jpg',
    activityType: 'hiking',
    season: 'spring',
    altText: 'Mountain hiking trail with blooming wildflowers and fresh green spring foliage',
  },
  {
    id: 'hiking-summer',
    url: '/fallback-images/hiking-summer.jpg',
    activityType: 'hiking',
    season: 'summer',
    altText: 'Forest hiking trail under clear blue skies with lush summer greenery',
  },
  {
    id: 'hiking-fall',
    url: '/fallback-images/hiking_fall.png',
    activityType: 'hiking',
    season: 'fall',
    altText: 'Wilderness trail surrounded by golden autumn foliage and warm fall colors',
  },
  {
    id: 'hiking-winter',
    url: '/fallback-images/hiking-winter.jpg',
    activityType: 'hiking',
    season: 'winter',
    altText: 'Snowy mountain hiking path with pristine winter landscape',
  },

  // === Camping ===
  {
    id: 'camping-spring',
    url: '/fallback-images/camping-spring.jpg',
    activityType: 'camping',
    season: 'spring',
    altText: 'Forest camping clearing with fresh spring green surroundings',
  },
  {
    id: 'camping-summer',
    url: '/fallback-images/camping-summer.png',
    activityType: 'camping',
    season: 'summer',
    altText: 'Lakeside campsite with bright summer sun and vibrant nature',
  },
  {
    id: 'camping-fall',
    url: '/fallback-images/camping-fall.png',
    activityType: 'camping',
    season: 'fall',
    altText: 'Wilderness campsite surrounded by autumn colors and golden foliage',
  },
  {
    id: 'camping-winter',
    url: '/fallback-images/camping-winter.png',
    activityType: 'camping',
    season: 'winter',
    altText: 'Winter camping scene with snow-covered forest environment',
  },

  // === Backpacking ===
  {
    id: 'backpacking-spring',
    url: '/fallback-images/backpacking-spring.png',
    activityType: 'backpacking',
    season: 'spring',
    altText: 'Remote wilderness backpacking trail with fresh spring scenery',
  },
  {
    id: 'backpacking-summer',
    url: '/fallback-images/backpacking-summer.png',
    activityType: 'backpacking',
    season: 'summer',
    altText: 'Backcountry trail through mountains with bright summer sunlight',
  },
  {
    id: 'backpacking-fall',
    url: '/fallback-images/backpacking-fall.png',
    activityType: 'backpacking',
    season: 'fall',
    altText: 'Mountain pass with golden autumn foliage along backpacking route',
  },
  // Note: No backpacking-winter.png exists locally - will use camping-winter as fallback

  // === Generic (fallback for unknown activities/seasons) ===
  // Using camping images as generic fallbacks since they're available
  {
    id: 'generic-spring',
    url: '/fallback-images/camping-spring.jpg',
    activityType: 'generic',
    season: 'spring',
    altText: 'Beautiful outdoor meadow with blooming spring wildflowers',
  },
  {
    id: 'generic-summer',
    url: '/fallback-images/camping-summer.png',
    activityType: 'generic',
    season: 'summer',
    altText: 'Vibrant outdoor landscape with clear summer skies',
  },
  {
    id: 'generic-fall',
    url: '/fallback-images/camping-fall.png',
    activityType: 'generic',
    season: 'fall',
    altText: 'Scenic forest with golden autumn foliage and warm fall colors',
  },
  {
    id: 'generic-winter',
    url: '/fallback-images/camping-winter.png',
    activityType: 'generic',
    season: 'winter',
    altText: 'Serene snow-covered outdoor winter scene',
  },

  // === Fully Generic (ultimate fallback) ===
  {
    id: 'generic-outdoor-1',
    url: '/fallback-images/hiking-summer.jpg',
    activityType: 'generic',
    season: 'generic',
    altText: 'Beautiful outdoor wilderness vista with mountain landscape',
  },
  {
    id: 'generic-outdoor-2',
    url: '/fallback-images/backpacking-summer.png',
    activityType: 'generic',
    season: 'generic',
    altText: 'Scenic outdoor nature landscape with natural beauty',
  },
];

// =============================================================================
// Selection Logic
// =============================================================================

/**
 * Select appropriate fallback image based on loadout characteristics
 *
 * Priority hierarchy:
 * 1. Exact activity + season match
 * 2. Activity match with generic season
 * 3. Season match with generic activity
 * 4. Fully generic fallback
 *
 * @param activityType - Primary activity type (hiking, camping, etc.)
 * @param season - Season (spring, summer, fall, winter)
 * @returns Most appropriate fallback image
 */
export function selectFallbackImage(
  activityType?: string,
  season?: string
): FallbackImage {
  // Normalize inputs
  const normalizedActivity = activityType?.toLowerCase();
  const normalizedSeason = season?.toLowerCase();

  // Priority 1: Exact activity + season match
  if (normalizedActivity && normalizedSeason) {
    const exactMatch = FALLBACK_IMAGES.find(
      (img) =>
        img.activityType === normalizedActivity &&
        img.season === normalizedSeason
    );
    if (exactMatch) return exactMatch;
  }

  // Priority 2: Activity match with any season (prefer most recent season)
  if (normalizedActivity) {
    const activityMatches = FALLBACK_IMAGES.filter(
      (img) => img.activityType === normalizedActivity
    );
    if (activityMatches.length > 0) {
      // Return first match (they're ordered by season in array)
      return activityMatches[0];
    }
  }

  // Priority 3: Season match with generic activity
  if (normalizedSeason) {
    const seasonMatch = FALLBACK_IMAGES.find(
      (img) => img.season === normalizedSeason && img.activityType === 'generic'
    );
    if (seasonMatch) return seasonMatch;
  }

  // Priority 4: Fully generic fallback (guaranteed to exist)
  const fullyGeneric = FALLBACK_IMAGES.find(
    (img) => img.activityType === 'generic' && img.season === 'generic'
  );

  // This should never happen as we guarantee generic-outdoor-1 exists
  if (!fullyGeneric) {
    throw new Error('CRITICAL: No generic fallback image found in FALLBACK_IMAGES array');
  }

  return fullyGeneric;
}

/**
 * Get all fallback images for a specific activity type
 *
 * @param activityType - Activity type to filter by
 * @returns Array of fallback images for that activity
 */
export function getFallbackImagesByActivity(
  activityType: string
): FallbackImage[] {
  const normalizedActivity = activityType.toLowerCase();
  return FALLBACK_IMAGES.filter(
    (img) => img.activityType === normalizedActivity
  );
}

/**
 * Get all fallback images for a specific season
 *
 * @param season - Season to filter by
 * @returns Array of fallback images for that season
 */
export function getFallbackImagesBySeason(season: string): FallbackImage[] {
  const normalizedSeason = season.toLowerCase();
  return FALLBACK_IMAGES.filter((img) => img.season === normalizedSeason);
}

/**
 * Get a random fallback image from the entire set
 * Useful for variety when no specific criteria provided
 *
 * @returns Random fallback image
 */
export function getRandomFallbackImage(): FallbackImage {
  // Guard against empty array (should never happen, but defensive)
  if (FALLBACK_IMAGES.length === 0) {
    throw new Error('CRITICAL: FALLBACK_IMAGES array is empty');
  }
  const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
  // Clamp to valid range (Math.random() should never return 1.0, but be safe)
  const safeIndex = Math.min(randomIndex, FALLBACK_IMAGES.length - 1);
  return FALLBACK_IMAGES[safeIndex];
}

/**
 * Validate that all fallback images have valid URLs
 * Useful for deployment checks
 *
 * @returns Validation result with any errors found
 */
export function validateFallbackImages(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  FALLBACK_IMAGES.forEach((img) => {
    if (!img.id) {
      errors.push(`Image missing id: ${JSON.stringify(img)}`);
    }
    if (!img.url || !img.url.startsWith('/')) {
      errors.push(`Invalid URL for image ${img.id}: ${img.url}`);
    }
    if (!img.altText || img.altText.trim().length === 0) {
      errors.push(`Missing alt text for image ${img.id}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
