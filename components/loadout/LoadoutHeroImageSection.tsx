/**
 * Loadout Hero Image Section
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Uses custom hook for logic, stateless UI components
 *
 * Simplified UX: Auto-generates image when no image exists.
 * Single regenerate button in corner for generating new images.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useLoadoutImageGeneration } from '@/hooks/useLoadoutImageGeneration';
import { LoadoutHeroImage } from '@/components/loadout/LoadoutHeroImage';
import type { Loadout } from '@/types/loadout';

export interface LoadoutHeroImageSectionProps {
  loadout: Loadout;
  userId: string;
  totalWeight?: string;
  itemCount?: number;
}

export function LoadoutHeroImageSection({
  loadout,
  userId,
  totalWeight,
  itemCount,
}: LoadoutHeroImageSectionProps) {
  const {
    state,
    activeImage,
    generateImage,
    refreshHistory,
  } = useLoadoutImageGeneration({
    loadoutId: loadout.id,
    loadoutTitle: loadout.name,
    loadoutDescription: loadout.description || undefined,
    season: loadout.seasons?.[0] || undefined,
    activityTypes: loadout.activityTypes || undefined,
    userId,
  });

  // Track if we've already attempted auto-generation this session
  const hasAttemptedGeneration = useRef(false);

  // Load history on mount and auto-generate if no image exists
  useEffect(() => {
    const initializeImage = async () => {
      await refreshHistory();
    };
    initializeImage();
  }, [refreshHistory]);

  // Auto-generate image when no active image and not yet attempted
  useEffect(() => {
    if (
      !activeImage &&
      !hasAttemptedGeneration.current &&
      state.status === 'idle' &&
      loadout.name
    ) {
      hasAttemptedGeneration.current = true;
      generateImage();
    }
  }, [activeImage, state.status, loadout.name, generateImage]);

  const isGenerating = state.status === 'generating' || state.status === 'retrying';

  const handleRegenerate = () => {
    generateImage();
  };

  return (
    <LoadoutHeroImage
      imageUrl={activeImage?.cloudinaryUrl || null}
      altText={activeImage?.altText || 'Loadout hero image'}
      loadoutTitle={loadout.name}
      itemCount={itemCount}
      totalWeight={totalWeight}
      isGenerating={isGenerating}
      errorMessage={state.status === 'error' ? state.error : undefined}
      onRegenerate={handleRegenerate}
    />
  );
}
