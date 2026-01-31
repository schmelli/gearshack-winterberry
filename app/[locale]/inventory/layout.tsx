'use client';

import { OnboardingHandler } from '@/components/onboarding';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

/**
 * Force dynamic rendering for inventory routes.
 *
 * Rationale (Performance Optimization Phase 5 audit):
 * - Protected route requiring authentication (user-specific content)
 * - Uses useSearchParams() for gear detail modal deep linking
 * - User's inventory data varies per user, cannot be statically generated
 * - Kept intentionally: ISR/static generation not suitable for authenticated routes
 */
export const dynamic = 'force-dynamic';

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = useAuthContext();

  return (
    <>
      {/* User Onboarding: Show onboarding modal for first-time users on inventory page */}
      <OnboardingHandler
        isAuthenticated={!!user}
        userId={user?.uid ?? null}
        profile={profile.rawProfile}
      />
      {children}
    </>
  );
}
