/**
 * Unit System Selector Component
 *
 * Feature: settings-update
 * Smart unit selection that auto-configures related units.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingItem } from './SettingItem';
import type {
  UnitSystem,
  WeightUnit,
  DistanceUnit,
  TemperatureUnit,
  DimensionUnit,
} from '@/types/settings';

interface UnitSystemSelectorProps {
  unitSystem: UnitSystem;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  temperatureUnit: TemperatureUnit;
  dimensionUnit: DimensionUnit;
  onUnitSystemChange: (system: UnitSystem) => void;
  onWeightUnitChange: (unit: WeightUnit) => void;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
  onTemperatureUnitChange: (unit: TemperatureUnit) => void;
  onDimensionUnitChange: (unit: DimensionUnit) => void;
  disabled?: boolean;
}

export function UnitSystemSelector({
  unitSystem,
  weightUnit,
  distanceUnit,
  temperatureUnit,
  dimensionUnit,
  onUnitSystemChange,
  onWeightUnitChange,
  onDistanceUnitChange,
  onTemperatureUnitChange,
  onDimensionUnitChange,
  disabled = false,
}: UnitSystemSelectorProps) {
  const t = useTranslations('settings.regional.units');

  const isCustom = unitSystem === 'custom';

  const handleIndividualChange = () => {
    // When user changes individual unit, switch to custom mode
    if (unitSystem !== 'custom') {
      onUnitSystemChange('custom');
    }
  };

  return (
    <div className="space-y-6">
      {/* Unit System Selection */}
      <div className="space-y-3">
        <Label>{t('system.label')}</Label>
        <RadioGroup
          value={unitSystem}
          onValueChange={(value) => onUnitSystemChange(value as UnitSystem)}
          className="flex flex-wrap gap-4"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="metric" id="metric" />
            <Label htmlFor="metric" className="font-normal cursor-pointer">
              {t('system.metric')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="imperial" id="imperial" />
            <Label htmlFor="imperial" className="font-normal cursor-pointer">
              {t('system.imperial')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="font-normal cursor-pointer">
              {t('system.custom')}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Individual Unit Selections - shown when custom or for clarity */}
      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-sm font-medium text-muted-foreground">
          {isCustom ? t('customHint') : t('presetHint')}
        </p>

        {/* Weight Unit */}
        <SettingItem label={t('weight.label')} disabled={disabled}>
          <Select
            value={weightUnit}
            onValueChange={(value) => {
              handleIndividualChange();
              onWeightUnitChange(value as WeightUnit);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="g">{t('weight.g')}</SelectItem>
              <SelectItem value="kg">{t('weight.kg')}</SelectItem>
              <SelectItem value="oz">{t('weight.oz')}</SelectItem>
              <SelectItem value="lb">{t('weight.lb')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>

        {/* Distance Unit */}
        <SettingItem label={t('distance.label')} disabled={disabled}>
          <Select
            value={distanceUnit}
            onValueChange={(value) => {
              handleIndividualChange();
              onDistanceUnitChange(value as DistanceUnit);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="km">{t('distance.km')}</SelectItem>
              <SelectItem value="mi">{t('distance.mi')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>

        {/* Temperature Unit */}
        <SettingItem label={t('temperature.label')} disabled={disabled}>
          <Select
            value={temperatureUnit}
            onValueChange={(value) => {
              handleIndividualChange();
              onTemperatureUnitChange(value as TemperatureUnit);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="C">{t('temperature.celsius')}</SelectItem>
              <SelectItem value="F">{t('temperature.fahrenheit')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>

        {/* Dimension Unit */}
        <SettingItem label={t('dimensions.label')} disabled={disabled}>
          <Select
            value={dimensionUnit}
            onValueChange={(value) => {
              handleIndividualChange();
              onDimensionUnitChange(value as DimensionUnit);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cm">{t('dimensions.cm')}</SelectItem>
              <SelectItem value="in">{t('dimensions.in')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>
      </div>
    </div>
  );
}
