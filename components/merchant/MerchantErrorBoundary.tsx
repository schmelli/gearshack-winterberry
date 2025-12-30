/**
 * MerchantErrorBoundary Component
 *
 * Feature: 053-merchant-integration
 * Task: T092
 *
 * Error boundary for merchant portal components.
 * Catches errors from merchant hooks and components without crashing the entire page.
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
import { AlertTriangle, RefreshCw, Store } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface MerchantErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional custom reset handler */
  onReset?: () => void;
  /** Custom title for the error message */
  title?: string;
}

interface MerchantErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Error boundary specifically for merchant portal components.
 * Prevents merchant errors from crashing the entire merchant portal.
 *
 * @example
 * <MerchantErrorBoundary title="Failed to load dashboard">
 *   <MerchantDashboard ... />
 * </MerchantErrorBoundary>
 */
export class MerchantErrorBoundary extends Component<
  MerchantErrorBoundaryProps,
  MerchantErrorBoundaryState
> {
  constructor(props: MerchantErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): MerchantErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('MerchantErrorBoundary caught error:', error);
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
    const { children, fallback, title } = this.props;

    if (hasError) {
      // Custom fallback UI if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-8 text-center">
          <div className="mb-4 rounded-full bg-amber-100 dark:bg-amber-900/50 p-4">
            <div className="relative">
              <Store className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              <AlertTriangle className="absolute -right-1 -bottom-1 h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="mb-2 text-base font-medium text-amber-800 dark:text-amber-200">
            {title || 'Something went wrong'}
          </h3>
          <p className="mb-6 text-sm text-amber-700/80 dark:text-amber-300/70 max-w-sm">
            {error?.message || 'An unexpected error occurred in the merchant portal'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return children;
  }
}

// =============================================================================
// Helper Types and Components
// =============================================================================

/**
 * Props for MerchantErrorFallback component
 * Used when providing a custom fallback with reset capability
 */
export interface MerchantErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
}

/**
 * Default error fallback component for merchant features
 * Can be used standalone or customized
 */
export function MerchantErrorFallback({
  error,
  resetErrorBoundary,
  title,
}: MerchantErrorFallbackProps): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-8 text-center">
      <div className="mb-4 rounded-full bg-amber-100 dark:bg-amber-900/50 p-4">
        <div className="relative">
          <Store className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          <AlertTriangle className="absolute -right-1 -bottom-1 h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
      <h3 className="mb-2 text-base font-medium text-amber-800 dark:text-amber-200">
        {title || 'Something went wrong'}
      </h3>
      <p className="mb-6 text-sm text-amber-700/80 dark:text-amber-300/70 max-w-sm">
        {error.message || 'An unexpected error occurred in the merchant portal'}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={resetErrorBoundary}
        className="gap-2 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

export default MerchantErrorBoundary;
