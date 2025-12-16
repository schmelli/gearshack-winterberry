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
import { useNotifications } from '@/hooks/useNotifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from '@/i18n/navigation';
import { formatDistanceToNow } from 'date-fns';
// Feature 050: AI Assistant
import { AIAssistantButton } from '@/components/ai-assistant/AIAssistantButton';
import { AIAssistantModal } from '@/components/ai-assistant/AIAssistantModal';
import { UpgradeModal } from '@/components/ai-assistant/UpgradeModal';
import { useSubscriptionCheck } from '@/hooks/ai-assistant/useSubscriptionCheck';
import { logAIEvent } from '@/lib/ai-assistant/observability';

interface SiteHeaderProps {
  className?: string;
}

export function SiteHeader({ className }: SiteHeaderProps) {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  // T022: Use translations from Navigation namespace
  const t = useTranslations('Navigation');
  // T012: Messaging modal state and unread count
  const [messagingOpen, setMessagingOpen] = useState(false);
  const { unreadCount } = useUnreadCount();
  // T048: Notification state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount: notificationUnreadCount, markAsRead } = useNotifications(user?.uid || null);
  // Feature 050: AI Assistant state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [aiChatModalOpen, setAiChatModalOpen] = useState(false);
  const { isTrailblazer } = useSubscriptionCheck(user?.uid || null);

  // Feature 050: Handle AI Assistant button click
  const handleAIAssistantClick = () => {
    if (isTrailblazer) {
      // T031: Open AI chat modal
      setAiChatModalOpen(true);
      logAIEvent('info', 'AI chat modal opened', {
        userId: user?.uid,
        subscriptionTier: 'trailblazer',
      });
    } else {
      // T030: Track upgrade modal opens (engagement metric)
      setUpgradeModalOpen(true);
      logAIEvent('info', 'Upgrade modal displayed', {
        userId: user?.uid,
        subscriptionTier: 'standard',
        source: 'header_ai_button',
      });
    }
  };

  // Feature 050: Handle upgrade CTA
  const handleUpgrade = () => {
    setUpgradeModalOpen(false);
    router.push('/settings'); // TODO: Create dedicated upgrade page
  };

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

          {/* T048: Notification bell with popover */}
          {user && (
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-white hover:bg-white/10 hover:text-white"
                >
                  <Bell className="h-5 w-5" />
                  {notificationUnreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                      {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h3 className="font-semibold">Notifications</h3>
                  {notificationUnreadCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {notificationUnreadCount} unread
                    </span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={async () => {
                          // T049: Mark as read and navigate to shared loadout
                          await markAsRead(notification.id);

                          if (notification.type === 'loadout_comment' && notification.referenceId) {
                            // For loadout comments, referenceType should contain the share_token
                            // Check that we have a valid share token (not just the type itself)
                            const shareToken = notification.referenceType;
                            // More explicit check: ensure shareToken is a non-empty string
                            // and looks like a valid token (not a type name)
                            if (
                              shareToken &&
                              typeof shareToken === 'string' &&
                              shareToken.length > 0 &&
                              !shareToken.includes('_') // Type names typically have underscores
                            ) {
                              setNotificationsOpen(false);
                              router.push(`/shakedown/${shareToken}`);
                            }
                          }
                        }}
                        className={cn(
                          'w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent',
                          !notification.isRead && 'bg-accent/50'
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Feature 050: AI Assistant button - T026, T027 */}
          {user && (
            <AIAssistantButton
              onClick={handleAIAssistantClick}
              isTrailblazer={isTrailblazer}
              className="text-white hover:bg-white/10 hover:text-white"
            />
          )}

          {/* User menu */}
          <UserMenu />
        </div>
      </div>

      {/* T012: Messaging modal */}
      <MessagingModal open={messagingOpen} onOpenChange={setMessagingOpen} />

      {/* Feature 050: AI Assistant upgrade modal - T027 */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgrade={handleUpgrade}
      />

      {/* Feature 050: AI Assistant chat modal - T031 */}
      <AIAssistantModal
        open={aiChatModalOpen}
        onClose={() => setAiChatModalOpen(false)}
      />
    </header>
  );
}
