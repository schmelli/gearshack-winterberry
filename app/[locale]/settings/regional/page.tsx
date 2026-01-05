/**
 * Regional Settings Page
 *
 * Feature: settings-update
 * Language, units, currency, and date/time preferences.
 */

'use client';

import { useTranslations } from 'next-intl';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { UnitSystemSelector } from '@/components/settings/UnitSystemSelector';
import { CurrencySelector } from '@/components/settings/CurrencySelector';
import { DateTimeSelector } from '@/components/settings/DateTimeSelector';
import { useUserPreferences } from '@/hooks/settings/useUserPreferences';
import type {
  UnitSystem,
  WeightUnit,
  DistanceUnit,
  TemperatureUnit,
  DimensionUnit,
  CurrencyCode,
  CurrencyPosition,
  DateFormat,
  TimeFormat,
  WeekStartDay,
} from '@/types/settings';

export default function RegionalSettingsPage() {
  const t = useTranslations('settings.regional');
  const { preferences, updatePreference, setUnitSystem, isLoading } = useUserPreferences();

  return (
    <div className="space-y-6">
      {/* Language Section */}
      <SettingsSection
        title={t('language.title')}
        description={t('language.description')}
      >
        <LanguageSelector disabled={isLoading} />
      </SettingsSection>

      {/* Units Section */}
      <SettingsSection
        title={t('units.title')}
        description={t('units.description')}
      >
        <UnitSystemSelector
          unitSystem={preferences.unitSystem}
          weightUnit={preferences.preferredWeightUnit}
          distanceUnit={preferences.preferredDistanceUnit}
          temperatureUnit={preferences.preferredTemperatureUnit}
          dimensionUnit={preferences.preferredDimensionUnit}
          onUnitSystemChange={(system: UnitSystem) => setUnitSystem(system)}
          onWeightUnitChange={(unit: WeightUnit) =>
            updatePreference('preferredWeightUnit', unit)
          }
          onDistanceUnitChange={(unit: DistanceUnit) =>
            updatePreference('preferredDistanceUnit', unit)
          }
          onTemperatureUnitChange={(unit: TemperatureUnit) =>
            updatePreference('preferredTemperatureUnit', unit)
          }
          onDimensionUnitChange={(unit: DimensionUnit) =>
            updatePreference('preferredDimensionUnit', unit)
          }
          disabled={isLoading}
        />
      </SettingsSection>

      {/* Currency Section */}
      <SettingsSection
        title={t('currency.title')}
        description={t('currency.description')}
      >
        <CurrencySelector
          currency={preferences.preferredCurrency}
          position={preferences.currencyPosition}
          showOriginalPrice={preferences.showOriginalPrice}
          autoConvertPrices={preferences.autoConvertPrices}
          onCurrencyChange={(currency: CurrencyCode) =>
            updatePreference('preferredCurrency', currency)
          }
          onPositionChange={(position: CurrencyPosition) =>
            updatePreference('currencyPosition', position)
          }
          onShowOriginalChange={(show: boolean) =>
            updatePreference('showOriginalPrice', show)
          }
          onAutoConvertChange={(auto: boolean) =>
            updatePreference('autoConvertPrices', auto)
          }
          disabled={isLoading}
        />
      </SettingsSection>

      {/* Date & Time Section */}
      <SettingsSection
        title={t('dateTime.title')}
        description={t('dateTime.description')}
      >
        <DateTimeSelector
          dateFormat={preferences.dateFormat}
          timeFormat={preferences.timeFormat}
          weekStartsOn={preferences.weekStartsOn}
          timezone={preferences.timezone}
          onDateFormatChange={(format: DateFormat) =>
            updatePreference('dateFormat', format)
          }
          onTimeFormatChange={(format: TimeFormat) =>
            updatePreference('timeFormat', format)
          }
          onWeekStartChange={(day: WeekStartDay) =>
            updatePreference('weekStartsOn', day)
          }
          onTimezoneChange={(tz: string) => updatePreference('timezone', tz)}
          disabled={isLoading}
        />
      </SettingsSection>
    </div>
  );
}
