/**
 * LocationConsentDialog Component
 *
 * Feature: 053-merchant-integration
 * Task: T028
 *
 * Dialog for requesting user's location sharing consent with a merchant.
 * Offers city-level, neighborhood-level, or no sharing options.
 */

'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Building2, MapPinOff, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { LocationGranularity } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface LocationConsentDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Merchant name for context */
  merchantName: string;
  /** Current consent level if any */
  currentGranularity?: LocationGranularity;
  /** Callback when user selects consent level */
  onConfirm: (granularity: LocationGranularity) => void;
  /** Loading state during save */
  isLoading?: boolean;
}

// =============================================================================
// Option Config
// =============================================================================

interface ConsentOption {
  value: LocationGranularity;
  icon: typeof MapPin;
  translationKey: string;
  descriptionKey: string;
}

const CONSENT_OPTIONS: ConsentOption[] = [
  {
    value: 'city',
    icon: Building2,
    translationKey: 'cityOnly',
    descriptionKey: 'cityOnlyDesc',
  },
  {
    value: 'neighborhood',
    icon: MapPin,
    translationKey: 'neighborhood',
    descriptionKey: 'neighborhoodDesc',
  },
  {
    value: 'none',
    icon: MapPinOff,
    translationKey: 'noSharing',
    descriptionKey: 'noSharingDesc',
  },
];

// =============================================================================
// Component
// =============================================================================

export const LocationConsentDialog = memo(function LocationConsentDialog({
  open,
  onOpenChange,
  merchantName,
  currentGranularity,
  onConfirm,
  isLoading = false,
}: LocationConsentDialogProps) {
  const t = useTranslations('MerchantLoadouts.locationConsent');

  // Local state for selected option
  const [selected, setSelected] = useState<LocationGranularity>(
    currentGranularity ?? 'city'
  );

  const handleConfirm = () => {
    onConfirm(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {/* Privacy Notice */}
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm">
          <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <p className="text-muted-foreground">
            Only <strong>{merchantName}</strong> will see your location data.
            You can change this anytime in settings.
          </p>
        </div>

        {/* Options */}
        <RadioGroup
          value={selected}
          onValueChange={(val) => setSelected(val as LocationGranularity)}
          className="space-y-3"
        >
          {CONSENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.value;

            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <Label
                      htmlFor={option.value}
                      className="cursor-pointer font-medium"
                    >
                      {t(option.translationKey)}
                    </Label>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(option.descriptionKey)}
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Saving...' : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default LocationConsentDialog;
