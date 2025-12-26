/**
 * Vercel AI Client for Image Generation
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Server-side only - uses Vercel AI SDK with AI Gateway
 *
 * Uses generateText with multimodal models (like Gemini) that can produce images.
 * Images are returned as content parts in the response.
 *
 * @see https://vercel.com/docs/ai-gateway/image-generation/ai-sdk
 */

import { generateText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
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
 * Supported multimodal models via Vercel AI Gateway:
 * - google/gemini-2.5-flash-image (recommended - fast, cost-effective)
 * - google/gemini-3-pro-image (higher quality)
 *
 * These models can generate both text AND images in a single response.
 *
 * Requires:
 * - AI_IMAGE_MODEL environment variable
 * - AI_GATEWAY_API_KEY environment variable (for Vercel AI Gateway)
 * - AI_GENERATION_ENABLED=true
 */
const AI_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1/ai';

/**
 * Create the Vercel AI Gateway instance for image generation
 * This provides a unified interface to multiple AI providers
 */
function getImageModel() {
  if (!AI_GATEWAY_API_KEY) {
    throw new Error('AI_GATEWAY_API_KEY is required for image generation');
  }

  const gateway = createGateway({
    apiKey: AI_GATEWAY_API_KEY,
    baseURL: AI_GATEWAY_BASE_URL,
  });

  return gateway(AI_IMAGE_MODEL);
}

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

    // Get model from gateway
    const model = getImageModel();

    // Build the image generation prompt
    // For multimodal models, we ask them to generate an image
    const imagePrompt = `Generate a high-quality image based on this description: ${validatedRequest.prompt}${
      validatedRequest.negativePrompt ? `. Avoid: ${validatedRequest.negativePrompt}` : ''
    }. The image should be in ${validatedRequest.aspectRatio} aspect ratio.`;

    // Generate using multimodal model (returns images as content parts)
    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: imagePrompt,
        },
      ],
      abortSignal: AbortSignal.timeout(AI_GENERATION_TIMEOUT_MS),
    });

    // Extract image from content parts
    // Multimodal models return images as parts in the response
    // Using flexible typing since the SDK types may not include image parts
    let imageData: { base64: string; mediaType: string } | null = null;

    // Check response content for image parts
    // Type casting needed because SDK types don't include image parts yet
    if (result.response?.messages) {
      for (const msg of result.response.messages) {
        if (Array.isArray(msg.content)) {
          for (const part of msg.content as Array<{ type: string; image?: string | Uint8Array; mimeType?: string }>) {
            if (part.type === 'image' && part.image) {
              // Image found - extract base64 and media type
              imageData = {
                base64: typeof part.image === 'string' ? part.image : Buffer.from(part.image).toString('base64'),
                mediaType: part.mimeType || 'image/png',
              };
              break;
            }
          }
        }
        if (imageData) break;
      }
    }

    // Also check for images in experimental response fields
    // Some models return images differently
    if (!imageData) {
      const anyResult = result as unknown as {
        images?: Array<{ image: string; mimeType?: string }>;
        experimental_providerMetadata?: {
          google?: { generatedImages?: Array<{ image: string }> };
        };
      };

      // Check for images array (some models use this)
      if (anyResult.images?.[0]) {
        imageData = {
          base64: anyResult.images[0].image,
          mediaType: anyResult.images[0].mimeType || 'image/png',
        };
      }

      // Check for Google-specific metadata
      if (!imageData && anyResult.experimental_providerMetadata?.google?.generatedImages?.[0]) {
        imageData = {
          base64: anyResult.experimental_providerMetadata.google.generatedImages[0].image,
          mediaType: 'image/png',
        };
      }
    }

    // If no image in response, the model might not support image generation
    if (!imageData) {
      console.error('[VercelAI] No image found in response. Result:', JSON.stringify(result, null, 2).substring(0, 500));
      throw new AIGenerationError(
        'Model did not return an image. The selected model may not support image generation or the response format is unexpected.',
        500,
        false
      );
    }

    // Convert image to URL (upload to Cloudinary)
    const imageUrl = await uploadImageToStorage(imageData);

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
