/**
 * Cloudinary AI Generation API Contract
 * Feature: 048-ai-loadout-image-gen
 *
 * Defines the contract for Cloudinary AI image generation API
 * Note: Actual endpoint details will be finalized in research.md
 */

import { z } from 'zod';

/**
 * Schema for Cloudinary AI generation request
 * Used internally by lib/cloudinary-ai.ts
 */
export const CloudinaryAIGenerationRequestSchema = z.object({
  /** Constructed prompt for image generation (10-1000 characters) */
  prompt: z.string().min(10).max(1000),

  /** Fixed aspect ratio for loadout cards */
  aspectRatio: z.literal('16:9'),

  /** Quality mode - default to HD for best results */
  qualityMode: z.enum(['standard', 'hd']).default('hd'),

  /** Optional negative prompt (things to avoid in generation) */
  negativePrompt: z.string().optional(),
});

export type CloudinaryAIGenerationRequest = z.infer<typeof CloudinaryAIGenerationRequestSchema>;

/**
 * Schema for Cloudinary AI generation response
 * Validates the API response structure
 */
export const CloudinaryAIGenerationResponseSchema = z.object({
  /** Full HTTPS URL to the generated image */
  secure_url: z.string().url(),

  /** Cloudinary public_id for asset management */
  public_id: z.string(),

  /** Image width in pixels */
  width: z.number(),

  /** Image height in pixels */
  height: z.number(),

  /** Image format (jpg, png, webp) */
  format: z.string(),

  /** Resource type (always 'image' for our use case) */
  resource_type: z.literal('image'),

  /** ISO timestamp when image was created */
  created_at: z.string(),
});

export type CloudinaryAIGenerationResponse = z.infer<typeof CloudinaryAIGenerationResponseSchema>;

/**
 * Example request:
 * {
 *   prompt: "Professional outdoor photography, alpine mountain landscape with snow-capped peaks, dramatic lighting, golden hour, cinematic composition, 8k quality",
 *   aspectRatio: "16:9",
 *   qualityMode: "hd",
 *   negativePrompt: "people, text, watermark, cluttered, low quality"
 * }
 *
 * Example response:
 * {
 *   secure_url: "https://res.cloudinary.com/gearshack/image/upload/v1234567890/loadouts/generated-abc123.jpg",
 *   public_id: "loadouts/generated-abc123",
 *   width: 1920,
 *   height: 1080,
 *   format: "jpg",
 *   resource_type: "image",
 *   created_at: "2025-12-14T10:30:00Z"
 * }
 */
