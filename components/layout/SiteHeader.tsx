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
import { Mail, ChevronDown, Menu, X } from 'lucide-react';
// T022: Import useTranslations hook
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MAIN_NAV_ITEMS } from '@/lib/constants/navigation';
import type { NavItemWithChildren } from '@/types/navigation';
import { UserMenu } from './UserMenu';
import { MobileNav } from './MobileNav';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useUnreadCount } from '@/hooks/messaging/useUnreadCount';
import { useRouter } from '@/i18n/navigation';
import { NotificationMenu } from '@/components/notifications/NotificationMenu';
// Feature 050: AI Assistant
import { AIAssistantButton } from '@/components/ai-assistant/AIAssistantButton';
import { useSubscriptionCheck } from '@/hooks/ai-assistant/useSubscriptionCheck';
import { logAIEvent } from '@/lib/ai-assistant/observability';
// Feature: Admin Feature Activation
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

// Performance: Lazy load heavy modal components to reduce initial bundle size
// These modals are only shown when user interacts with specific buttons
const MessagingModal = dynamic(
  () => import('@/components/messaging/MessagingModal').then(mod => ({ default: mod.MessagingModal })),
  { ssr: false }
);
const AIAssistantModal = dynamic(
  () => import('@/components/ai-assistant/AIAssistantModal').then(mod => ({ default: mod.AIAssistantModal })),
  { ssr: false }
);
const UpgradeModal = dynamic(
  () => import('@/components/ai-assistant/UpgradeModal').then(mod => ({ default: mod.UpgradeModal })),
  { ssr: false }
);

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
  // Feature 050: AI Assistant state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [aiChatModalOpen, setAiChatModalOpen] = useState(false);
  const { isTrailblazer } = useSubscriptionCheck(user?.uid || null);
  // Issue #77: Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Feature: Admin Feature Activation - check which features are enabled
  const { isFeatureEnabled } = useFeatureFlags();

  // Derive feature-enabled flags (always check, even while loading - defaults to disabled)
  const isMessagingEnabled = isFeatureEnabled('messaging');
  const isAIAssistantEnabled = isFeatureEnabled('ai_gear_assistant');
  const isCommunityEnabled = isFeatureEnabled('community');

  // Filter navigation items based on feature flags
  const filteredNavItems = useMemo(() => {
    return MAIN_NAV_ITEMS.map((item) => {
      // Check community feature for the Community nav item
      if (item.href === '/community' && !isCommunityEnabled) {
        return { ...item, enabled: false };
      }
      // Filter children based on sub-feature flags
      if (item.children && item.children.length > 0) {
        const filteredChildren = item.children.map((child) => {
          // Map child hrefs to feature keys
          let featureKey: string | null = null;
          if (child.href === '/community/shakedowns') featureKey = 'community_shakedowns';
          if (child.href === '/community/wiki') featureKey = 'community_wiki';
          // Add more mappings as needed

          if (featureKey && !isFeatureEnabled(featureKey)) {
            return { ...child, enabled: false };
          }
          return child;
        });
        return { ...item, children: filteredChildren };
      }
      return item;
    });
  }, [isCommunityEnabled, isFeatureEnabled]);

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
      {/* Issue #73: Reduced padding on mobile (px-3) to maximize space for controls */}
      {/* Issue #77: Mobile menu state management */}
      {/* Issue #206: Removed container class to allow full-width background on mobile */}
      <div className="mx-auto flex h-24 max-w-7xl items-center px-3 md:px-4">
        {/* Mobile menu - hidden on desktop, shown via logo click on mobile */}
        {/* Feature Flags: Pass filtered items and feature flags to MobileNav */}
        <MobileNav
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          onOpenMessaging={() => setMessagingOpen(true)}
          items={filteredNavItems}
          isMessagingEnabled={isMessagingEnabled}
          isCommunityEnabled={isCommunityEnabled}
        />

        {/* Logo and brand - FR-021: balanced spacing with gap-3 */}
        {/* T006: Logo in Rock Salt font, text-3xl, white color */}
        {/* Issue #73: Responsive sizing for mobile - smaller logo and text on small screens */}
        {/* Mobile: Hamburger + Logo side by side */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10"
            aria-label={t('openMenu')}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/logos/small_gearshack_logo.png"
              alt="Gearshack Logo"
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
            <span className="font-[family-name:var(--font-rock-salt)] text-lg leading-tight text-white">
              Gearshack
            </span>
          </div>
        </div>
        <Link href="/" className="hidden items-center gap-3 md:flex">
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
        {/* Community Section Restructure: Items with children render as dropdown menus */}
        {/* Feature Flags: Use filteredNavItems to respect admin-controlled feature access */}
        <nav className="ml-auto hidden items-baseline gap-8 md:flex" aria-label={t('mainNavigation')}>
          {filteredNavItems.map((item: NavItemWithChildren) => {
            const isActive = pathname === item.href ||
              (item.children && item.children.some(child => pathname.startsWith(child.href)));

            // Items with children render as dropdown
            if (item.children && item.children.length > 0) {
              return (
                <DropdownMenu key={item.href}>
                  <DropdownMenuTrigger
                    className={cn(
                      'flex items-center gap-1 text-lg font-bold text-white transition-colors hover:text-white/80 focus:outline-none',
                      item.enabled
                        ? isActive
                          ? 'border-b-2 border-white'
                          : ''
                        : 'pointer-events-none opacity-50'
                    )}
                    disabled={!item.enabled}
                  >
                    {t(item.translationKey as keyof IntlMessages['Navigation'])}
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {item.children.map((child) => {
                      const Icon = child.icon;
                      const isChildActive = pathname === child.href ||
                        (child.href !== '/community' && pathname.startsWith(child.href));
                      return (
                        <DropdownMenuItem
                          key={child.href}
                          asChild
                          className={cn(
                            'cursor-pointer',
                            isChildActive && 'bg-accent'
                          )}
                          disabled={!child.enabled}
                        >
                          <Link href={child.href} className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            {t(child.translationKey as keyof IntlMessages['Navigation'])}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // Regular nav items without children
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

        {/* Right side: language switcher, notifications and user menu */}
        {/* Issue #73: Tighter spacing on mobile to fit all controls */}
        {/* Issue #77: Hide language switcher and avatar on small screens */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* T012: Messaging icon with unread badge - only show when authenticated AND messaging feature is enabled */}
          {user && isMessagingEnabled && (
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:bg-white/10 hover:text-white"
              onClick={() => setMessagingOpen(true)}
              aria-label={unreadCount > 0 ? t('messagesWithUnread', { count: unreadCount }) : t('messages')}
            >
              <Mail className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white" aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          )}

          {/* T048: Notification bell - extracted to NotificationMenu component */}
          <NotificationMenu userId={user?.uid || null} />

          {/* Feature 050: AI Assistant button - T026, T027 */}
          {/* Feature Flag: Only show AI Assistant when ai_gear_assistant feature is enabled */}
          {user && isAIAssistantEnabled && (
            <AIAssistantButton
              onClick={handleAIAssistantClick}
              isTrailblazer={isTrailblazer}
              className="text-white hover:bg-white/10 hover:text-white"
            />
          )}

          {/* User menu */}
          {/* Issue #77: Hidden on small screens, accessible via mobile menu */}
          <div className="hidden md:flex">
            <UserMenu />
          </div>
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
