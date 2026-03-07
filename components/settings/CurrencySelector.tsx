/**
 * Currency Selector Component
 *
 * Feature: settings-update
 * Currency selection with symbol preview.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingItem } from './SettingItem';
import { SUPPORTED_CURRENCIES } from '@/types/settings';
import type { CurrencyCode, CurrencyPosition } from '@/types/settings';

interface CurrencySelectorProps {
  currency: CurrencyCode;
  position: CurrencyPosition;
  showOriginalPrice: boolean;
  autoConvertPrices: boolean;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onPositionChange: (position: CurrencyPosition) => void;
  onShowOriginalChange: (show: boolean) => void;
  onAutoConvertChange: (auto: boolean) => void;
  disabled?: boolean;
}

export function CurrencySelector({
  currency,
  position,
  showOriginalPrice,
  autoConvertPrices,
  onCurrencyChange,
  onPositionChange,
  onShowOriginalChange,
  onAutoConvertChange,
  disabled = false,
}: CurrencySelectorProps) {
  const t = useTranslations('settings.regional.currency');

  // Get current currency info for preview
  const currentCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
  const symbol = currentCurrency?.symbol ?? '\u20AC';
  const previewAmount = '49.99';
  const preview =
    position === 'before' ? `${symbol}${previewAmount}` : `${previewAmount}${symbol}`;

  return (
    <div className="space-y-6">
      {/* Currency Selection */}
      <SettingItem
        label={t('select.label')}
        description={t('select.description')}
        disabled={disabled}
      >
        <Select
          value={currency}
          onValueChange={(value) => onCurrencyChange(value as CurrencyCode)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((curr) => (
              <SelectItem key={curr.code} value={curr.code}>
                <span className="flex items-center gap-2">
                  <span className="w-6 text-center">{curr.symbol}</span>
                  <span>{curr.code}</span>
                  <span className="text-muted-foreground">- {curr.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingItem>

      {/* Symbol Position */}
      <div className="space-y-3">
        <Label>{t('position.label')}</Label>
        <RadioGroup
          value={position}
          onValueChange={(value) => onPositionChange(value as CurrencyPosition)}
          className="flex gap-4"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="before" id="before" />
            <Label htmlFor="before" className="font-normal cursor-pointer">
              {t('position.before')} ({symbol}50)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="after" id="after" />
            <Label htmlFor="after" className="font-normal cursor-pointer">
              {t('position.after')} (50{symbol})
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Preview */}
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">{t('preview.label')}</p>
        <p className="mt-1 text-lg font-semibold">{preview}</p>
        {autoConvertPrices && showOriginalPrice && (
          <p className="text-sm text-muted-foreground">
            {t('preview.withOriginal', { original: '$54.99' })}
          </p>
        )}
      </div>

      {/* Auto Convert Prices */}
      <SettingItem
        label={t('autoConvert.label')}
        description={t('autoConvert.description')}
        disabled={disabled}
      >
        <Switch
          checked={autoConvertPrices}
          onCheckedChange={onAutoConvertChange}
          disabled={disabled}
        />
      </SettingItem>

      {/* Show Original Price */}
      {autoConvertPrices && (
        <SettingItem
          label={t('showOriginal.label')}
          description={t('showOriginal.description')}
          disabled={disabled}
        >
          <Switch
            checked={showOriginalPrice}
            onCheckedChange={onShowOriginalChange}
            disabled={disabled}
          />
        </SettingItem>
      )}
    </div>
  );
}
