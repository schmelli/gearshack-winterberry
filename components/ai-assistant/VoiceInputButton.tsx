/**
 * Voice Input Button Component
 * Feature: 001-mastra-agentic-voice
 * Task: T076 - Create voice input button (stateless)
 *
 * A microphone button that triggers voice recording.
 * Displays different states: idle, recording, processing.
 */

'use client';

import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// ============================================================================
// Types
// ============================================================================

export type VoiceButtonState = 'idle' | 'recording' | 'processing' | 'disabled' | 'error';

export interface VoiceInputButtonProps {
  /** Current state of the voice input */
  state: VoiceButtonState;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Additional class names */
  className?: string;
  /** Tooltip text override */
  tooltip?: string;
}

// ============================================================================
// Component
// ============================================================================

export function VoiceInputButton({
  state,
  onClick,
  disabled = false,
  size = 'default',
  className,
  tooltip,
}: VoiceInputButtonProps) {
  const t = useTranslations('AIAssistant');

  // Determine tooltip text
  const getTooltip = () => {
    if (tooltip) return tooltip;
    switch (state) {
      case 'idle':
        return t('voice.clickToStart');
      case 'recording':
        return t('voice.clickToStop');
      case 'processing':
        return t('voice.processing');
      case 'disabled':
        return t('voice.notAvailable');
      case 'error':
        return t('voice.errorRetry');
      default:
        return t('voice.label');
    }
  };

  // Determine icon
  const getIcon = () => {
    switch (state) {
      case 'recording':
        return <MicOff className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'disabled':
      case 'error':
        return <Mic className="h-4 w-4 opacity-50" />;
      default:
        return <Mic className="h-4 w-4" />;
    }
  };

  // Determine button variant
  const getVariant = (): 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' => {
    switch (state) {
      case 'recording':
        return 'destructive';
      case 'error':
        return 'destructive';
      default:
        return 'ghost';
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={getVariant()}
            size="icon"
            onClick={onClick}
            disabled={disabled || state === 'processing' || state === 'disabled'}
            className={cn(
              sizeClasses[size],
              'rounded-full transition-all duration-200',
              state === 'recording' && 'animate-pulse ring-2 ring-destructive ring-offset-2',
              className
            )}
            aria-label={getTooltip()}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{getTooltip()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
