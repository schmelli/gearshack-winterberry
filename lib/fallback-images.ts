/**
 * Fallback Image Selection Logic
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Pure utility functions for selecting curated default images
 */

import type { FallbackImage } from '@/types/loadout-image';

// =============================================================================
// Curated Fallback Image Definitions
// =============================================================================

/**
 * Curated set of high-quality outdoor images hosted on Cloudinary
 * These serve as fallbacks when AI generation fails or is rate-limited
 *
 * Source: Unsplash/Pexels (royalty-free, commercial use permitted)
 * Resolution: 1920×1080 minimum (16:9 aspect ratio)
 * Storage: Cloudinary folder gearshack/fallbacks/
 */
export const FALLBACK_IMAGES: FallbackImage[] = [
  // === Hiking ===
  {
    id: 'hiking-spring',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/hiking-spring.jpg',
    activityType: 'hiking',
    season: 'spring',
    altText: 'Mountain hiking trail with blooming wildflowers and fresh green spring foliage',
  },
  {
    id: 'hiking-summer',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/hiking-summer.jpg',
    activityType: 'hiking',
    season: 'summer',
    altText: 'Forest hiking trail under clear blue skies with lush summer greenery',
  },
  {
    id: 'hiking-fall',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/hiking-fall.jpg',
    activityType: 'hiking',
    season: 'fall',
    altText: 'Wilderness trail surrounded by golden autumn foliage and warm fall colors',
  },
  {
    id: 'hiking-winter',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/hiking-winter.jpg',
    activityType: 'hiking',
    season: 'winter',
    altText: 'Snowy mountain hiking path with pristine winter landscape',
  },

  // === Camping ===
  {
    id: 'camping-spring',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/camping-spring.jpg',
    activityType: 'camping',
    season: 'spring',
    altText: 'Forest camping clearing with fresh spring green surroundings',
  },
  {
    id: 'camping-summer',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/camping-summer.jpg',
    activityType: 'camping',
    season: 'summer',
    altText: 'Lakeside campsite with bright summer sun and vibrant nature',
  },
  {
    id: 'camping-fall',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/camping-fall.jpg',
    activityType: 'camping',
    season: 'fall',
    altText: 'Wilderness campsite surrounded by autumn colors and golden foliage',
  },
  {
    id: 'camping-winter',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/camping-winter.jpg',
    activityType: 'camping',
    season: 'winter',
    altText: 'Winter camping scene with snow-covered forest environment',
  },

  // === Climbing ===
  {
    id: 'climbing-spring',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/climbing-spring.jpg',
    activityType: 'climbing',
    season: 'spring',
    altText: 'Alpine rock face with blooming mountain landscape in spring',
  },
  {
    id: 'climbing-summer',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/climbing-summer.jpg',
    activityType: 'climbing',
    season: 'summer',
    altText: 'Dramatic rock climbing terrain under clear blue summer skies',
  },
  {
    id: 'climbing-fall',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/climbing-fall.jpg',
    activityType: 'climbing',
    season: 'fall',
    altText: 'Mountain cliff with autumn colors and fall foliage visible below',
  },
  {
    id: 'climbing-winter',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/climbing-winter.jpg',
    activityType: 'climbing',
    season: 'winter',
    altText: 'Icy alpine mountain face with pristine winter snow and frost',
  },

  // === Skiing ===
  {
    id: 'skiing-winter-1',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/skiing-winter-1.jpg',
    activityType: 'skiing',
    season: 'winter',
    altText: 'Pristine snow-covered ski slopes with alpine mountain terrain',
  },
  {
    id: 'skiing-winter-2',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/skiing-winter-2.jpg',
    activityType: 'skiing',
    season: 'winter',
    altText: 'Snowy mountain ski terrain with powder snow and clear skies',
  },

  // === Backpacking ===
  {
    id: 'backpacking-spring',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/backpacking-spring.jpg',
    activityType: 'backpacking',
    season: 'spring',
    altText: 'Remote wilderness backpacking trail with fresh spring scenery',
  },
  {
    id: 'backpacking-summer',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/backpacking-summer.jpg',
    activityType: 'backpacking',
    season: 'summer',
    altText: 'Backcountry trail through mountains with bright summer sunlight',
  },
  {
    id: 'backpacking-fall',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/backpacking-fall.jpg',
    activityType: 'backpacking',
    season: 'fall',
    altText: 'Mountain pass with golden autumn foliage along backpacking route',
  },
  {
    id: 'backpacking-winter',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/backpacking-winter.jpg',
    activityType: 'backpacking',
    season: 'winter',
    altText: 'Snowy backcountry trail with winter wilderness landscape',
  },

  // === Generic (fallback for unknown activities/seasons) ===
  {
    id: 'generic-spring',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/generic-spring.jpg',
    activityType: 'generic',
    season: 'spring',
    altText: 'Beautiful outdoor meadow with blooming spring wildflowers',
  },
  {
    id: 'generic-summer',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/generic-summer.jpg',
    activityType: 'generic',
    season: 'summer',
    altText: 'Vibrant outdoor landscape with clear summer skies',
  },
  {
    id: 'generic-fall',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/generic-fall.jpg',
    activityType: 'generic',
    season: 'fall',
    altText: 'Scenic forest with golden autumn foliage and warm fall colors',
  },
  {
    id: 'generic-winter',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/generic-winter.jpg',
    activityType: 'generic',
    season: 'winter',
    altText: 'Serene snow-covered outdoor winter scene',
  },

  // === Fully Generic (ultimate fallback) ===
  {
    id: 'generic-outdoor-1',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/generic-outdoor-1.jpg',
    activityType: 'generic',
    season: 'generic',
    altText: 'Beautiful outdoor wilderness vista with mountain landscape',
  },
  {
    id: 'generic-outdoor-2',
    url: 'https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/v1/gearshack/fallbacks/generic-outdoor-2.jpg',
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
  const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[randomIndex];
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
    if (!img.url || !img.url.startsWith('https://')) {
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
