/**
 * useBackgroundImages Hook
 *
 * Feature: 008-auth-and-profile
 * T039: Fetch background images from Firebase Storage for login page
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
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Firebase Storage path for HD backgrounds */
const BACKGROUNDS_PATH = 'backgrounds/hd';

/** Fallback gradient when no images available */
export const FALLBACK_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #0e7490 100%)';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBackgroundImages(): UseBackgroundImagesReturn {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const storageRef = ref(storage, BACKGROUNDS_PATH);
        const result = await listAll(storageRef);

        if (result.items.length === 0) {
          setImages([]);
          setLoading(false);
          return;
        }

        // Get download URLs for all images
        const urls = await Promise.all(
          result.items.map((item) => getDownloadURL(item))
        );

        // Shuffle images for variety
        const shuffled = urls.sort(() => Math.random() - 0.5);
        setImages(shuffled);
      } catch (err) {
        console.error('Failed to fetch background images:', err);
        setError('Failed to load background images');
        setImages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, []);

  return { images, loading, error };
}
