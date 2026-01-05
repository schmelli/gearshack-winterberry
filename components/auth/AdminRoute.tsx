/**
 * AdminRoute Component
 *
 * Feature: Admin Panel with Category Management
 * Protects admin-only routes with authentication and role checks
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface AdminRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AccessDenied({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <ShieldAlert className="h-16 w-16 text-destructive" />
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

export function AdminRoute({ children, fallback }: AdminRouteProps) {
  // TEMPORARY: Authentication disabled for testing
  // TODO: Re-enable authentication once admin access is working
  console.log('[AdminRoute] ⚠️  AUTHENTICATION DISABLED - ALLOW ALL ACCESS');

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
