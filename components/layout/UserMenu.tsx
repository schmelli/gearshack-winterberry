/**
 * UserMenu Component
 *
 * Feature: 008-auth-and-profile
 * T018: Show user avatar and display name when authenticated
 * T031: Profile menu item opens ProfileModal
 * T051-T053: Sign out menu item with redirect to /login
 *
 * Feature: 027-i18n-next-intl
 * T027: Use locale-aware Link and useRouter from i18n/navigation
 *
 * Feature: 041-loadout-ux-profile
 * Avatar fallback chain: custom > provider > initials
 */

'use client';

import { useState, Suspense } from 'react';
// T027: Replace next/link and next/navigation with locale-aware versions
import { Link, useRouter } from '@/i18n/navigation';
import { User, Settings, LogOut, LogIn, Shield, Bug } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { getDisplayAvatarUrl } from '@/lib/utils/avatar';

// =============================================================================
// Component
// =============================================================================

export function UserMenu() {
  const router = useRouter();
  const { user, signOut, profile } = useAuthContext();
  const { mergedUser } = profile;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const t = useTranslations('Navigation');

  // Handle sign out (T052, T053)
  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  // Not authenticated - show sign in button
  if (!user) {
    return (
      <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" asChild>
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          {t('login')}
        </Link>
      </Button>
    );
  }

  // Authenticated - show user menu
  const displayName = mergedUser?.displayName || user.displayName || 'User';
  // Feature 041: Use avatar fallback chain (custom > provider > initials)
  const avatarUrl = getDisplayAvatarUrl(
    mergedUser?.avatarUrl,
    mergedUser?.providerAvatarUrl ?? user.photoURL
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/10">
            <AvatarWithFallback
              src={avatarUrl}
              name={displayName}
              size="sm"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* User Info Header */}
          <div className="flex items-center gap-2 p-2">
            <AvatarWithFallback
              src={avatarUrl}
              name={displayName}
              size="md"
            />
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {user.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Profile (T031) */}
          <DropdownMenuItem
            onClick={() => setIsProfileModalOpen(true)}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            {t('profile')}
          </DropdownMenuItem>

          {/* Settings */}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              {t('settings')}
            </Link>
          </DropdownMenuItem>

          {/* Admin - Only visible to admin users */}
          {mergedUser?.isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                {t('admin')}
              </Link>
            </DropdownMenuItem>
          )}

          {/* Report Bug - Sentry User Feedback */}
          <DropdownMenuItem
            onClick={() => {
              const feedback = Sentry.getFeedback();
              if (feedback) {
                // Create and immediately open the feedback widget
                const widget = feedback.createWidget();
                widget.open();
              }
            }}
            className="cursor-pointer"
          >
            <Bug className="mr-2 h-4 w-4" />
            {t('reportBug')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Sign Out (T051) */}
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Modal (T029) - Wrapped in Suspense for useSearchParams
          ProfileModal uses useGearDetailModal hook which calls useSearchParams internally.
          Next.js requires Suspense boundaries for components using useSearchParams.
          fallback={null} is appropriate here because:
          1. The modal is hidden by default (open={false})
          2. The fallback only shows during initial streaming/hydration
          3. Users never see this state since the modal starts closed
          4. ProfileModal handles its own internal loading states when open */}
      <Suspense fallback={null}>
        <ProfileModal
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
        />
      </Suspense>
    </>
  );
}
