/**
 * Image Generation Button Component
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Stateless component - receives onClick callback via props
 */

'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageGenerationButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;

  /** Button disabled state */
  disabled?: boolean;

  /** Whether generation is currently in progress */
  isGenerating?: boolean;

  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';

  /** Additional CSS classes */
  className?: string;

  /** Button label text */
  label?: string;
}

/**
 * Button component to trigger AI image generation
 * Displays loading state during generation
 */
export function ImageGenerationButton({
  onClick,
  disabled = false,
  isGenerating = false,
  variant = 'default',
  className,
  label,
}: ImageGenerationButtonProps) {
  const t = useTranslations('Loadouts.imageGeneration');
  const resolvedLabel = label ?? t('generateImage');

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isGenerating}
      variant={variant}
      className={cn('gap-2', className)}
      aria-label={isGenerating ? t('generatingAriaLabel') : resolvedLabel}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{t('generating')}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>{resolvedLabel}</span>
        </>
      )}
    </Button>
  );
}
