/**
 * SiteFooter Component
 *
 * Feature: 011-rescue-refine-bugs
 * T008: Updated to use light pastel styling matching the header
 * Light mode: bg-emerald-50/90 with backdrop-blur
 * Dark mode: dark:bg-emerald-900/90
 * FR-020: Footer content respects max-w-7xl container constraint
 * FR-021: Footer vertical padding reduced from py-12 to py-8
 *
 * Feature: 012-visual-identity-fixes
 * User Story 1 (Brand Identity):
 * T003: Deep Forest Green background (#405A3D) with white text
 */

'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FOOTER_LEGAL_LINKS, FOOTER_SOCIAL_LINKS } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils';

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  const t = useTranslations('Footer');
  const tNav = useTranslations('Navigation');

  return (
    <footer className={cn('bg-[#405A3D] border-t border-[#405A3D]/20', className)}>
      {/* FR-020: container respects max-w-7xl, FR-021: py-8 instead of py-12 */}
      {/* Issue #206: Removed container class to allow full-width background on mobile */}
      <div className="mx-auto grid max-w-7xl gap-8 px-3 py-8 grid-cols-1 md:grid-cols-2 md:px-4 lg:grid-cols-4 lg:px-8">
        {/* Column 1: Logo and About */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/big_gearshack_logo.png"
              alt={t('logoAlt')}
              width={64}
              height={64}
              className="h-16 w-16"
            />
          </div>
          <p className="text-sm text-white/90">
            {t('tagline')}
          </p>
        </div>

        {/* Column 2: Features */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            {t('features')}
          </h3>
          <nav className="flex flex-col gap-2">
            <Link
              href="/inventory"
              className="text-sm text-white/90 transition-colors hover:text-white"
            >
              {tNav('inventory')}
            </Link>
            <Link
              href="/loadouts"
              className="text-sm text-white/90 transition-colors hover:text-white"
            >
              {tNav('loadouts')}
            </Link>
            <Link
              href="#"
              className="text-sm text-white/90 transition-colors hover:text-white"
            >
              {t('tripPlanning')}
            </Link>
            <Link
              href="#"
              className="text-sm text-white/90 transition-colors hover:text-white"
            >
              {tNav('community')}
            </Link>
          </nav>
        </div>

        {/* Column 3: Resources */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            {t('resources')}
          </h3>
          <nav className="flex flex-col gap-2">
            {FOOTER_LEGAL_LINKS.map((link, index) => (
              <Link
                key={`${link.label}-${index}`}
                href={link.href}
                className="text-sm text-white/90 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#"
              className="text-sm text-white/90 transition-colors hover:text-white"
            >
              {t('helpCenter')}
            </Link>
            <Link
              href="#"
              className="text-sm text-white/90 transition-colors hover:text-white"
            >
              {t('blog')}
            </Link>
          </nav>
        </div>

        {/* Column 4: Connect */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            {t('connect')}
          </h3>
          <div className="flex gap-4">
            {FOOTER_SOCIAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/90 transition-colors hover:text-white"
                aria-label={link.label}
              >
                <link.icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
          <p className="text-sm text-white/90 mt-2">
            {t('followUs')}
          </p>
        </div>
      </div>

      {/* Copyright bar - T003: White text on deep forest green */}
      <div className="border-t border-white/20 py-4 text-center text-sm text-white/90">
        {t('copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
