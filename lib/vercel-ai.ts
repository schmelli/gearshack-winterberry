/**
 * Vercel AI Client for Image Generation
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Server-side only - uses Vercel AI SDK with AI Gateway
 */

import { experimental_generateImage as generateImage } from 'ai';
import { z } from 'zod';
import {
  AI_GENERATION_TIMEOUT_MS,
  CLOUDINARY_GENERATED_IMAGES_FOLDER,
} from '@/lib/config/image-generation';

// =============================================================================
// Configuration
// =============================================================================

/**
 * AI Model Configuration
 *
 * Supported models via Vercel AI Gateway:
 * - google/gemini-2.5-flash-image (recommended - fast, cost-effective)
 * - openai/dall-e-3
 * - stability-ai/stable-diffusion-xl
 *
 * Requires:
 * - AI_IMAGE_MODEL environment variable
 * - AI_GATEWAY_API_KEY environment variable (for Vercel AI Gateway)
 * - AI_GENERATION_ENABLED=true
 */
const AI_MODEL = process.env.AI_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_ENABLED = process.env.AI_GENERATION_ENABLED === 'true';

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

const AIImageResponseSchema = z.object({
  url: z.string().url(),
  width: z.number().optional(),
  height: z.number().optional(),
  contentType: z.string().optional(),
});

export type AIImageResponse = z.infer<typeof AIImageResponseSchema>;

// =============================================================================
// Error Types
// =============================================================================

export class AIGenerationError extends Error {
  constructor(
    message: string,
    public code: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AIGenerationError';
  }
}

// =============================================================================
// Rate Limiting & Retry Logic
// =============================================================================

const RATE_LIMIT_ERRORS = [420, 429];
const TRANSIENT_ERRORS = [500, 502, 503, 504];

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
 * Generate AI image using Vercel AI SDK
 *
 * @param request - Generation parameters including prompt and style options
 * @returns Image response with URL and metadata
 * @throws AIGenerationError with retry hint if applicable
 */
export async function generateAIImage(
  request: AIGenerationRequest
): Promise<AIImageResponse> {
  // Validate request
  const validatedRequest = AIGenerationRequestSchema.parse(request);

  // Validate AI configuration
  if (!isAIConfigured()) {
    const missingVars = [];
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) missingVars.push('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    if (!process.env.CLOUDINARY_API_KEY) missingVars.push('CLOUDINARY_API_KEY');
    if (!process.env.CLOUDINARY_API_SECRET) missingVars.push('CLOUDINARY_API_SECRET');
    if (!process.env.AI_GATEWAY_API_KEY) missingVars.push('AI_GATEWAY_API_KEY');
    if (!process.env.AI_IMAGE_MODEL) missingVars.push('AI_IMAGE_MODEL');
    if (process.env.AI_GENERATION_ENABLED !== 'true') missingVars.push('AI_GENERATION_ENABLED');

    throw new AIGenerationError(
      `AI generation not properly configured. Missing or invalid: ${missingVars.join(', ')}`,
      500,
      false
    );
  }

  try {
    console.log('[VercelAI] Generating image with prompt:', validatedRequest.prompt.substring(0, 100));

    // Generate image using Vercel AI SDK
    const { image } = await generateImage({
      model: AI_MODEL,
      prompt: validatedRequest.prompt,
      // Add negative prompt if provided
      ...(validatedRequest.negativePrompt && {
        negativePrompt: validatedRequest.negativePrompt,
      }),
      // Quality and aspect ratio settings
      size: validatedRequest.aspectRatio === '16:9' ? '1024x576' : '1024x1024',
      // Add timeout
      abortSignal: AbortSignal.timeout(AI_GENERATION_TIMEOUT_MS),
    });

    // Convert image blob to URL (upload to storage or use data URL)
    const imageUrl = await uploadImageToStorage(image);

    const response: AIImageResponse = {
      url: imageUrl,
      width: validatedRequest.aspectRatio === '16:9' ? 1024 : 1024,
      height: validatedRequest.aspectRatio === '16:9' ? 576 : 1024,
      contentType: 'image/png',
    };

    // Validate response structure
    const validatedResponse = AIImageResponseSchema.parse(response);

    console.log('[VercelAI] Image generated successfully:', validatedResponse.url);

    return validatedResponse;
  } catch (error: unknown) {
    console.error('[VercelAI] Image generation failed:', error);

    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AIGenerationError(
        'Image generation timed out',
        504,
        true // Retry timeout errors
      );
    }

    // Handle API errors with status codes
    if (error && typeof error === 'object' && 'status' in error) {
      const statusCode = (error as { status: number }).status;
      const errorMessage = (error as { message?: string }).message || 'Unknown AI generation error';

      if (isRateLimitError(statusCode)) {
        throw new AIGenerationError(
          `Rate limit exceeded: ${errorMessage}`,
          statusCode,
          false // Don't retry rate limits - use fallback instead
        );
      }

      if (isTransientError(statusCode)) {
        throw new AIGenerationError(
          `Transient error: ${errorMessage}`,
          statusCode,
          true // Retry transient errors once
        );
      }

      throw new AIGenerationError(
        `AI API error: ${errorMessage}`,
        statusCode,
        false
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw new AIGenerationError(
        `Invalid request: ${error.message}`,
        400,
        false
      );
    }

    // Handle unknown errors
    throw new AIGenerationError(
      error instanceof Error ? error.message : 'Unknown error during AI generation',
      500,
      true
    );
  }
}

