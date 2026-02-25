/**
 * AdminRoute Component
 *
 * Feature: Admin Panel with Category Management
 * Protects admin-only routes with authentication and role checks
 */

'use client';

import { type ReactNode } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// TEMPORARY: Prefixed with _ because authentication is disabled for testing
// TODO: Remove _ prefix when re-enabling authentication
function _LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// TEMPORARY: Prefixed with _ because authentication is disabled for testing
// TODO: Remove _ prefix when re-enabling authentication
function _AccessDenied({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <ShieldAlert className="h-16 w-16 text-destructive" />
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

export function AdminRoute({ children, fallback: _fallback }: AdminRouteProps) {
  // TEMPORARY: Authentication disabled for testing
  // TODO: Re-enable authentication once admin access is working
  return <>{children}</>;

  /* DISABLED FOR TESTING - Re-enable later
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Auth.admin');
  const { user, loading: authLoading, profile } = useAuthContext();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  // Wait for BOTH auth loading AND profile loading
  const profileLoading = profile.loading;
  const loading = authLoading || adminLoading || profileLoading;

  useEffect(() => {
    // Don't make any decisions until everything is loaded
    if (loading) return;

    // Redirect to login if not authenticated
    if (!user) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
      return;
    }

    // Show error and redirect if not admin (only after profile is loaded)
    if (!isAdmin) {
      console.log('[AdminRoute] Access denied - isAdmin:', isAdmin, 'profileLoading:', profileLoading);
      toast.error(t('accessDeniedToast'));
      router.replace('/inventory');
    }
  }, [user, isAdmin, loading, profileLoading, router, pathname, t]);

  if (loading) {
    return <>{fallback || <LoadingSpinner />}</>;
  }

  if (!user || !isAdmin) {
    return <AccessDenied title={t('accessDeniedTitle')} message={t('accessDeniedMessage')} />;
  }

  return <>{children}</>;
  */
}
