/**
 * BackgroundRotator Component
 *
 * Feature: 008-auth-and-profile
 * T040: Rotating background images with preloading and smooth transitions
 * T043: Fallback gradient when images unavailable
 * T044: 8-second rotation interval with CSS transitions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useBackgroundImages, FALLBACK_GRADIENT } from '@/hooks/useBackgroundImages';
import { cn } from '@/lib/utils';

// =============================================================================
// Constants
// =============================================================================

/** Rotation interval in milliseconds (T044) */
const ROTATION_INTERVAL = 8000;

/** Transition duration in milliseconds */
const TRANSITION_DURATION = 1500;

// =============================================================================
// Component
// =============================================================================

interface BackgroundRotatorProps {
  /** Additional CSS classes */
  className?: string;
}

export function BackgroundRotator({ className }: BackgroundRotatorProps) {
  const { images, loading } = useBackgroundImages();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Preload next image
  const preloadImage = useCallback((url: string) => {
    if (preloadedImages.has(url)) return;

    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setPreloadedImages((prev) => new Set(prev).add(url));
    };
  }, [preloadedImages]);

  // Preload first few images on mount
  useEffect(() => {
    if (images.length > 0) {
      // Preload first 3 images
      images.slice(0, 3).forEach(preloadImage);
    }
  }, [images, preloadImage]);

  // Rotation logic
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);

      // After transition, update indices
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        const newNextIndex = (nextIndex + 1) % images.length;
        setNextIndex(newNextIndex);
        setIsTransitioning(false);

        // Preload the image after next
        const preloadIndex = (newNextIndex + 1) % images.length;
        preloadImage(images[preloadIndex]);
      }, TRANSITION_DURATION);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [images, nextIndex, preloadImage]);

  // Loading state - show gradient
  if (loading || images.length === 0) {
    return (
      <div
        className={cn('absolute inset-0 -z-10', className)}
        style={{ background: FALLBACK_GRADIENT }}
      />
    );
  }

  const currentImage = images[currentIndex];
  const nextImage = images[nextIndex];

  return (
    <div className={cn('absolute inset-0 -z-10 overflow-hidden', className)}>
      {/* Current Image */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity',
          isTransitioning ? 'opacity-0' : 'opacity-100'
        )}
        style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}
      >
        <Image
          src={currentImage}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>

      {/* Next Image (revealed during transition) */}
      <div className="absolute inset-0">
        <Image
          src={nextImage}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>

      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
