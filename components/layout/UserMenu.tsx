/**
 * UserMenu Component
 *
 * Feature: 008-auth-and-profile
 * T018: Show user avatar and display name when authenticated
 * T031: Profile menu item opens ProfileModal
 * T051-T053: Sign out menu item with redirect to /login
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import { ProfileModal } from '@/components/profile/ProfileModal';

// =============================================================================
// Component
// =============================================================================

export function UserMenu() {
  const router = useRouter();
  const { user, signOut, profile } = useAuthContext();
  const { mergedUser } = profile;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Handle sign out (T052, T053)
  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  // Not authenticated - show sign in button
  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Link>
      </Button>
    );
  }

  // Authenticated - show user menu
  const displayName = mergedUser?.displayName || user.displayName || 'User';
  const avatarUrl = mergedUser?.avatarUrl || user.photoURL;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
            Profile
          </DropdownMenuItem>

          {/* Settings */}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Sign Out (T051) */}
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Modal (T029) */}
      <ProfileModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
    </>
  );
}
