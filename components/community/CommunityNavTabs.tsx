/**
 * CommunityNavTabs Component
 *
 * Feature: Community Hub Enhancement
 *
 * Tab navigation for community sub-sections:
 * - Board (Bulletin Board)
 * - Shakedowns (Gear reviews)
 * - VIP Loadouts (Featured loadouts)
 * - Marketplace (Buy/sell gear)
 */

'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { MessageSquare, Star, ShoppingBag, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommunityTabId, CommunityNavTabsProps, CommunityTab } from '@/types/community';

const TABS: CommunityTab[] = [
  { id: 'board', translationKey: 'tabs.board', href: '/community', enabled: true },
  { id: 'shakedowns', translationKey: 'tabs.shakedowns', href: '/community/shakedowns', enabled: true },
  { id: 'vip-loadouts', translationKey: 'tabs.vipLoadouts', href: '/community/vip-loadouts', enabled: true },
  { id: 'marketplace', translationKey: 'tabs.marketplace', href: '/community/marketplace', enabled: false },
];

const TAB_ICONS: Record<CommunityTabId, React.ComponentType<{ className?: string }>> = {
  board: MessageSquare,
  shakedowns: Scale,
  'vip-loadouts': Star,
  marketplace: ShoppingBag,
};

export function CommunityNavTabs({ activeTab, className }: CommunityNavTabsProps) {
  const t = useTranslations('Community');
  const pathname = usePathname();

  // Determine active tab from pathname if not provided
  const currentTab: CommunityTabId = activeTab ?? detectActiveTab(pathname);

  return (
    <nav
      className={cn('border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}
      aria-label={t('navigation.ariaLabel')}
    >
      <div className="flex overflow-x-auto scrollbar-hide -mb-px">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const isActive = currentTab === tab.id;
          const isDisabled = !tab.enabled;

          if (isDisabled) {
            return (
              <span
                key={tab.id}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap',
                  'text-muted-foreground/50 cursor-not-allowed'
                )}
                aria-disabled="true"
              >
                <Icon className="h-4 w-4" />
                <span>{t(tab.translationKey)}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {t('tabs.comingSoon')}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                'border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{t(tab.translationKey)}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Detects active tab from current pathname
 */
function detectActiveTab(pathname: string): CommunityTabId {
  // Remove locale prefix if present (e.g., /en/community -> /community)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/)/, '');

  if (pathWithoutLocale.startsWith('/community/shakedowns')) {
    return 'shakedowns';
  }
  if (pathWithoutLocale.startsWith('/community/vip-loadouts')) {
    return 'vip-loadouts';
  }
  if (pathWithoutLocale.startsWith('/community/marketplace')) {
    return 'marketplace';
  }
  return 'board';
}

export default CommunityNavTabs;
