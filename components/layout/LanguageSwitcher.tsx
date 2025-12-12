/**
 * Language Switcher Component
 *
 * Feature: 027-i18n-next-intl
 * DR-005: Simple text toggle button (EN | DE)
 * FR-005: Provide language switcher in the header
 *
 * Toggles between English and German locales while preserving the current path.
 */

'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = () => {
    const newLocale: Locale = locale === 'en' ? 'de' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      className="text-white hover:bg-white/10 hover:text-white font-medium"
      aria-label={locale === 'en' ? 'Switch to German' : 'Switch to English'}
    >
      {locale === 'en' ? 'DE' : 'EN'}
    </Button>
  );
}
