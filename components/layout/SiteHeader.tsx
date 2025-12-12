'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MAIN_NAV_ITEMS } from '@/lib/constants/navigation';
import { UserMenu } from './UserMenu';
import { MobileNav } from './MobileNav';
import { MessagingCenter } from '@/components/messaging/MessagingCenter';

interface SiteHeaderProps {
  className?: string;
}

export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container flex h-16 items-center">
        {/* Mobile menu trigger */}
        <MobileNav />

        {/* Logo and brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-1.5">
            <Image
              src="/logos/small_gearshack_logo.png"
              alt="Gearshack Logo"
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
          </div>
          <span className="font-[family-name:var(--font-rock-salt)] text-xl font-normal">
            Gearshack
          </span>
        </Link>

        {/* Desktop navigation (center) */}
        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {MAIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.enabled ? item.href : '#'}
              aria-disabled={!item.enabled}
              tabIndex={item.enabled ? undefined : -1}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                item.enabled
                  ? 'text-foreground'
                  : 'pointer-events-none text-muted-foreground opacity-50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side: notifications and user menu */}
        <div className="ml-auto flex items-center gap-2">
          <MessagingCenter />

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
