/**
 * useAuthRedirect Hook
 *
 * Encapsulates the pattern of redirecting users based on authentication state.
 * Handles two common cases:
 * 1. Redirecting authenticated users away from login (to a return URL)
 * 2. Redirecting based on a computed redirect path (e.g. merchant auth guard)
 *
 * Feature: Code Quality Review
 * Extracts repeated useEffect redirect pattern from page components
 * following Feature-Sliced Light architecture (no useEffect in UI components).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects the user to a given path when an authenticated user is detected.
 * Used on pages like /login where authenticated users should be sent elsewhere.
 *
 * @param user - The current user object (null if not authenticated)
 * @param loading - Whether auth state is still loading
 * @param redirectTo - The path to redirect to when user is authenticated
 *
 * @example
 * const { user, loading } = useAuthContext();
 * useAuthenticatedRedirect(user, loading, '/inventory');
 */
export function useAuthenticatedRedirect(
  user: unknown,
  loading: boolean,
  redirectTo: string
): void {
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);
}

/**
 * Redirects the user based on a computed redirect path.
 * Used for auth guards that compute where to send unauthorized users.
 *
 * @param isLoading - Whether the auth check is still loading
 * @param redirectPath - The path to redirect to (null means no redirect needed)
 *
 * @example
 * const { isLoading, redirectPath } = useMerchantAuthGuard();
 * useConditionalRedirect(isLoading, redirectPath);
 */
export function useConditionalRedirect(
  isLoading: boolean,
  redirectPath: string | null
): void {
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && redirectPath) {
      router.push(redirectPath);
    }
  }, [isLoading, redirectPath, router]);
}
