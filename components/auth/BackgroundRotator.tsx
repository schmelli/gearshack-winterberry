/**
 * BackgroundRotator Component
 *
 * Feature: 014-bugfix-sprint, 022-login-rescue
 * User Story 1: Stable login screen with single random background
 * Feature 022: Smooth fade-in transition with gradient always visible
 *
 * Hybrid Background Strategy:
 * - Displays local hero image immediately (no loading state)
 * - Smoothly transitions to cloud images when they become available
 */

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useBackgroundImages, FALLBACK_GRADIENT } from '@/hooks/useBackgroundImages';
import { cn } from '@/lib/utils';

// =============================================================================
// Inner Image Component - re-mounts when image changes for clean fade transition
// =============================================================================

interface FadeImageProps {
  src: string;
}

function FadeImage({ src }: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn(
        'absolute inset-0 transition-opacity duration-500',
        loaded ? 'opacity-100' : 'opacity-0'
      )}
    >
      <Image
        src={src}
        alt="Background"
        fill
        priority
        className="object-cover"
        sizes="100vw"
        quality={85}
        onLoad={() => {
          console.log('[BackgroundRotator] Image loaded:', src.slice(0, 50));
          setLoaded(true);
        }}
      />
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface BackgroundRotatorProps {
  /** Additional CSS classes */
  className?: string;
}

export function BackgroundRotator({ className }: BackgroundRotatorProps) {
  const { images } = useBackgroundImages();

  // Select ONE random image using lazy initializer
  const [imageIndex] = useState<number>(() => Math.floor(Math.random() * 100));

  // Calculate selected image based on available images
  const selectedImage = useMemo(() => {
    return images.length > 0 ? images[imageIndex % images.length] : null;
  }, [images, imageIndex]);

  return (
    <div className={cn('fixed inset-0 w-screen h-screen -z-10 overflow-hidden', className)}>
      {/* Base gradient - always visible as fallback */}
      <div
        className="absolute inset-0"
        style={{ background: FALLBACK_GRADIENT }}
      />

      {/* Image overlay with fade-in transition - key forces remount on image change */}
      {selectedImage && (
        <FadeImage key={selectedImage} src={selectedImage} />
      )}

      {/* Overlay for better text contrast - pointer-events-none ensures clicks pass through */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
    </div>
  );
}
