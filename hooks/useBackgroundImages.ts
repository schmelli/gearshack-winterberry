/**
 * useBackgroundImages Hook
 *
 * Feature: 008-auth-and-profile, 040-supabase-migration
 * Provides background images for the login/auth pages.
 *
 * Note: Firebase Storage has been removed. This hook now uses static local images.
 * Future enhancement: Could fetch images from Supabase Storage or Cloudinary.
 */

'use client';

import { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UseBackgroundImagesReturn {
  /** Array of image URLs */
  images: string[];
  /** Loading state - always false with static images */
  loading: boolean;
  /** Error message (unused with static images) */
  error: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Local background images for auth pages */
const LOCAL_BACKGROUND_IMAGES = [
  '/images/backgrounds/fallback_background.jpg',
];

/** Fallback gradient when no images available */
export const FALLBACK_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #0e7490 100%)';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBackgroundImages(): UseBackgroundImagesReturn {
  const [images] = useState<string[]>(LOCAL_BACKGROUND_IMAGES);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  return { images, loading, error };
}
