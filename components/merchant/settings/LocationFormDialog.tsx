/**
 * LocationFormDialog Component
 *
 * Feature: 053-merchant-integration
 *
 * Dialog for creating or editing merchant locations.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MerchantLocation, MerchantLocationInput } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: MerchantLocation | null;
  onSave: (input: MerchantLocationInput) => Promise<void>;
  isSaving: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function getDefaultForm(): MerchantLocationInput {
  return {
    name: '',
    addressLine1: '',
    addressLine2: undefined,
    city: '',
    postalCode: '',
    country: 'DE',
    latitude: 0,
    longitude: 0,
    phone: undefined,
    isPrimary: false,
  };
}

function locationToForm(location: MerchantLocation): MerchantLocationInput {
  return {
    name: location.name,
    addressLine1: location.addressLine1,
    addressLine2: location.addressLine2 ?? undefined,
    city: location.city,
    postalCode: location.postalCode,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    phone: location.phone ?? undefined,
    isPrimary: location.isPrimary,
  };
}

// =============================================================================
// Component
// =============================================================================

export function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSave,
  isSaving,
}: LocationFormDialogProps) {
  const t = useTranslations('MerchantSettings.locations');

  // Track which location we initialized from to detect changes
  const [lastLocationId, setLastLocationId] = useState<string | null>(null);
  const [form, setForm] = useState<MerchantLocationInput>(getDefaultForm);

  // Reset form when location prop changes (triggered by open state)
  const currentLocationId = location?.id ?? null;
  if (open && currentLocationId !== lastLocationId) {
    setLastLocationId(currentLocationId);
    setForm(location ? locationToForm(location) : getDefaultForm());
  }

  // Reset tracking when dialog closes
  if (!open && lastLocationId !== null) {
    setLastLocationId(null);
  }

  async function handleSubmit(): Promise<void> {
    await onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {location ? t('editLocation') : t('addLocation')}
          </DialogTitle>
          <DialogDescription>{t('formDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loc-name">{t('form.name')}</Label>
            <Input
              id="loc-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('form.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-address1">{t('form.address')}</Label>
            <Input
              id="loc-address1"
              value={form.addressLine1}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, addressLine1: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-postal">{t('form.postalCode')}</Label>
              <Input
                id="loc-postal"
                value={form.postalCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, postalCode: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-city">{t('form.city')}</Label>
              <Input
                id="loc-city"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-phone">{t('form.phone')}</Label>
            <Input
              id="loc-phone"
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value || undefined }))
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-lat">{t('form.latitude')}</Label>
              <Input
                id="loc-lat"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    latitude: Number.isFinite(parsed) ? parsed : 0,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-lng">{t('form.longitude')}</Label>
              <Input
                id="loc-lng"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    longitude: Number.isFinite(parsed) ? parsed : 0,
                  }));
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.name || !form.city}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
