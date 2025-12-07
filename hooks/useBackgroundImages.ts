/**
 * useBackgroundImages Hook
 *
 * Feature: 008-auth-and-profile
 * T039: Fetch background images from Firebase Storage for login page
 *
 * Hybrid Background Strategy:
 * - Initialize with local hero image for immediate display (no loading state)
 * - Fetch Firebase Storage images in background
 * - Seamlessly transition to cloud images when available
 */

'use client';

import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

// =============================================================================
// Types
// =============================================================================

export interface UseBackgroundImagesReturn {
  /** Array of image URLs */
  images: string[];
  /** Loading state - always false with hybrid strategy */
  loading: boolean;
  /** Error message if fetch failed (silent - doesn't affect display) */
  error: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Firebase Storage path for HD backgrounds */
const BACKGROUNDS_PATH = 'backgrounds/hd';

/** Local hero image - ships with the app for immediate display */
const LOCAL_HERO_IMAGE = '/images/backgrounds/fallback_background.jpg';

/** Fallback gradient when no images available */
export const FALLBACK_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #0e7490 100%)';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBackgroundImages(): UseBackgroundImagesReturn {
  // Hybrid Strategy: Initialize with local hero image - no loading state needed
  const [images, setImages] = useState<string[]>([LOCAL_HERO_IMAGE]);
  const [loading] = useState(false); // Always false - we have a local image immediately
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCloudImages() {
      try {
        console.log('[useBackgroundImages] Fetching cloud backgrounds from:', BACKGROUNDS_PATH);
        const storageRef = ref(storage, BACKGROUNDS_PATH);
        const result = await listAll(storageRef);

        // Filter to only image files (jpg, jpeg, png, webp)
        const imageItems = result.items.filter((item) => {
          const name = item.name.toLowerCase();
          return name.endsWith('.jpg') || name.endsWith('.jpeg') ||
                 name.endsWith('.png') || name.endsWith('.webp');
        });

        console.log('[useBackgroundImages] Cloud backgrounds found:', imageItems.length);

        if (imageItems.length === 0) {
          // No cloud images found - keep using local hero image
          console.log('[useBackgroundImages] No cloud images, keeping local hero');
          return;
        }

        // Get download URLs for all images
        const urls = await Promise.all(
          imageItems.map((item) => getDownloadURL(item))
        );

        // Shuffle images for variety
        const shuffledUrls = urls.sort(() => Math.random() - 0.5);

        console.log('[useBackgroundImages] Cloud images ready:', shuffledUrls.length);

        // Update state with cloud images (replace local hero)
        setImages(shuffledUrls);
      } catch (err) {
        // Silent error - user continues seeing local hero image
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn('[useBackgroundImages] Cloud fetch failed (using local hero):', errorMessage);
        setError(errorMessage);
        // DO NOT update images state - keep showing local hero
      }
    }

    fetchCloudImages();
  }, []);

  return { images, loading, error };
}
