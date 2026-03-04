/**
 * SwipeActionSelector Component
 *
 * Settings UI for customizing swipe gesture actions on loadout item cards.
 * Renders 4 Select dropdowns (one per slot) with a visual preview.
 */

'use client';

import { useTranslations } from 'next-intl';
import { X, Shirt, Apple, Copy, Eye, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SwipeAction, SwipeActionConfig } from '@/types/settings';

// =============================================================================
// Types
// =============================================================================

interface SwipeActionSelectorProps {
  config: SwipeActionConfig;
  onConfigChange: (config: SwipeActionConfig) => void;
  disabled?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SWIPE_ACTION_OPTIONS: SwipeAction[] = [
  'remove',
  'toggleWorn',
  'toggleConsumable',
  'duplicate',
  'viewDetails',
  'none',
];

const ACTION_ICONS: Record<SwipeAction, React.ReactNode> = {
  remove: <X className="h-4 w-4" />,
  toggleWorn: <Shirt className="h-4 w-4" />,
  toggleConsumable: <Apple className="h-4 w-4" />,
  duplicate: <Copy className="h-4 w-4" />,
  viewDetails: <Eye className="h-4 w-4" />,
  none: null,
};

// =============================================================================
// Component
// =============================================================================

export function SwipeActionSelector({
  config,
  onConfigChange,
  disabled = false,
}: SwipeActionSelectorProps) {
  const t = useTranslations('settings.appearance.swipeActions');

  const handleChange = (key: keyof SwipeActionConfig, value: string) => {
    if (!SWIPE_ACTION_OPTIONS.includes(value as SwipeAction)) return;
    onConfigChange({
      ...config,
      [key]: value as SwipeAction,
    });
  };

  const actionLabel = (action: SwipeAction): string => {
    return t(`actions.${action}`);
  };

  return (
    <div className="space-y-6">
      {/* Visual Preview */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
          {t('preview')}
        </p>
        <div className="flex items-center justify-center gap-2">
          {/* Left swipe direction indicator */}
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span className="max-w-16 text-center leading-tight">
              {actionLabel(config.swipeLeftPrimary)}
            </span>
          </div>

          {/* Card preview */}
          <div className="flex h-14 w-40 items-center justify-center rounded-lg border bg-card shadow-sm">
            <Smartphone className="mr-1.5 h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('previewCard')}</span>
          </div>

          {/* Right swipe direction indicator */}
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
            <span className="max-w-16 text-center leading-tight">
              {actionLabel(config.swipeRightPrimary)}
            </span>
          </div>
        </div>
      </div>

      {/* Swipe Left Configuration */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('swipeLeft')}</Label>
        <div className="grid grid-cols-2 gap-3">
          <ActionSelect
            label={t('primary')}
            value={config.swipeLeftPrimary}
            onChange={(v) => handleChange('swipeLeftPrimary', v)}
            actionLabel={actionLabel}
            disabled={disabled}
          />
          <ActionSelect
            label={t('secondary')}
            value={config.swipeLeftSecondary}
            onChange={(v) => handleChange('swipeLeftSecondary', v)}
            actionLabel={actionLabel}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Swipe Right Configuration */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('swipeRight')}</Label>
        <div className="grid grid-cols-2 gap-3">
          <ActionSelect
            label={t('primary')}
            value={config.swipeRightPrimary}
            onChange={(v) => handleChange('swipeRightPrimary', v)}
            actionLabel={actionLabel}
            disabled={disabled}
          />
          <ActionSelect
            label={t('secondary')}
            value={config.swipeRightSecondary}
            onChange={(v) => handleChange('swipeRightSecondary', v)}
            actionLabel={actionLabel}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        {t('hints.mobileOnly')}
      </p>
    </div>
  );
}

// =============================================================================
// ActionSelect Sub-Component
// =============================================================================

interface ActionSelectProps {
  label: string;
  value: SwipeAction;
  onChange: (value: string) => void;
  actionLabel: (action: SwipeAction) => string;
  disabled?: boolean;
}

function ActionSelect({ label, value, onChange, actionLabel, disabled }: ActionSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SWIPE_ACTION_OPTIONS.map((action) => (
            <SelectItem key={action} value={action}>
              <div className="flex items-center gap-2">
                {ACTION_ICONS[action]}
                <span>{actionLabel(action)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
