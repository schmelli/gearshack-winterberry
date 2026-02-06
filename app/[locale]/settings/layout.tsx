/**
 * Settings Layout
 *
 * Feature: settings-update
 * Provides navigation sidebar on desktop and list view on mobile.
 */

'use client';

// Force dynamic rendering for settings routes that use useSearchParams()
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Palette,
  Globe,
  Bell,
  Shield,
  User,
  Database,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface SettingsNavItem {
  id: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descriptionKey: string;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    id: 'appearance',
    href: '/settings',
    icon: Palette,
    labelKey: 'appearance',
    descriptionKey: 'appearanceDescription',
  },
  {
    id: 'regional',
    href: '/settings/regional',
    icon: Globe,
    labelKey: 'regional',
    descriptionKey: 'regionalDescription',
  },
  {
    id: 'notifications',
    href: '/settings/notifications',
    icon: Bell,
    labelKey: 'notifications',
    descriptionKey: 'notificationsDescription',
  },
  {
    id: 'privacy',
    href: '/settings/privacy',
    icon: Shield,
    labelKey: 'privacy',
    descriptionKey: 'privacyDescription',
  },
  {
    id: 'account',
    href: '/settings/account',
    icon: User,
    labelKey: 'account',
    descriptionKey: 'accountDescription',
  },
  {
    id: 'data',
    href: '/settings/data',
    icon: Database,
    labelKey: 'data',
    descriptionKey: 'dataDescription',
  },
];

function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations('settings.nav');

  // Determine active section
  const getActiveSection = () => {
    if (pathname.includes('/settings/regional')) return 'regional';
    if (pathname.includes('/settings/notifications')) return 'notifications';
    if (pathname.includes('/settings/privacy')) return 'privacy';
    if (pathname.includes('/settings/account')) return 'account';
    if (pathname.includes('/settings/data')) return 'data';
    return 'appearance';
  };

  const activeSection = getActiveSection();

  return (
    <nav className="space-y-1">
      {settingsNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeSection;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileSettingsNav() {
  const pathname = usePathname();
  const t = useTranslations('settings.nav');

  // Check if we're on a subsection (not the main settings page)
  const isSubsection =
    pathname.includes('/settings/') && !pathname.endsWith('/settings');

  // On mobile, only show nav list on main settings page
  if (isSubsection) {
    return null;
  }

  return (
    <div className="space-y-2 lg:hidden">
      {settingsNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t(item.labelKey)}</p>
                <p className="text-sm text-muted-foreground">
                  {t(item.descriptionKey)}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

interface SettingsLayoutProps {
  children: React.ReactNode;
}

function SettingsLayoutContent({ children }: SettingsLayoutProps) {
  const t = useTranslations('settings');
  const pathname = usePathname();

  // Check if we're on a subsection
  const isSubsection =
    pathname.includes('/settings/') && !pathname.endsWith('/settings');

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Desktop: Sidebar + Content */}
      <div className="hidden lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        <aside className="sticky top-24 h-fit">
          <SettingsNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>

      {/* Mobile: List or Content */}
      <div className="lg:hidden">
        {isSubsection ? (
          // Show content on subsections
          children
        ) : (
          // Show navigation list on main settings page
          <MobileSettingsNav />
        )}
      </div>
    </main>
  );
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <ProtectedRoute>
      <SettingsLayoutContent>
        <Suspense fallback={
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        }>
          {children}
        </Suspense>
      </SettingsLayoutContent>
    </ProtectedRoute>
  );
}