/**
 * Upload generated image to Cloudinary for CDN hosting
 *
 * @param imageFile - Generated image file from AI SDK
 * @returns Cloudinary URL
 */
async function uploadImageToStorage(imageFile: { base64: string; mediaType: string }): Promise<string> {
  // Create data URL from base64 and media type
  const dataUrl = `data:${imageFile.mediaType};base64,${imageFile.base64}`;

  // Upload to Cloudinary (keep using Cloudinary for storage/CDN)
  const cloudinary = await import('cloudinary');

  cloudinary.v2.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const result = await cloudinary.v2.uploader.upload(dataUrl, {
    folder: CLOUDINARY_GENERATED_IMAGES_FOLDER,
    resource_type: 'image',
    format: 'jpg',
  });

  return result.secure_url;
}

/**
 * Delete generated image from Cloudinary CDN
 *
 * @param publicId - Cloudinary public_id of the image to delete
 */
export async function deleteAIImage(publicId: string): Promise<void> {
  try {
    const cloudinary = await import('cloudinary');

    cloudinary.v2.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    await cloudinary.v2.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true, // Invalidate CDN cache
    });
  } catch (error) {
    console.error('[VercelAI] Failed to delete image:', publicId, error);
    // Don't throw - deletion failures should not block user actions
  }
}

/**
 * Get Cloudinary URL for a public_id with optimizations
 *
 * @param publicId - Cloudinary public_id
 * @param options - Optional transformation options
 */
export async function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:best' | 'auto:good';
  }
): Promise<string> {
  const cloudinary = await import('cloudinary');

  cloudinary.v2.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return cloudinary.v2.url(publicId, {
    secure: true,
    quality: options?.quality || 'auto',
    width: options?.width,
    height: options?.height,
    crop: 'fill',
    fetch_format: 'auto', // Auto-select WebP, AVIF, or JPEG
  });
}

/**
 * Check AI generation configuration status
 *
 * Required environment variables:
 * - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: Cloudinary cloud name
 * - CLOUDINARY_API_KEY: Cloudinary API key
 * - CLOUDINARY_API_SECRET: Cloudinary API secret
 * - AI_GATEWAY_API_KEY: Vercel AI Gateway API key
 * - AI_IMAGE_MODEL: Model identifier (e.g., google/gemini-2.5-flash-image)
 * - AI_GENERATION_ENABLED: Must be 'true'
 *
 * @returns true if AI generation is properly configured
 */
export function isAIConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.AI_GATEWAY_API_KEY &&
    process.env.AI_IMAGE_MODEL &&
    process.env.AI_GENERATION_ENABLED === 'true'
  );
}
