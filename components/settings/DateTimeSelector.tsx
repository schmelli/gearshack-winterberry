/**
 * Date/Time Selector Component
 *
 * Feature: settings-update
 * Date and time format preferences with preview.
 */

'use client';

import { useTranslations } from 'next-intl';
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
import { getCommonTimezones, getBrowserTimezone } from '@/lib/date-formats';
import type { DateFormat, TimeFormat, WeekStartDay } from '@/types/settings';

interface DateTimeSelectorProps {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartsOn: WeekStartDay;
  timezone: string;
  onDateFormatChange: (format: DateFormat) => void;
  onTimeFormatChange: (format: TimeFormat) => void;
  onWeekStartChange: (day: WeekStartDay) => void;
  onTimezoneChange: (tz: string) => void;
  disabled?: boolean;
}

export function DateTimeSelector({
  dateFormat,
  timeFormat,
  weekStartsOn,
  timezone,
  onDateFormatChange,
  onTimeFormatChange,
  onWeekStartChange,
  onTimezoneChange,
  disabled = false,
}: DateTimeSelectorProps) {
  const t = useTranslations('settings.regional.dateTime');
  const timezones = getCommonTimezones();
  const browserTz = getBrowserTimezone();

  // Generate preview with current date
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');

  let datePreview: string;
  switch (dateFormat) {
    case 'DD/MM/YYYY':
      datePreview = `${day}/${month}/${year}`;
      break;
    case 'MM/DD/YYYY':
      datePreview = `${month}/${day}/${year}`;
      break;
    case 'YYYY-MM-DD':
      datePreview = `${year}-${month}-${day}`;
      break;
  }

  let timePreview: string;
  if (timeFormat === '24h') {
    timePreview = `${hours.toString().padStart(2, '0')}:${minutes}`;
  } else {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    timePreview = `${displayHours}:${minutes} ${period}`;
  }

  return (
    <div className="space-y-6">
      {/* Date Format */}
      <div className="space-y-3">
        <Label>{t('dateFormat.label')}</Label>
        <RadioGroup
          value={dateFormat}
          onValueChange={(value) => onDateFormatChange(value as DateFormat)}
          className="grid gap-2"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="DD/MM/YYYY" id="dmy" />
            <Label htmlFor="dmy" className="font-normal cursor-pointer">
              DD/MM/YYYY <span className="text-muted-foreground">(31/12/2025)</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="MM/DD/YYYY" id="mdy" />
            <Label htmlFor="mdy" className="font-normal cursor-pointer">
              MM/DD/YYYY <span className="text-muted-foreground">(12/31/2025)</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="YYYY-MM-DD" id="ymd" />
            <Label htmlFor="ymd" className="font-normal cursor-pointer">
              YYYY-MM-DD <span className="text-muted-foreground">(2025-12-31)</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Time Format */}
      <div className="space-y-3">
        <Label>{t('timeFormat.label')}</Label>
        <RadioGroup
          value={timeFormat}
          onValueChange={(value) => onTimeFormatChange(value as TimeFormat)}
          className="flex gap-4"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="24h" id="24h" />
            <Label htmlFor="24h" className="font-normal cursor-pointer">
              {t('timeFormat.24h')} <span className="text-muted-foreground">(14:30)</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="12h" id="12h" />
            <Label htmlFor="12h" className="font-normal cursor-pointer">
              {t('timeFormat.12h')} <span className="text-muted-foreground">(2:30 PM)</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Week Starts On */}
      <div className="space-y-3">
        <Label>{t('weekStart.label')}</Label>
        <RadioGroup
          value={weekStartsOn}
          onValueChange={(value) => onWeekStartChange(value as WeekStartDay)}
          className="flex gap-4"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="monday" id="monday" />
            <Label htmlFor="monday" className="font-normal cursor-pointer">
              {t('weekStart.monday')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sunday" id="sunday" />
            <Label htmlFor="sunday" className="font-normal cursor-pointer">
              {t('weekStart.sunday')}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Timezone */}
      <SettingItem
        label={t('timezone.label')}
        description={t('timezone.description', { detected: browserTz })}
        disabled={disabled}
      >
        <Select value={timezone} onValueChange={onTimezoneChange} disabled={disabled}>
          <SelectTrigger className="w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingItem>

      {/* Preview */}
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">{t('preview.label')}</p>
        <p className="mt-1 text-lg font-semibold">
          {datePreview} {timePreview}
        </p>
      </div>
    </div>
  );
}
