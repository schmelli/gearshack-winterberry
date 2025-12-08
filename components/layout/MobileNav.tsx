/**
 * MobileNav Component
 *
 * Feature: 027-i18n-next-intl
 * T026: Use locale-aware Link from i18n/navigation
 */

'use client';

import { useState } from 'react';
// T026: Replace next/link with locale-aware Link
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Menu } from 'lucide-react';
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
import type { NavItem } from '@/types/navigation';

interface MobileNavProps {
  items?: NavItem[];
  onNavigate?: () => void;
}

export function MobileNav({
  items = MAIN_NAV_ITEMS,
  onNavigate,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Navigation');

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

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
        <nav className="mt-8 flex flex-col gap-4">
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
        </nav>
      </SheetContent>
    </Sheet>
  );
}
