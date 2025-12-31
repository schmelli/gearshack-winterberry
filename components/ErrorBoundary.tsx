/**
 * ErrorBoundary Component
 *
 * React error boundary for catching and handling component errors gracefully.
 * Prevents entire page crashes when individual components fail.
 */

'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback onReset={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  onReset: () => void;
}

function DefaultErrorFallback({ onReset }: DefaultErrorFallbackProps) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="font-semibold text-foreground">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This component encountered an error. Try refreshing or contact support if this persists.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Lightweight error fallback for sidebar panels
 */
export function PanelErrorFallback() {
  return (
    <Card className="border-destructive/30">
      <CardContent className="py-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Unable to load this panel
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ErrorBoundary;
