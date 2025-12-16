/**
 * Cloudinary AI Client
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Server-side only - uses API key/secret for signed uploads
 */

import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';

// =============================================================================
// Configuration
// =============================================================================

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =============================================================================
// Validation Schemas
// =============================================================================

const AIGenerationRequestSchema = z.object({
  prompt: z.string().min(10).max(1000),
  negativePrompt: z.string().optional(),
  aspectRatio: z.literal('16:9').default('16:9'),
  qualityMode: z.enum(['standard', 'hd']).default('hd'),
});

export type AIGenerationRequest = z.infer<typeof AIGenerationRequestSchema>;

const CloudinaryResponseSchema = z.object({
  secure_url: z.string().url(),
  public_id: z.string(),
  width: z.number(),
  height: z.number(),
  format: z.string(),
  resource_type: z.literal('image'),
  created_at: z.string(),
});

export type CloudinaryAIResponse = z.infer<typeof CloudinaryResponseSchema>;

// =============================================================================
// Error Types
// =============================================================================

export class CloudinaryAIError extends Error {
  constructor(
    message: string,
    public code: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'CloudinaryAIError';
  }
}

// =============================================================================
// Rate Limiting & Retry Logic
// =============================================================================

const RATE_LIMIT_ERRORS = [420, 429];
const TRANSIENT_ERRORS = [500, 502, 503, 504];
const TIMEOUT_MS = 10000; // 10 second timeout

/**
 * Check if error is transient and should be retried
 */
function isTransientError(statusCode: number): boolean {
  return TRANSIENT_ERRORS.includes(statusCode);
}

/**
 * Check if error is due to rate limiting
 */
function isRateLimitError(statusCode: number): boolean {
  return RATE_LIMIT_ERRORS.includes(statusCode);
}

// =============================================================================
// Main API Functions
// =============================================================================

/**
 * Generate AI image using Cloudinary's generative AI capabilities
 *
 * @param request - Generation parameters including prompt and style options
 * @returns Cloudinary response with secure URL and metadata
 * @throws CloudinaryAIError with retry hint if applicable
 */
export async function generateAIImage(
  request: AIGenerationRequest
): Promise<CloudinaryAIResponse> {
  // Validate request
  const validatedRequest = AIGenerationRequestSchema.parse(request);

  // Check if AI generation is enabled
  if (process.env.CLOUDINARY_AI_ENABLED !== 'true') {
    throw new CloudinaryAIError(
      'Cloudinary AI generation is not enabled',
      403,
      false
    );
  }

  try {
    // Encode prompt for URL-safe usage
    const encodedPrompt = encodeURIComponent(validatedRequest.prompt);

    // Construct AI transformation effect
    const effect = `gen_background_replace:prompt_${encodedPrompt}`;

    // Call Cloudinary Upload API with AI transformation
    // Using a placeholder image that will be replaced by AI generation
    const result = await cloudinary.uploader.upload('data:image/gif;base64,R0lGODlhAQABAAAAACw=', {
      transformation: [
        {
          effect,
          aspect_ratio: validatedRequest.aspectRatio,
          quality: validatedRequest.qualityMode === 'hd' ? 'auto:best' : 'auto:good',
        },
      ],
      folder: 'gearshack/loadouts/generated',
      resource_type: 'image',
      format: 'jpg',
      timeout: TIMEOUT_MS,
    });

    // Validate response structure
    const validatedResponse = CloudinaryResponseSchema.parse(result);

    return validatedResponse;
  } catch (error: unknown) {
    // Handle Cloudinary API errors
    if (error && typeof error === 'object' && 'http_code' in error) {
      const httpCode = (error as { http_code: number }).http_code;
      const errorMessage = (error as { message?: string }).message || 'Unknown Cloudinary error';

      if (isRateLimitError(httpCode)) {
        throw new CloudinaryAIError(
          `Rate limit exceeded: ${errorMessage}`,
          httpCode,
          false // Don't retry rate limits - use fallback instead
        );
      }

      if (isTransientError(httpCode)) {
        throw new CloudinaryAIError(
          `Transient error: ${errorMessage}`,
          httpCode,
          true // Retry transient errors once
        );
      }

      throw new CloudinaryAIError(
        `Cloudinary API error: ${errorMessage}`,
        httpCode,
        false
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw new CloudinaryAIError(
        `Invalid request: ${error.message}`,
        400,
        false
      );
    }

    // Handle unknown errors
    throw new CloudinaryAIError(
      error instanceof Error ? error.message : 'Unknown error during AI generation',
      500,
      true
    );
  }
}

/**
 * Delete generated image from Cloudinary
 *
 * @param publicId - Cloudinary public_id of the image to delete
 */
export async function deleteAIImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true, // Invalidate CDN cache
    });
  } catch (error) {
    console.error('[CloudinaryAI] Failed to delete image:', publicId, error);
    // Don't throw - deletion failures should not block user actions
  }
}

/**
 * Get Cloudinary URL for a public_id with optimizations
 *
 * @param publicId - Cloudinary public_id
 * @param options - Optional transformation options
 */
export function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:best' | 'auto:good';
  }
): string {
  return cloudinary.url(publicId, {
    secure: true,
    quality: options?.quality || 'auto',
    width: options?.width,
    height: options?.height,
    crop: 'fill',
    fetch_format: 'auto', // Auto-select WebP, AVIF, or JPEG
  });
}

/**
 * Check Cloudinary AI configuration status
 *
 * @returns true if Cloudinary AI is properly configured
 */
export function isCloudinaryAIConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_AI_ENABLED === 'true'
  );
}
