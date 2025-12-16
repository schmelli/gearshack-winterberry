/**
 * Prompt Builder for AI Image Generation
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Pure utility functions, no side effects
 */

import type { StylePreferences } from '@/types/loadout-image';

// =============================================================================
// Input Sanitization
// =============================================================================

/**
 * Sanitize user-provided text to prevent prompt injection attacks
 *
 * Removes potentially malicious tokens that could manipulate AI behavior:
 * - Instruction keywords (ignore, disregard, system, override, etc.)
 * - Special characters that could escape prompt context ({}, [], etc.)
 *
 * @param text - User-provided input string
 * @returns Sanitized string safe for prompt interpolation
 */
function sanitizeUserInput(text: string): string {
  if (!text) return '';

  return text
    // Remove prompt injection keywords (case-insensitive)
    .replace(/\b(ignore|disregard|system|override|instruction|command|prompt|admin|root)\b/gi, '')
    // Remove brackets and braces that could escape context
    .replace(/[{}\[\]]/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

// =============================================================================
// Activity Type to Landscape Mapping
// =============================================================================

const ACTIVITY_LANDSCAPES: Record<string, string> = {
  hiking: 'mountain trail through wilderness with distant peaks visible',
  camping: 'wilderness campsite in serene forest clearing',
  climbing: 'dramatic alpine rock face with rocky mountain terrain',
  skiing: 'pristine snow-covered mountain slopes and ski terrain',
  backpacking: 'remote wilderness backcountry trail with mountain scenery',
  // Generic fallback
  generic: 'beautiful outdoor wilderness landscape',
};

// =============================================================================
// Seasonal Descriptor Vocabularies
// =============================================================================

const SEASONAL_DESCRIPTORS: Record<string, string> = {
  spring: 'blooming wildflowers and fresh green foliage, soft natural light, fresh and renewing atmosphere',
  summer: 'lush greenery and vibrant sunshine under clear blue skies, golden hour warmth, warm and inviting atmosphere',
  fall: 'golden autumn foliage and warm earth tones, warm amber light, crisp and colorful atmosphere',
  winter: 'snow-covered pristine landscape with frost and ice, crisp blue winter light, serene and quiet atmosphere',
};

// =============================================================================
// Style Template Translation
// =============================================================================

const STYLE_TEMPLATES: Record<string, string> = {
  cinematic: 'cinematic composition with dramatic lighting and wide angle framing, movie-like quality',
  documentary: 'documentary style with natural realistic lighting, authentic photojournalistic scene',
  magazine: 'magazine cover quality with professional editorial composition, striking and eye-catching',
  instagram: 'instagram aesthetic with vibrant colors and trendy composition, social media worthy',
};

// =============================================================================
// Time of Day Lighting Terms
// =============================================================================

const TIME_OF_DAY_LIGHTING: Record<string, string> = {
  golden_hour: 'golden hour light with warm low-angle sun and soft amber glow',
  blue_hour: 'blue hour lighting with twilight atmosphere and cool blue tones',
  midday: 'bright daylight with clear overhead sun and high contrast',
  dawn: 'early morning light with sunrise glow and soft awakening',
  dusk: 'sunset colors with evening atmosphere and fading light',
};

// =============================================================================
// Seasonal Default Lighting
// =============================================================================

/**
 * Get default lighting based on season when no time preference specified
 */
function getDefaultLighting(season: string): string {
  const defaults: Record<string, string> = {
    spring: TIME_OF_DAY_LIGHTING.dawn,
    summer: TIME_OF_DAY_LIGHTING.golden_hour,
    fall: TIME_OF_DAY_LIGHTING.dusk,
    winter: TIME_OF_DAY_LIGHTING.blue_hour,
  };

  return defaults[season] || TIME_OF_DAY_LIGHTING.midday;
}

// =============================================================================
// Main Prompt Building Functions
// =============================================================================

/**
 * Build AI generation prompt from loadout characteristics
 *
 * @param params - Loadout metadata and style preferences
 * @returns Constructed prompt and negative prompt
 */
export function buildPrompt(params: {
  title?: string;
  description?: string;
  season?: string;
  activityTypes?: string[];
  stylePreferences?: StylePreferences;
}): {
  prompt: string;
  negativePrompt: string;
} {
  const { season, activityTypes, stylePreferences } = params;

  // Base prefix
  const base = 'Professional outdoor photography';

  // Landscape/activity context
  const primaryActivity = activityTypes?.[0] || 'generic';
  const landscape = ACTIVITY_LANDSCAPES[primaryActivity] || ACTIVITY_LANDSCAPES.generic;

  // Seasonal context
  const seasonalTerms = season
    ? SEASONAL_DESCRIPTORS[season] || ''
    : 'natural outdoor environment';

  // Style modifiers (if P3 style preferences provided)
  const styleModifiers = stylePreferences?.template
    ? STYLE_TEMPLATES[stylePreferences.template]
    : 'natural composition';

  // Lighting (prefer user preference, fall back to seasonal default)
  const lighting = stylePreferences?.timeOfDay
    ? TIME_OF_DAY_LIGHTING[stylePreferences.timeOfDay]
    : season
    ? getDefaultLighting(season)
    : 'natural lighting';

  // Atmosphere hints (P3 feature - user-provided freeform text)
  // SECURITY: Sanitize user input to prevent prompt injection
  const atmosphere = stylePreferences?.atmosphere
    ? sanitizeUserInput(stylePreferences.atmosphere)
    : '';

  // Quality modifiers
  const quality = 'natural depth of field, high resolution, 8k quality';

  // Construct final prompt
  const promptParts = [
    base,
    landscape,
    seasonalTerms,
    styleModifiers,
    lighting,
    atmosphere, // May be empty string
    quality,
  ].filter(part => part.length > 0); // Remove empty strings

  const prompt = promptParts.join(', ');

  // Negative prompt (things to avoid)
  const negativePrompt = 'people, faces, text, watermarks, logos, cluttered scenes, low quality, blurry, distorted';

  return { prompt, negativePrompt };
}

/**
 * Generate descriptive alt-text for accessibility
 *
 * @param params - Loadout characteristics used in generation
 * @returns Descriptive alt-text string
 */
export function generateAltText(params: {
  title?: string;
  description?: string;
  season?: string;
  activityTypes?: string[];
}): string {
  const { title, season, activityTypes } = params;

  const primaryActivity = activityTypes?.[0] || 'outdoor';
  const activityLabel = primaryActivity === 'generic' ? 'outdoor' : primaryActivity;

  const seasonLabel = season || '';

  // Construct descriptive alt-text
  const parts: string[] = [];

  // Start with activity landscape description
  const landscapeDesc = ACTIVITY_LANDSCAPES[primaryActivity] || 'outdoor wilderness scene';
  parts.push(landscapeDesc);

  // Add seasonal context if available
  if (seasonLabel) {
    parts.push(`in ${seasonLabel}`);
  }

  // Add context about loadout
  parts.push(`suitable for ${activityLabel} gear loadout`);

  // Add title reference if available
  // SECURITY: Sanitize user input to prevent injection in alt-text
  if (title && title !== 'loadout') {
    parts.push(`(${sanitizeUserInput(title)})`);
  }

  return parts.join(' ');
}

/**
 * Validate prompt length and content
 *
 * @param prompt - Constructed prompt string
 * @returns true if prompt is valid
 */
export function validatePrompt(prompt: string): {
  isValid: boolean;
  error?: string;
} {
  if (prompt.length < 10) {
    return {
      isValid: false,
      error: 'Prompt too short (minimum 10 characters)',
    };
  }

  if (prompt.length > 1000) {
    return {
      isValid: false,
      error: 'Prompt too long (maximum 1000 characters)',
    };
  }

  if (prompt.trim().length === 0) {
    return {
      isValid: false,
      error: 'Prompt cannot be empty',
    };
  }

  return { isValid: true };
}

/**
 * Preview prompt construction (for debugging/testing)
 *
 * @param params - Loadout characteristics
 * @returns Human-readable prompt breakdown
 */
export function previewPrompt(params: {
  title?: string;
  season?: string;
  activityTypes?: string[];
  stylePreferences?: StylePreferences;
}): {
  base: string;
  landscape: string;
  seasonal: string;
  style: string;
  lighting: string;
  atmosphere: string;
  quality: string;
  fullPrompt: string;
} {
  const { season, activityTypes, stylePreferences } = params;

  const primaryActivity = activityTypes?.[0] || 'generic';
  const landscape = ACTIVITY_LANDSCAPES[primaryActivity] || ACTIVITY_LANDSCAPES.generic;
  const seasonalTerms = season ? SEASONAL_DESCRIPTORS[season] || '' : '';
  const styleModifiers = stylePreferences?.template
    ? STYLE_TEMPLATES[stylePreferences.template]
    : 'natural composition';
  const lighting = stylePreferences?.timeOfDay
    ? TIME_OF_DAY_LIGHTING[stylePreferences.timeOfDay]
    : season
    ? getDefaultLighting(season)
    : 'natural lighting';
  const atmosphere = stylePreferences?.atmosphere || '';

  const { prompt } = buildPrompt(params);

  return {
    base: 'Professional outdoor photography',
    landscape,
    seasonal: seasonalTerms,
    style: styleModifiers,
    lighting,
    atmosphere,
    quality: 'natural depth of field, high resolution, 8k quality',
    fullPrompt: prompt,
  };
}
