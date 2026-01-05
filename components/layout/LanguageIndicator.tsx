/**
 * Language Indicator Component
 *
 * Feature: settings-update
 * Read-only language indicator that links to regional settings.
 * Replaces the old LanguageSwitcher in the header.
 */

'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/config';

interface LanguageConfig {
  code: Locale;
  flag: string;
  label: string;
}

const languages: Record<Locale, LanguageConfig> = {
  en: { code: 'en', flag: '\uD83C\uDDEC\uD83C\uDDE7', label: 'EN' },
  de: { code: 'de', flag: '\uD83C\uDDE9\uD83C\uDDEA', label: 'DE' },
};

export function LanguageIndicator() {
  const locale = useLocale() as Locale;
  const current = languages[locale] ?? languages.en;

  return (
    <Link href="/settings/regional">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-white hover:bg-white/10 hover:text-white"
        aria-label={`Language: ${current.label}. Click to change.`}
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium">{current.label}</span>
      </Button>
    </Link>
  );
}
