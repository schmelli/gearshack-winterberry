/**
 * Environment Variable Validation
 * Feature 050: AI Assistant
 *
 * Validates required environment variables at startup to fail fast
 * instead of silently failing at runtime.
 */

import { z } from 'zod';

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * AI Assistant environment variables
 */
const aiEnvSchema = z.object({
  // Anthropic/Vercel AI SDK
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // Web Search (optional - feature can be disabled)
  SERPER_API_KEY: z.string().optional(),
  WEB_SEARCH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  WEB_SEARCH_PROVIDER: z.enum(['serper']).default('serper'),
  WEB_SEARCH_DAILY_LIMIT: z.coerce.number().int().positive().default(10),
  WEB_SEARCH_MONTHLY_LIMIT: z.coerce.number().int().positive().default(100),
  WEB_SEARCH_CONVERSATION_LIMIT: z.coerce.number().int().positive().default(2),

  // GearGraph (optional)
  GEARGRAPH_API_KEY: z.string().optional(),

  // AI Configuration
  AI_GENERATION_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  AI_IMAGE_MODEL: z.string().default('nano-banana-pro'),
  AI_REQUEST_TIMEOUT: z.coerce.number().int().positive().default(30000),
});

/**
 * Supabase environment variables
 */
const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

/**
 * Cloudinary environment variables
 */
const cloudinaryEnvSchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().min(1),
});

/**
 * Combined environment schema
 */
const envSchema = z.object({
  ...aiEnvSchema.shape,
  ...supabaseEnvSchema.shape,
  ...cloudinaryEnvSchema.shape,
});

export type Env = z.infer<typeof envSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate all environment variables
 * Throws an error if validation fails
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `- ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env.local file.`
      );
    }
    throw error;
  }
}

/**
 * Validate web search configuration specifically
 * Returns null if web search is disabled
 */
export function validateWebSearchConfig(): {
  enabled: boolean;
  apiKey: string | undefined;
  provider: 'serper';
  limits: {
    daily: number;
    monthly: number;
    conversation: number;
  };
} | null {
  const env = aiEnvSchema.parse(process.env);

  if (!env.WEB_SEARCH_ENABLED) {
    return null;
  }

  if (!env.SERPER_API_KEY) {
    throw new Error(
      'Web search is enabled (WEB_SEARCH_ENABLED=true) but SERPER_API_KEY is not set'
    );
  }

  return {
    enabled: true,
    apiKey: env.SERPER_API_KEY,
    provider: env.WEB_SEARCH_PROVIDER,
    limits: {
      daily: env.WEB_SEARCH_DAILY_LIMIT,
      monthly: env.WEB_SEARCH_MONTHLY_LIMIT,
      conversation: env.WEB_SEARCH_CONVERSATION_LIMIT,
    },
  };
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(): {
  apiKey: string;
  timeout: number;
  generationEnabled: boolean;
  imageModel: string;
} {
  const env = aiEnvSchema.parse(process.env);

  return {
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: env.AI_REQUEST_TIMEOUT,
    generationEnabled: env.AI_GENERATION_ENABLED,
    imageModel: env.AI_IMAGE_MODEL,
  };
}

/**
 * Get validated environment variable
 * Throws if the variable is missing or invalid
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  const env = validateEnv();
  return env[key];
}

/**
 * Get validated environment variable with fallback
 * Returns the fallback value if the variable is missing
 */
export function getEnvOrDefault<K extends keyof Env>(
  key: K,
  defaultValue: Env[K]
): Env[K] {
  try {
    return getEnv(key);
  } catch {
    return defaultValue;
  }
}

// =============================================================================
// Runtime Checks
// =============================================================================

/**
 * Check if web search is properly configured and enabled
 */
export function isWebSearchAvailable(): boolean {
  try {
    const config = validateWebSearchConfig();
    return config !== null && config.enabled;
  } catch {
    return false;
  }
}

/**
 * Check if GearGraph integration is available
 */
export function isGearGraphAvailable(): boolean {
  try {
    const env = aiEnvSchema.parse(process.env);
    return Boolean(env.GEARGRAPH_API_KEY);
  } catch {
    return false;
  }
}
