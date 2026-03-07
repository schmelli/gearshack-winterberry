/**
 * Quiet Hours Picker Component
 *
 * Feature: settings-update
 * Time range picker for quiet hours / do not disturb.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Moon } from 'lucide-react';
import type { QuietHoursSettings } from '@/types/settings';

interface QuietHoursPickerProps {
  settings: QuietHoursSettings;
  onUpdate: (settings: QuietHoursSettings) => void;
  disabled?: boolean;
}

// Generate time options (every 30 minutes)
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const label = value;
      options.push({ value, label });
    }
  }
  return options;
}

const timeOptions = generateTimeOptions();

export function QuietHoursPicker({
  settings,
  onUpdate,
  disabled = false,
}: QuietHoursPickerProps) {
  const t = useTranslations('settings.notifications.quietHours');

  const handleEnabledChange = (enabled: boolean) => {
    onUpdate({ ...settings, enabled });
  };

  const handleStartChange = (start: string) => {
    onUpdate({ ...settings, start });
  };

  const handleEndChange = (end: string) => {
    onUpdate({ ...settings, end });
  };

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Moon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-base">{t('enable.label')}</Label>
            <p className="text-sm text-muted-foreground">{t('enable.description')}</p>
          </div>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={handleEnabledChange}
          disabled={disabled}
        />
      </div>

      {/* Time Range */}
      {settings.enabled && (
        <div className="ml-0 sm:ml-13 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="start-time">{t('from')}</Label>
            <Select
              value={settings.start}
              onValueChange={handleStartChange}
              disabled={disabled}
            >
              <SelectTrigger id="start-time" className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-muted-foreground">{t('to')}</span>

          <div className="flex items-center gap-2">
            <Select
              value={settings.end}
              onValueChange={handleEndChange}
              disabled={disabled}
            >
              <SelectTrigger id="end-time" className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
