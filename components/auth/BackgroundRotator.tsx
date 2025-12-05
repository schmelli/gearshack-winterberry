/**
 * BackgroundRotator Component
 *
 * Feature: 014-bugfix-sprint
 * User Story 1: Stable login screen with single random background
 * T003-T007: Simplified component with no rotation
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useBackgroundImages, FALLBACK_GRADIENT } from '@/hooks/useBackgroundImages';
import { cn } from '@/lib/utils';

// =============================================================================
// Component
// =============================================================================

interface BackgroundRotatorProps {
  /** Additional CSS classes */
  className?: string;
}

export function BackgroundRotator({ className }: BackgroundRotatorProps) {
  const { images, loading } = useBackgroundImages();

  // T004: Select ONE random image on mount using lazy initializer
  const [imageIndex] = useState(() => Math.floor(Math.random() * images.length));

  // Loading state - show gradient
  if (loading || images.length === 0) {
    return (
      <div
        className={cn('fixed inset-0 w-screen h-screen -z-10', className)}
        style={{ background: FALLBACK_GRADIENT }}
      />
    );
  }

  const selectedImage = images[imageIndex];

  return (
    <div className={cn('fixed inset-0 w-screen h-screen -z-10 overflow-hidden', className)}>
      {/* Static Background Image - T005: Full viewport coverage */}
      <Image
        src={selectedImage}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
