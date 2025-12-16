/**
 * Image Generation Request Schema
 * Feature: 048-ai-loadout-image-gen
 *
 * Defines the contract for requesting AI-generated loadout images
 */

import { z } from 'zod';

/**
 * Schema for image generation requests
 * Used when user clicks "Generate Image" button
 */
export const ImageGenerationRequestSchema = z.object({
  /** UUID of the loadout to generate image for */
  loadoutId: z.string().uuid(),

  /** Loadout title (used in prompt construction) */
  title: z.string().min(1).max(200),

  /** Optional loadout description (enriches prompt context) */
  description: z.string().optional(),

  /** Season for visual characteristics (required) */
  season: z.enum(['spring', 'summer', 'fall', 'winter']),

  /** Optional activity types (helps determine landscape category) */
  activityTypes: z.array(
    z.enum(['hiking', 'camping', 'climbing', 'skiing', 'backpacking'])
  ).optional(),

  /** Optional style preferences (P3 feature) */
  stylePreferences: z.object({
    /** Cinematic, documentary, magazine cover, or Instagram aesthetic */
    template: z.enum(['cinematic', 'documentary', 'magazine', 'instagram']).optional(),

    /** Time of day for lighting characteristics */
    timeOfDay: z.enum(['golden_hour', 'blue_hour', 'midday', 'dawn', 'dusk']).optional(),

    /** Atmospheric quality hints (e.g., "misty morning", "dramatic lighting") */
    atmosphere: z.string().max(50).optional(),
  }).optional(),
});

export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;

/**
 * Example valid request:
 * {
 *   loadoutId: "550e8400-e29b-41d4-a716-446655440000",
 *   title: "Alpine Summit Attempt",
 *   description: "3-day climb up Mont Blanc",
 *   season: "summer",
 *   activityTypes: ["climbing"],
 *   stylePreferences: {
 *     template: "cinematic",
 *     timeOfDay: "golden_hour",
 *     atmosphere: "dramatic lighting"
 *   }
 * }
 */
