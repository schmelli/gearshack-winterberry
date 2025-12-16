/**
 * Text Overlay Color Hook
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Custom hook for dynamic text color based on image brightness
 */

'use client';

import { useState, useEffect } from 'react';
import { getTextColor } from '@/lib/contrast-analyzer';

/**
 * Hook to determine optimal text color for image overlay
 * Analyzes image brightness and returns 'white' or 'black'
 *
 * @param imageUrl - Cloudinary image URL
 * @returns Text color class ('text-white' or 'text-black')
 */
export function useTextOverlayColor(
  imageUrl: string | null
): 'text-white' | 'text-black' {
  const [textColor, setTextColor] = useState<'white' | 'black'>('white');

  useEffect(() => {
    // Only analyze image if URL is provided
    if (!imageUrl) {
      return;
    }

    const img = new Image();

    // Enable CORS for Cloudinary images
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const color = getTextColor(img);
      setTextColor(color);
    };

    img.onerror = () => {
      console.warn('[useTextOverlayColor] Failed to load image for analysis');
      setTextColor('white'); // Default to white on error
    };

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  return textColor === 'white' ? 'text-white' : 'text-black';
}
