/**
 * Audio Playback Controls Component
 * Feature: 001-mastra-agentic-voice
 * Task: T078 - Create audio playback controls (pause, stop, volume)
 *
 * Controls for TTS audio playback with:
 * - Play/Pause toggle
 * - Stop button
 * - Volume slider
 */

'use client';

import { useTranslations } from 'next-intl';
import { Play, Pause, Square, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

export interface AudioPlaybackControlsProps {
  /** Current playback state */
  state: PlaybackState;
  /** Current volume (0-1) */
  volume: number;
  /** Play/resume handler */
  onPlay: () => void;
  /** Pause handler */
  onPause: () => void;
  /** Stop handler */
  onStop: () => void;
  /** Volume change handler */
  onVolumeChange: (volume: number) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'default';
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AudioPlaybackControls({
  state,
  volume,
  onPlay,
  onPause,
  onStop,
  onVolumeChange,
  disabled = false,
  size = 'default',
  className,
}: AudioPlaybackControlsProps) {
  const t = useTranslations('AIAssistant');
  const isPlaying = state === 'playing';
  const isLoading = state === 'loading';
  const isMuted = volume === 0;

  // Size classes
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <TooltipProvider>
      <div
        className={cn(
          'inline-flex items-center gap-1 p-1 rounded-lg',
          'bg-muted/50',
          className
        )}
      >
        {/* Play/Pause button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={isPlaying ? onPause : onPlay}
              disabled={disabled || isLoading}
              className={cn(buttonSize, 'rounded-full')}
              aria-label={isPlaying ? t('ariaLabels.pause') : t('ariaLabels.play')}
            >
              {isLoading ? (
                <Loader2 className={cn(iconSize, 'animate-spin')} />
              ) : isPlaying ? (
                <Pause className={iconSize} />
              ) : (
                <Play className={iconSize} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isLoading ? t('voice.loading') : isPlaying ? t('ariaLabels.pause') : t('ariaLabels.play')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Stop button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStop}
              disabled={disabled || state === 'idle'}
              className={cn(buttonSize, 'rounded-full')}
              aria-label={t('ariaLabels.stop')}
            >
              <Square className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t('ariaLabels.stop')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Volume control */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  className={cn(buttonSize, 'rounded-full')}
                  aria-label={t('ariaLabels.volume')}
                >
                  {isMuted ? (
                    <VolumeX className={iconSize} />
                  ) : (
                    <Volume2 className={iconSize} />
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t('ariaLabels.volume')}: {Math.round(volume * 100)}%</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent side="top" className="w-32 p-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('ariaLabels.volume')}
              </p>
              <Slider
                value={[volume * 100]}
                onValueChange={([value]: number[]) => onVolumeChange(value / 100)}
                max={100}
                step={5}
                className="w-full"
                aria-label={t('ariaLabels.volume')}
              />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(volume * 100)}%
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Inline Variant
// ============================================================================

export interface InlinePlayButtonProps {
  /** Whether currently playing */
  isPlaying: boolean;
  /** Whether loading */
  isLoading?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Whether disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Simple inline play/pause button for message bubbles
 */
export function InlinePlayButton({
  isPlaying,
  isLoading = false,
  onClick,
  disabled = false,
  className,
}: InlinePlayButtonProps) {
  const t = useTranslations('AIAssistant');

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'h-6 w-6 rounded-full',
        'hover:bg-primary/10',
        className
      )}
      aria-label={isPlaying ? t('ariaLabels.pause') : t('ariaLabels.playAudio')}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isPlaying ? (
        <Pause className="h-3 w-3" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
    </Button>
  );
}
