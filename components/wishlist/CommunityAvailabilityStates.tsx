/**
 * CommunityAvailabilityStates Components
 *
 * Extracted from CommunityAvailabilityPanel.tsx
 * Provides state display components: Loading, Retrying, Error, and Empty states.
 *
 * Tasks: T047, T077, T082, T084
 */

'use client';

import { Loader2, RefreshCw, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

// =============================================================================
// Loading State - T082
// =============================================================================

interface LoadingStateProps {
  /** Text shown visually while checking community */
  checkingCommunity: string;
  /** Screen reader announcement for loading state */
  loadingMessage: string;
}

export function CommunityLoadingState({ checkingCommunity, loadingMessage }: LoadingStateProps) {
  return (
    <div
      className="flex items-center justify-center py-4"
      role="status"
      aria-busy="true"
      aria-label={loadingMessage}
    >
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="ml-2 text-xs text-muted-foreground">
        {checkingCommunity}
      </span>
      {/* T084: Screen reader announcement for loading state */}
      <VisuallyHidden aria-live="polite">
        {loadingMessage}
      </VisuallyHidden>
    </div>
  );
}

// =============================================================================
// T077: Retrying State
// =============================================================================

interface RetryingStateProps {
  /** Current retry attempt number */
  retryCount: number;
  /** Text shown visually during retry */
  retryingText: string;
  /** Screen reader announcement for retry state */
  retryingMessage: string;
}

export function CommunityRetryingState({ retryCount: _retryCount, retryingText, retryingMessage }: RetryingStateProps) {
  return (
    <div
      className="flex items-center justify-center py-4"
      role="status"
      aria-busy="true"
      aria-label={retryingMessage}
    >
      <RefreshCw className="h-4 w-4 animate-spin text-amber-500" aria-hidden="true" />
      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
        {retryingText}
      </span>
      <VisuallyHidden aria-live="polite">
        {retryingMessage}
      </VisuallyHidden>
    </div>
  );
}

// =============================================================================
// T077: Error State with Manual Retry
// =============================================================================

interface ErrorStateProps {
  /** Callback for manual retry */
  onRetry?: () => void;
  /** Error message text */
  loadFailed: string;
  /** Retry button label */
  tryAgain: string;
}

export function CommunityErrorState({ onRetry, loadFailed, tryAgain }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-4 text-center"
      role="alert"
      aria-label={loadFailed}
    >
      <AlertTriangle className="h-5 w-5 text-destructive/70 mb-1.5" aria-hidden="true" />
      <p className="text-xs text-destructive/80">
        {loadFailed}
      </p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="mt-2 h-7 px-3 text-xs gap-1.5"
          aria-label={tryAgain}
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {tryAgain}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Empty State - T047, T082
// =============================================================================

interface EmptyStateProps {
  /** No matches message */
  noMatches: string;
  /** Encouragement text */
  beFirst: string;
}

export function CommunityEmptyState({ noMatches, beFirst }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-4 text-center"
      role="status"
      aria-label={noMatches}
    >
      <Users className="h-6 w-6 text-muted-foreground/50 mb-1.5" aria-hidden="true" />
      <p className="text-xs text-muted-foreground">
        {noMatches}
      </p>
      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
        {beFirst}
      </p>
    </div>
  );
}
