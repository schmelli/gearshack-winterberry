/**
 * Voice Recording Indicator Component
 * Feature: 001-mastra-agentic-voice
 * Task: T077 - Create recording indicator (pulsing animation)
 *
 * Visual feedback during voice recording with:
 * - Pulsing animation
 * - Duration display
 * - Cancel button
 */

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface VoiceRecordingIndicatorProps {
  /** Recording duration in milliseconds */
  durationMs: number;
  /** Cancel recording handler */
  onCancel: () => void;
  /** Whether currently recording */
  isRecording: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `0:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// Component
// ============================================================================

export function VoiceRecordingIndicator({
  durationMs,
  onCancel,
  isRecording,
  className,
}: VoiceRecordingIndicatorProps) {
  if (!isRecording) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-full',
        'bg-destructive/10 border border-destructive/20',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        className
      )}
    >
      {/* Pulsing dot */}
      <div className="relative">
        <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
        <div className="absolute inset-0 h-3 w-3 rounded-full bg-destructive animate-ping opacity-75" />
      </div>

      {/* Recording text */}
      <span className="text-sm font-medium text-destructive">
        Recording
      </span>

      {/* Duration */}
      <span className="text-sm tabular-nums text-destructive/80 min-w-[3rem]">
        {formatDuration(durationMs)}
      </span>

      {/* Cancel button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCancel}
        className="h-6 w-6 rounded-full hover:bg-destructive/20"
        aria-label="Cancel recording"
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface VoiceRecordingBadgeProps {
  /** Recording duration in milliseconds */
  durationMs: number;
  /** Additional class names */
  className?: string;
}

/**
 * Compact recording badge for inline display
 */
export function VoiceRecordingBadge({
  durationMs,
  className,
}: VoiceRecordingBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-full',
        'bg-destructive/10 text-destructive text-xs font-medium',
        className
      )}
    >
      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
      <span className="tabular-nums">{formatDuration(durationMs)}</span>
    </div>
  );
}
