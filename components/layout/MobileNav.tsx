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
import { User, Settings, LogOut, ChevronDown, ChevronRight, Shield, Pencil, Plus, Calendar, FileEdit, HelpCircle, Bug, MessageSquarePlus, Sun, Moon } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MAIN_NAV_ITEMS } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
  onOpenMessaging?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Feature flag: is messaging feature enabled */
  isMessagingEnabled?: boolean;
  /** Feature flag: is community feature enabled */
  isCommunityEnabled?: boolean;
}

export function MobileNav({
  items = MAIN_NAV_ITEMS,
  onNavigate,
  onProfileClick,
  onOpenMessaging,
  open: controlledOpen,
  onOpenChange,
  isMessagingEnabled = true,
  isCommunityEnabled = true,
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
  const { theme, setTheme } = useTheme();

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

  const handleOpenMessaging = () => {
    setOpen(false);
    onOpenMessaging?.();
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
      <SheetContent side="left" className="flex h-full w-72 max-w-[85vw] flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>{t('navigation')}</SheetTitle>
        </SheetHeader>

        {/* User info section (if authenticated) */}
        {user && (
          <>
            <div className="mt-2 flex flex-col items-center gap-3 p-4">
              <div className="relative">
                <AvatarWithFallback
                  src={avatarUrl}
                  name={displayName}
                  size="xl"
                />
                <Link
                  href="/settings"
                  onClick={handleNavigate}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-110 hover:shadow-lg"
                  aria-label={t('settings')}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-center text-base font-medium leading-none">{displayName}</p>
            </div>

            {/* Quick action buttons - direct links to create pages */}
            {/* Feature Flags: Conditionally show actions based on enabled features */}
            <div className="mt-4 grid grid-cols-4 gap-2 px-2">
              <Link
                href="/inventory/new"
                onClick={handleNavigate}
                className="flex flex-col items-center gap-1 rounded-md p-2 transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-center text-[10px] font-medium leading-tight">{t('addNewItem')}</span>
              </Link>
              <Link
                href="/loadouts/new"
                onClick={handleNavigate}
                className="flex flex-col items-center gap-1 rounded-md p-2 transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-center text-[10px] font-medium leading-tight">{t('planNewLoadout')}</span>
              </Link>
              {/* Feature Flag: Only show "New Shakedown" if community is enabled */}
              {isCommunityEnabled && (
                <Link
                  href="/community/shakedowns/new"
                  onClick={handleNavigate}
                  className="flex flex-col items-center gap-1 rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <FileEdit className="h-4 w-4" />
                  </div>
                  <span className="text-center text-[10px] font-medium leading-tight">{t('generateNewPost')}</span>
                </Link>
              )}
              {/* Feature Flag: Only show "New Message" if messaging is enabled */}
              {isMessagingEnabled && (
                <button
                  onClick={handleOpenMessaging}
                  className="flex flex-col items-center gap-1 rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <MessageSquarePlus className="h-4 w-4" />
                  </div>
                  <span className="text-center text-[10px] font-medium leading-tight">{t('newMessage')}</span>
                </button>
              )}
            </div>

            <Separator className="my-4" />
          </>
        )}

        {/* Main navigation items */}
        {/* Community Section Restructure: Items with children render as collapsible sections */}
        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2" aria-label={t('navigation')}>
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
                      'flex w-full items-center justify-between rounded-md px-4 py-2.5 text-base font-medium transition-colors',
                      item.enabled
                        ? isActive
                          ? 'bg-primary text-primary-foreground'
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
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.enabled ? item.href : '#'}
                aria-disabled={!item.enabled}
                tabIndex={item.enabled ? undefined : -1}
                onClick={item.enabled ? handleNavigate : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-4 py-2.5 text-base font-medium transition-colors',
                  item.enabled
                    ? isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
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
                className="flex items-center gap-3 rounded-md px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="h-5 w-5" />
                {t('profile')}
              </button>

              <Link
                href="/settings"
                onClick={handleNavigate}
                className="flex items-center gap-3 rounded-md px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="h-5 w-5" />
                {t('settings')}
              </Link>

              {/* Admin - Only visible to admin users */}
              {mergedUser?.isAdmin && (
                <Link
                  href="/admin"
                  onClick={handleNavigate}
                  className="flex items-center gap-3 rounded-md px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Shield className="h-5 w-5" />
                  {t('admin')}
                </Link>
              )}

              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Implement help center
                }}
                className="flex items-center gap-3 rounded-md px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <HelpCircle className="h-5 w-5" />
                {t('helpCenter')}
              </Link>

              <button
                onClick={() => {
                  handleNavigate();
                  Sentry.showReportDialog();
                }}
                className="flex items-center gap-3 rounded-md px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Bug className="h-5 w-5" />
                {t('reportBug')}
              </button>

              <Separator className="my-2" />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 rounded-md px-4 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-5 w-5" />
                {t('signOut')}
              </button>
            </>
          )}
        </nav>

        {/* Theme toggle - fixed at bottom with flexible spacing */}
        <div className="mt-auto border-t px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="text-base font-medium">
                {theme === 'dark' ? t('darkMode') : t('lightMode')}
              </span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              aria-label={t('themeToggle')}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
