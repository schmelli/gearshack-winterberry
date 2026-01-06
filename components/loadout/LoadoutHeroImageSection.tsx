/**
 * Loadout Hero Image Section
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Uses custom hook for logic, stateless UI components
 *
 * Premium layout with full-width hero, integrated navigation,
 * action buttons, and badges overlay.
 *
 * Simplified UX: Auto-generates image when no image exists.
 * Single regenerate button in corner for generating new images.
 */

'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { useLoadoutImageGeneration } from '@/hooks/useLoadoutImageGeneration';
import { LoadoutHeroImage } from '@/components/loadout/LoadoutHeroImage';
import type { Loadout } from '@/types/loadout';

export interface LoadoutHeroImageSectionProps {
  loadout: Loadout;
  userId: string;
  totalWeight?: string;
  itemCount?: number;
  /** Back link URL */
  backHref?: string;
  /** Back link label */
  backLabel?: string;
  /** Action buttons to display in top-right (edit, share, export, etc.) */
  actionButtons?: ReactNode;
  /** Badges to display (activity types, seasons) */
  badges?: ReactNode;
}

export function LoadoutHeroImageSection({
  loadout,
  userId,
  totalWeight,
  itemCount,
  backHref = '/loadouts',
  backLabel,
  actionButtons,
  badges,
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

  // Track initialization state
  const hasAttemptedGeneration = useRef(false);
  const hasLoadedHistory = useRef(false);

  // Load history on mount
  useEffect(() => {
    const initializeImage = async () => {
      await refreshHistory();
      hasLoadedHistory.current = true;
    };
    initializeImage();
  }, [refreshHistory]);

  // Auto-generate ONLY if:
  // 1. History has been loaded (not just null because we haven't fetched yet)
  // 2. No existing image in the loadout (from database)
  // 3. No active image from history
  // 4. Haven't already attempted generation this session
  useEffect(() => {
    // Wait until history has been loaded
    if (!hasLoadedHistory.current) return;

    // Check if loadout already has an image (from database load)
    const hasExistingImage = !!loadout.heroImageUrl;

    if (
      !hasExistingImage &&
      !activeImage &&
      !hasAttemptedGeneration.current &&
      state.status === 'idle' &&
      loadout.name
    ) {
      hasAttemptedGeneration.current = true;
      generateImage();
    }
  }, [activeImage, state.status, loadout.name, loadout.heroImageUrl, generateImage]);

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
      backHref={backHref}
      backLabel={backLabel}
      actionButtons={actionButtons}
      badges={badges}
    />
  );
}
