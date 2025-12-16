/**
 * Loadout Hero Image Section
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Uses custom hook for logic, stateless UI components
 */

'use client';

import { useEffect, useState } from 'react';
import { useLoadoutImageGeneration } from '@/hooks/useLoadoutImageGeneration';
import { ImageGenerationButton } from '@/components/loadout/image-generation-button';
import { GeneratedImagePreview } from '@/components/loadout/generated-image-preview';
import { FallbackImagePlaceholder } from '@/components/loadout/fallback-image-placeholder';
import { ImageHistorySelector } from '@/components/loadout/image-history-selector';
import { StylePreferencesForm } from '@/components/loadout/style-preferences-form';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import type { Loadout } from '@/types/loadout';
import type { StylePreferences } from '@/types/loadout-image';

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
    imageHistory,
    generateImage,
    setActiveImage,
    refreshHistory,
  } = useLoadoutImageGeneration({
    loadoutId: loadout.id,
    loadoutTitle: loadout.name,
    loadoutDescription: loadout.description || undefined,
    season: loadout.seasons?.[0] || undefined,
    activityTypes: loadout.activityTypes || undefined,
    userId,
  });

  // Style preferences state (Phase 5 - US3)
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load history on mount
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const handleGenerateClick = () => {
    generateImage(stylePreferences);
  };

  const handleSelectImage = (imageId: string) => {
    setActiveImage(imageId);
  };

  // Determine text color based on image brightness
  // TODO: Implement dynamic brightness analysis in Phase 7
  const textColorClass = 'text-white';

  const isGenerating = state.status === 'generating' || state.status === 'retrying';

  return (
    <div className="space-y-4">
      {/* Image Preview or Placeholder */}
      {isGenerating ? (
        <FallbackImagePlaceholder
          state="loading"
        />
      ) : state.status === 'error' ? (
        <FallbackImagePlaceholder
          state="error"
          errorMessage={state.error}
        />
      ) : state.status === 'fallback' && activeImage ? (
        <FallbackImagePlaceholder
          state="fallback"
          fallbackUrl={activeImage.cloudinaryUrl}
          altText={activeImage.altText || 'Fallback loadout image'}
        />
      ) : activeImage ? (
        <GeneratedImagePreview
          imageUrl={activeImage.cloudinaryUrl}
          altText={activeImage.altText || 'Generated loadout image'}
          isLoading={false}
          loadoutTitle={loadout.name}
          itemCount={itemCount}
          totalWeight={totalWeight}
          textColorClass={textColorClass}
        />
      ) : (
        <FallbackImagePlaceholder state="empty" />
      )}

      {/* Image History Selector (Phase 4 - US2) */}
      {imageHistory.length > 0 && (
        <ImageHistorySelector
          images={imageHistory}
          activeImageId={activeImage?.id || null}
          onSelectImage={handleSelectImage}
        />
      )}

      {/* Advanced Style Preferences (Phase 5 - US3) */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full">
            <ChevronDown
              className={`mr-2 h-4 w-4 transition-transform ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
            Advanced Style Options
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <StylePreferencesForm
            stylePreferences={stylePreferences}
            onChange={setStylePreferences}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Generation Buttons */}
      <div className="flex justify-center gap-2">
        <ImageGenerationButton
          onClick={handleGenerateClick}
          isGenerating={isGenerating}
          disabled={!loadout.name || isGenerating}
          label={activeImage ? 'Generate Another' : 'Generate Image'}
        />
      </div>
    </div>
  );
}
