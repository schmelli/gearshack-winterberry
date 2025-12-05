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
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MAIN_NAV_ITEMS } from '@/lib/constants/navigation';
import { UserMenu } from './UserMenu';
import { MobileNav } from './MobileNav';

interface SiteHeaderProps {
  className?: string;
}

export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-emerald-50/90 backdrop-blur-md supports-[backdrop-filter]:bg-emerald-50/80 dark:bg-emerald-900/90 dark:supports-[backdrop-filter]:bg-emerald-900/80',
        className
      )}
    >
      {/* FR-020: h-24 = 96px header height, items-center for FR-019 vertical centering */}
      <div className="container flex h-24 items-center">
        {/* Mobile menu trigger */}
        <MobileNav />

        {/* Logo and brand - FR-021: balanced spacing with gap-3 */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg mix-blend-multiply dark:mix-blend-lighten">
            <Image
              src="/logos/small_gearshack_logo.png"
              alt="Gearshack Logo"
              width={80}
              height={80}
              className="h-20 w-20"
              priority
            />
          </div>
          <span className="font-[family-name:var(--font-rock-salt)] text-3xl leading-tight">
            Gearshack
          </span>
        </Link>

        {/* Desktop navigation (right side) - FR-021: baseline alignment via items-baseline */}
        <nav className="ml-auto hidden items-baseline gap-8 md:flex">
          {MAIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.enabled ? item.href : '#'}
              aria-disabled={!item.enabled}
              tabIndex={item.enabled ? undefined : -1}
              className={cn(
                'text-sm font-medium transition-colors hover:underline hover:underline-offset-4',
                item.enabled
                  ? 'text-primary hover:text-primary/80'
                  : 'pointer-events-none text-muted-foreground opacity-50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side: notifications and user menu */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
