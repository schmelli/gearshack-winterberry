/**
 * SiteHeader Component
 *
 * Feature: 006-ui-makeover
 * FR-019: Vertical centering for all header elements
 * FR-020: Minimum 72px (h-18 in Tailwind) header height
 * FR-021: Balanced logo container spacing and nav baseline alignment
 *
 * Feature: 009-grand-visual-polish
 * FR-004: Light pastel green background (emerald-50 with 90% opacity)
 * FR-005: Vertical centering maintained
 * FR-006: Header height minimum 96px (h-24)
 * FR-007: Full viewport width background
 *
 * Feature: 012-visual-identity-fixes
 * User Story 1 (Brand Identity):
 * T002: Deep Forest Green background (#405A3D) with white text/icons
 * T004: Active page indicator (border-b-2 border-white)
 * T005: Larger nav font (text-lg font-bold)
 * T006: Logo in Rock Salt font, text-3xl, white color
 *
 * Feature: 027-i18n-next-intl
 * T021-T025: Add LanguageSwitcher, useTranslations, locale-aware Link
 */

'use client';

// T025: Replace next/link with locale-aware Link from i18n/navigation
import { Link, usePathname } from '@/i18n/navigation';
import Image from 'next/image';
import { Bell, Mail } from 'lucide-react';
// T022: Import useTranslations hook
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MAIN_NAV_ITEMS } from '@/lib/constants/navigation';
import { UserMenu } from './UserMenu';
import { MobileNav } from './MobileNav';
import { SyncIndicator } from './SyncIndicator';
// T021: Import LanguageSwitcher
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useState } from 'react';
import { useUnreadCount } from '@/hooks/messaging/useUnreadCount';
import { MessagingModal } from '@/components/messaging/MessagingModal';

interface SiteHeaderProps {
  className?: string;
}

export function SiteHeader({ className }: SiteHeaderProps) {
  const { user } = useAuthContext();
  const pathname = usePathname();
  // T022: Use translations from Navigation namespace
  const t = useTranslations('Navigation');
  // T012: Messaging modal state and unread count
  const [messagingOpen, setMessagingOpen] = useState(false);
  const { unreadCount } = useUnreadCount();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-[#405A3D]/20 bg-[#405A3D]',
        className
      )}
    >
      {/* FR-020: h-24 = 96px header height, items-center for FR-019 vertical centering */}
      <div className="container flex h-24 items-center">
        {/* Mobile menu trigger */}
        <MobileNav />

        {/* Logo and brand - FR-021: balanced spacing with gap-3 */}
        {/* T006: Logo in Rock Salt font, text-3xl, white color */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg">
            <Image
              src="/logos/small_gearshack_logo.png"
              alt="Gearshack Logo"
              width={80}
              height={80}
              className="h-20 w-20"
              priority
            />
          </div>
          <span className="font-[family-name:var(--font-rock-salt)] text-3xl leading-tight text-white">
            Gearshack
          </span>
        </Link>

        {/* Desktop navigation (right side) - FR-021: baseline alignment via items-baseline */}
        {/* T005: Larger nav font (text-lg font-bold) */}
        <nav className="ml-auto hidden items-baseline gap-8 md:flex">
          {MAIN_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.enabled ? item.href : '#'}
                aria-disabled={!item.enabled}
                tabIndex={item.enabled ? undefined : -1}
                className={cn(
                  'text-lg font-bold text-white transition-colors hover:text-white/80',
                  item.enabled
                    ? isActive
                      ? 'border-b-2 border-white'
                      : ''
                    : 'pointer-events-none opacity-50'
                )}
              >
                {/* T023: Use translation key for navigation text */}
                {t(item.translationKey as keyof IntlMessages['Navigation'])}
              </Link>
            );
          })}
        </nav>

        {/* Right side: sync indicator, language switcher, notifications and user menu */}
        <div className="flex items-center gap-2">
          {/* Sync indicator - only show when authenticated */}
          {user && <SyncIndicator />}

          {/* T021: Language switcher - toggle between EN/DE */}
          <LanguageSwitcher />

          {/* T012: Messaging icon with unread badge - only show when authenticated */}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:bg-white/10 hover:text-white"
              onClick={() => setMessagingOpen(true)}
            >
              <Mail className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <span className="sr-only">Messages</span>
            </Button>
          )}

          {/* Notification bell */}
          <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 hover:text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User menu */}
          <UserMenu />
        </div>
      </div>

      {/* T012: Messaging modal */}
      <MessagingModal open={messagingOpen} onOpenChange={setMessagingOpen} />
    </header>
  );
}
