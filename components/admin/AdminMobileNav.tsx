/**
 * AdminMobileNav Component
 *
 * Feature: Admin Panel Mobile Layout
 * Mobile navigation drawer for admin panel using Sheet component
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderTree,
  Users,
  MessageSquare,
  Settings,
  ArrowLeft,
  Shield,
  UsersRound,
  ImageIcon,
  Bell,
  BookOpen,
  Bot,
  Network,
  Activity,
  Upload,
  ChevronDown,
  ChevronRight,
  Menu,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function AdminMobileNav() {
  const pathname = usePathname();
  const t = useTranslations('Admin.navigation');
  const [open, setOpen] = useState(false);

  // Regular nav items (flat list)
  const navItems = [
    { href: '/admin', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/admin/categories', label: t('categories'), icon: FolderTree },
    { href: '/admin/banners', label: t('banners'), icon: ImageIcon },
    { href: '/admin/announcements', label: t('announcements'), icon: Bell },
    { href: '/admin/vip', label: t('vips'), icon: UsersRound },
    { href: '/admin/moderation', label: t('moderation'), icon: Shield },
    { href: '/admin/users', label: t('users'), icon: Users },
    { href: '/admin/wiki', label: t('wiki'), icon: BookOpen },
    { href: '/admin/prompts', label: t('prompts'), icon: MessageSquare, disabled: true },
    { href: '/admin/features', label: t('activateFeatures'), icon: ToggleRight },
    { href: '/admin/settings', label: t('settings'), icon: Settings, disabled: true },
  ];

  // GearGraph section with sub-items
  const gearGraphItems = [
    { href: '/admin/geargraph/status', label: t('status'), icon: Activity },
    { href: '/admin/geargraph/gardener', label: t('gardener'), icon: Bot },
    { href: '/admin/geargraph/ingestion', label: t('ingestion'), icon: Upload },
  ];
  // Auto-expand GearGraph section if we're on a GearGraph page
  const isGearGraphActive = pathname.includes('/admin/geargraph');
  const [gearGraphOpen, setGearGraphOpen] = useState(isGearGraphActive);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] max-w-[80vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Admin Panel</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.disabled ? '#' : item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : item.disabled
                      ? 'text-muted-foreground cursor-not-allowed opacity-50'
                      : 'hover:bg-muted'
                  )}
                  onClick={(e) => {
                    if (item.disabled) {
                      e.preventDefault();
                    } else {
                      setOpen(false);
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* GearGraph Section */}
            <Collapsible open={gearGraphOpen} onOpenChange={setGearGraphOpen}>
              <CollapsibleTrigger
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted',
                  isGearGraphActive && 'bg-muted'
                )}
              >
                <span className="flex items-center gap-3">
                  <Network className="h-4 w-4" />
                  {t('gearGraph')}
                </span>
                {gearGraphOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4">
                <div className="flex flex-col gap-1 border-l border-border py-1 pl-3">
                  {gearGraphItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          <Separator />

          <Link href="/inventory" onClick={() => setOpen(false)}>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToApp')}
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
