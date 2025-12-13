/**
 * MobileNav Component
 *
 * Feature: 027-i18n-next-intl
 * T026: Use locale-aware Link from i18n/navigation
 *
 * Feature: 015 (Issue #15)
 * Add user profile and settings access to mobile menu
 */

'use client';

import { useState } from 'react';
// T026: Replace next/link with locale-aware Link
import { Link, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import { Menu, User, Settings, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MAIN_NAV_ITEMS } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import { getDisplayAvatarUrl } from '@/lib/utils/avatar';
import type { NavItem } from '@/types/navigation';

interface MobileNavProps {
  items?: NavItem[];
  onNavigate?: () => void;
  onProfileClick?: () => void;
}

export function MobileNav({
  items = MAIN_NAV_ITEMS,
  onNavigate,
  onProfileClick,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, signOut, profile } = useAuthContext();
  const { mergedUser } = profile;
  const t = useTranslations('Navigation');

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  const handleProfileClick = () => {
    setOpen(false);
    onProfileClick?.();
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace('/login');
  };

  // Get user display info
  const displayName = mergedUser?.displayName || user?.displayName || 'User';
  const avatarUrl = user ? getDisplayAvatarUrl(
    mergedUser?.avatarUrl,
    mergedUser?.providerAvatarUrl ?? user.photoURL
  ) : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Image
              src="/logos/small_gearshack_logo.png"
              alt="Gearshack Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-[family-name:var(--font-rock-salt)] text-base">
              Gearshack
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* User info section (if authenticated) */}
        {user && (
          <>
            <div className="mt-6 flex items-center gap-3 rounded-md bg-accent/10 p-3">
              <AvatarWithFallback
                src={avatarUrl}
                name={displayName}
                size="md"
              />
              <div className="flex flex-col space-y-0.5 overflow-hidden">
                <p className="truncate text-sm font-medium leading-none">{displayName}</p>
                {user.email && (
                  <p className="truncate text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
            <Separator className="my-4" />
          </>
        )}

        {/* Main navigation items */}
        <nav className="flex flex-col gap-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.enabled ? item.href : '#'}
              aria-disabled={!item.enabled}
              tabIndex={item.enabled ? undefined : -1}
              onClick={item.enabled ? handleNavigate : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors',
                item.enabled
                  ? 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  : 'pointer-events-none text-muted-foreground opacity-50'
              )}
            >
              {item.icon && <item.icon className="h-5 w-5" />}
              {/* Use translation key for i18n */}
              {t(item.translationKey as keyof IntlMessages['Navigation'])}
            </Link>
          ))}

          {/* User menu items (if authenticated) */}
          {user && (
            <>
              <Separator className="my-2" />

              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="h-5 w-5" />
                {t('profile')}
              </button>

              <Link
                href="/settings"
                onClick={handleNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="h-5 w-5" />
                {t('settings')}
              </Link>

              <Separator className="my-2" />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                {t('signOut')}
              </button>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
