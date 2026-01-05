/**
 * MobileNav Component
 *
 * Feature: 027-i18n-next-intl
 * T026: Use locale-aware Link from i18n/navigation
 *
 * Feature: 015 (Issue #15)
 * Add user profile and settings access to mobile menu
 *
 * Community Section Restructure
 * - Expandable Community section with sub-navigation items
 */

'use client';

import { useState } from 'react';
// T026: Replace next/link with locale-aware Link
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import Image from 'next/image';
import { User, Settings, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MAIN_NAV_ITEMS } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { AvatarWithFallback } from '@/components/profile/AvatarWithFallback';
import { getDisplayAvatarUrl } from '@/lib/utils/avatar';
import type { NavItemWithChildren } from '@/types/navigation';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MobileNavProps {
  items?: NavItemWithChildren[];
  onNavigate?: () => void;
  onProfileClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MobileNav({
  items = MAIN_NAV_ITEMS,
  onNavigate,
  onProfileClick,
  open: controlledOpen,
  onOpenChange,
}: MobileNavProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  // Track which expandable sections are open
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, profile } = useAuthContext();
  const { mergedUser } = profile;
  const t = useTranslations('Navigation');
  const tCommon = useTranslations('Common');

  // Toggle expanded state for collapsible items
  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

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
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
      // TODO: Consider showing a toast notification to the user
    }
  };

  // Get user display info
  const displayName = mergedUser?.displayName || user?.displayName || tCommon('genericUser');
  const avatarUrl = user ? getDisplayAvatarUrl(
    mergedUser?.avatarUrl,
    mergedUser?.providerAvatarUrl ?? user.photoURL
  ) : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Issue #77: Hamburger button removed - menu is triggered by logo click on mobile */}
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
        {/* Community Section Restructure: Items with children render as collapsible sections */}
        <nav className="flex flex-col gap-2">
          {items.map((item) => {
            // Items with children render as collapsible
            if (item.children && item.children.length > 0) {
              const isExpanded = expandedItems.has(item.href);
              const isActive = item.children.some(child =>
                pathname === child.href || (child.href !== '/community' && pathname.startsWith(child.href))
              );

              return (
                <Collapsible
                  key={item.href}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(item.href)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-3 py-2 text-base font-medium transition-colors',
                      item.enabled
                        ? isActive
                          ? 'bg-accent/50 text-foreground'
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        : 'pointer-events-none text-muted-foreground opacity-50'
                    )}
                    disabled={!item.enabled}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon && <item.icon className="h-5 w-5" />}
                      {t(item.translationKey as keyof IntlMessages['Navigation'])}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4">
                    <div className="flex flex-col gap-1 border-l border-border py-2 pl-4">
                      {item.children.map((child) => {
                        const Icon = child.icon;
                        const isChildActive = pathname === child.href ||
                          (child.href !== '/community' && pathname.startsWith(child.href));
                        return (
                          <Link
                            key={child.href}
                            href={child.enabled ? child.href : '#'}
                            aria-disabled={!child.enabled}
                            tabIndex={child.enabled ? undefined : -1}
                            onClick={child.enabled ? handleNavigate : undefined}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                              child.enabled
                                ? isChildActive
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                                : 'pointer-events-none text-muted-foreground opacity-50'
                            )}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            {t(child.translationKey as keyof IntlMessages['Navigation'])}
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            // Regular nav items without children
            return (
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
            );
          })}

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
