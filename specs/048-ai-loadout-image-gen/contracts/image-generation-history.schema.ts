/**
 * Image Generation History Schema
 * Feature: 048-ai-loadout-image-gen
 *
 * Defines the contract for image generation history (up to 3 per loadout)
 */

import { z } from 'zod';

/**
 * Schema for a single generated image record
 */
export const GeneratedImageSchema = z.object({
  /** Unique identifier for this generated image */
  id: z.string().uuid(),

  /** Parent loadout reference */
  loadoutId: z.string().uuid(),

  /** Cloudinary public_id for asset management */
  cloudinaryPublicId: z.string(),

  /** Full HTTPS URL to the generated image on Cloudinary CDN */
  cloudinaryUrl: z.string().url(),

  /** The exact prompt used to generate this image (for debugging/regeneration) */
  promptUsed: z.string(),

  /** Style preferences applied during generation (nullable for backward compatibility) */
  stylePreferences: z.object({
    template: z.string().optional(),
    timeOfDay: z.string().optional(),
    atmosphere: z.string().optional(),
  }).nullable(),

  /** When this image was generated */
  generationTimestamp: z.date(),

  /** Descriptive alt-text for accessibility (auto-generated or manual) */
  altText: z.string().nullable(),

  /** True if this is the currently active hero image for the loadout */
  isActive: z.boolean(),

  /** Record creation timestamp */
  createdAt: z.date(),
});

export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

/**
 * Schema for loadout image history response
 * Maximum 3 images per loadout (enforced by application logic)
 */
export const ImageHistoryResponseSchema = z.object({
  /** Loadout this history belongs to */
  loadoutId: z.string().uuid(),

  /** Up to 3 most recent generated images, ordered by generation_timestamp DESC */
  images: z.array(GeneratedImageSchema).max(3),

  /** UUID of the currently active image (if any) */
  activeImageId: z.string().uuid().nullable(),
});

export type ImageHistoryResponse = z.infer<typeof ImageHistoryResponseSchema>;

/**
 * Example valid history response:
 * {
 *   loadoutId: "550e8400-e29b-41d4-a716-446655440000",
 *   images: [
 *     {
 *       id: "660e8400-e29b-41d4-a716-446655440001",
 *       loadoutId: "550e8400-e29b-41d4-a716-446655440000",
 *       cloudinaryPublicId: "gearshack/loadouts/alpine-summit-v3",
 *       cloudinaryUrl: "https://res.cloudinary.com/.../alpine-summit-v3.jpg",
 *       promptUsed: "Professional outdoor photography, alpine mountain...",
 *       stylePreferences: { template: "cinematic", timeOfDay: "golden_hour" },
 *       generationTimestamp: new Date("2025-12-14T10:30:00Z"),
 *       altText: "Dramatic alpine landscape with snow-capped peaks...",
 *       isActive: true,
 *       createdAt: new Date("2025-12-14T10:30:05Z")
 *     }
 *   ],
 *   activeImageId: "660e8400-e29b-41d4-a716-446655440001"
 * }
 */
