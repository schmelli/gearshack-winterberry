/**
 * ProtectedRoute Component
 *
 * Feature: 008-auth-and-profile
 * T014: Route protection wrapper with redirect logic and loading state
 * FR-006, FR-007, FR-007a: Redirect unauthenticated users to /login
 * FR-009: Preserve originally requested URL and redirect back after login
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Loader2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  /** Optional fallback to render while checking auth (defaults to loading spinner) */
  fallback?: ReactNode;
}

// =============================================================================
// Loading Component
// =============================================================================

function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuthContext();

  useEffect(() => {
    // Wait for auth state to load
    if (loading) return;

    // Redirect to login if not authenticated
    if (!user) {
      // Store the return URL in query params (FR-009)
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [user, loading, router, pathname]);

  // Show loading state while checking auth
  if (loading) {
    return <>{fallback || <LoadingSpinner />}</>;
  }

  // Don't render children if not authenticated (redirect will happen)
  if (!user) {
    return <>{fallback || <LoadingSpinner />}</>;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
