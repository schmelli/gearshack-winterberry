'use client';

import { OnboardingHandler } from '@/components/onboarding';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

// Force dynamic rendering for inventory routes that use useSearchParams()
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
