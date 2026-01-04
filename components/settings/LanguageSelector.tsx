/**
 * Language Selector Component
 *
 * Feature: settings-update
 * Language selection with flag icons and immediate locale change.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/i18n/config';

interface LanguageOption {
  code: Locale;
  flag: string;
  nameKey: string;
  nativeName: string;
}

const languages: LanguageOption[] = [
  { code: 'en', flag: '\uD83C\uDDEC\uD83C\uDDE7', nameKey: 'english', nativeName: 'English' },
  { code: 'de', flag: '\uD83C\uDDE9\uD83C\uDDEA', nameKey: 'german', nativeName: 'Deutsch' },
];

interface LanguageSelectorProps {
  disabled?: boolean;
}

export function LanguageSelector({ disabled = false }: LanguageSelectorProps) {
  const t = useTranslations('settings.regional.language');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as Locale });
  };

  return (
    <div className="space-y-4">
      <RadioGroup
        value={locale}
        onValueChange={handleLanguageChange}
        className="grid gap-3"
        disabled={disabled}
      >
        {languages.map((lang) => (
          <div
            key={lang.code}
            className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <RadioGroupItem value={lang.code} id={lang.code} />
            <Label
              htmlFor={lang.code}
              className="flex flex-1 cursor-pointer items-center gap-3"
            >
              <span className="text-2xl">{lang.flag}</span>
              <div>
                <p className="font-medium">{t(lang.nameKey)}</p>
                <p className="text-sm text-muted-foreground">{lang.nativeName}</p>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <p className="text-sm text-muted-foreground">{t('hint')}</p>
    </div>
  );
}
