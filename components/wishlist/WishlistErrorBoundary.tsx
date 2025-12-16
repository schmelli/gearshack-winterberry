/**
 * WishlistErrorBoundary Component
 *
 * Feature: 049-wishlist-view (Phase 7)
 * Task: T076
 *
 * Error boundary for wishlist-specific components.
 * Catches errors from useCommunityAvailability and useWishlist hooks
 * without crashing the entire page.
 *
 * Provides:
 * - Fallback UI with user-friendly error message
 * - "Try again" button to reset error state
 * - Error logging for debugging
 *
 * Architecture: Feature-Sliced Light (React Class Component for error boundary)
 */

'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface WishlistErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional custom reset handler */
  onReset?: () => void;
}

interface WishlistErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Error boundary specifically for wishlist components.
 * Prevents wishlist errors from crashing the entire inventory page.
 *
 * @example
 * <WishlistErrorBoundary>
 *   <CommunityAvailabilityPanel ... />
 * </WishlistErrorBoundary>
 */
export class WishlistErrorBoundary extends Component<
  WishlistErrorBoundaryProps,
  WishlistErrorBoundaryState
> {
  constructor(props: WishlistErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): WishlistErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('WishlistErrorBoundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });

    // Call optional reset callback
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback UI if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <div className="mb-3 rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="mb-1 text-sm font-medium text-destructive">
            Something went wrong with wishlist
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </Button>
        </div>
      );
    }

    return children;
  }
}

// =============================================================================
// Helper Hook for Functional Error Reset
// =============================================================================

/**
 * Props for WishlistErrorFallback component
 * Used when providing a custom fallback with reset capability
 */
export interface WishlistErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Default error fallback component
 * Can be used standalone or customized
 */
export function WishlistErrorFallback({
  error,
  resetErrorBoundary,
}: WishlistErrorFallbackProps): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
      <div className="mb-3 rounded-full bg-destructive/10 p-3">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-destructive">
        Something went wrong with wishlist
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={resetErrorBoundary}
        className="gap-2"
      >
        <RefreshCw className="h-3 w-3" />
        Try again
      </Button>
    </div>
  );
}
