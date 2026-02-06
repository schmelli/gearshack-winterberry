/**
 * Merchant Portal Layout
 *
 * Feature: 053-merchant-integration
 * Task: T017
 *
 * Provides the merchant portal shell with:
 * - Auth guard (redirects unauthorized users)
 * - Sidebar navigation
 * - Merchant context
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMerchantAuth, useMerchantAuthGuard } from '@/hooks/merchant/useMerchantAuth';
import {
  LayoutDashboard,
  Package,
  Tags,
  Lightbulb,
  MessageSquare,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useConditionalRedirect } from '@/hooks/useAuthRedirect';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MerchantInfoBadge, MerchantStatusBadge } from '@/components/merchant/MerchantBadge';
import { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

interface MerchantLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

// =============================================================================
// Navigation Config
// =============================================================================

function useNavItems(): NavItem[] {
  const t = useTranslations('Merchant.nav');

  return [
    {
      href: '/merchant',
      label: t('dashboard'),
      icon: LayoutDashboard,
    },
    {
      href: '/merchant/loadouts',
      label: t('loadouts'),
      icon: Package,
    },
    {
      href: '/merchant/catalog',
      label: t('catalog'),
      icon: Tags,
    },
    {
      href: '/merchant/insights',
      label: t('insights'),
      icon: Lightbulb,
    },
    {
      href: '/merchant/offers',
      label: t('offers'),
      icon: MessageSquare,
    },
    {
      href: '/merchant/billing',
      label: t('billing'),
      icon: CreditCard,
    },
    {
      href: '/merchant/settings',
      label: t('settings'),
      icon: Settings,
    },
  ];
}

// =============================================================================
// Components
// =============================================================================

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const router = useRouter();

  const handleClick = () => {
    router.push(item.href);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
      {item.badge && (
        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
          {item.badge}
        </span>
      )}
    </button>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const navItems = useNavItems();
  const { merchant } = useMerchantAuth();
  const t = useTranslations('Merchant');
  const router = useRouter();

  // Extract locale from pathname for proper href matching
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?:\/|$)/, '/');

  const handleBackToApp = () => {
    router.push('/');
    onNavClick?.();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <Button variant="ghost" size="icon" onClick={handleBackToApp}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-semibold">{t('portal.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('portal.subtitle')}</p>
        </div>
      </div>

      {/* Merchant Info */}
      {merchant && (
        <div className="border-b p-4">
          <MerchantInfoBadge
            merchant={{
              id: merchant.id,
              businessName: merchant.businessName,
              businessType: merchant.businessType,
              logoUrl: merchant.logoUrl,
              isVerified: merchant.verifiedAt !== null,
            }}
            showBusinessType={false}
            size="sm"
          />
          <div className="mt-2">
            <MerchantStatusBadge status={merchant.status} size="sm" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            // Handle exact match for dashboard, prefix match for others
            const isActive =
              item.href === '/merchant'
                ? pathWithoutLocale === '/merchant' || pathWithoutLocale === '/merchant/'
                : pathWithoutLocale.startsWith(item.href);

            return (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive}
                onClick={onNavClick}
              />
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleBackToApp}
        >
          <LogOut className="h-4 w-4" />
          <span>{t('nav.backToApp')}</span>
        </Button>
      </div>
    </div>
  );
}

function MerchantPortalTitle() {
  const t = useTranslations('Merchant');
  return <h1 className="font-semibold">{t('portal.title')}</h1>;
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 border-r bg-muted/30 md:block">
        <div className="p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

// =============================================================================
// Main Layout
// =============================================================================

export default function MerchantLayout({ children }: MerchantLayoutProps) {
  const { isAuthorized, isLoading, redirectPath } = useMerchantAuthGuard();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Handle redirects for unauthorized users
  useConditionalRedirect(isLoading, redirectPath);

  // Show loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Don't render content if not authorized (redirect will happen)
  if (!isAuthorized) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-card md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <MerchantPortalTitle />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
