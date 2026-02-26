/**
 * LoadoutAvailabilityStep Component
 *
 * Feature: 053-merchant-integration
 * Task: T037
 *
 * Fourth step of the loadout creation wizard.
 * Configures which store locations have this loadout in stock.
 */

'use client';

import { useTranslations } from 'next-intl';
import { MapPin, Store, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LoadoutAvailabilityInput } from '@/types/merchant-loadout';
import type { MerchantLocation } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutAvailabilityStepProps {
  /** Current availability settings */
  availability: LoadoutAvailabilityInput[];
  /** Available store locations */
  locations: MerchantLocation[];
  /** Callback to update availability */
  onUpdateAvailability: (
    locationId: string,
    updates: Partial<LoadoutAvailabilityInput>
  ) => void;
  /** Callback to remove availability */
  onRemoveAvailability: (locationId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutAvailabilityStep({
  availability,
  locations,
  onUpdateAvailability,
  onRemoveAvailability,
}: LoadoutAvailabilityStepProps) {
  const t = useTranslations('MerchantLoadouts.wizard.availability');

  // Get availability for a location
  const getLocationAvailability = (
    locationId: string
  ): LoadoutAvailabilityInput | undefined => {
    return availability.find((a) => a.locationId === locationId);
  };

  // Handle toggle for a location
  const handleToggleLocation = (location: MerchantLocation, enabled: boolean) => {
    if (enabled) {
      onUpdateAvailability(location.id, {
        locationId: location.id,
        isInStock: true,
      });
    } else {
      onRemoveAvailability(location.id);
    }
  };

  // Handle stock status toggle
  const handleStockToggle = (locationId: string, isInStock: boolean) => {
    onUpdateAvailability(locationId, { isInStock });
  };

  // Handle stock note change
  const handleStockNoteChange = (locationId: string, stockNote: string) => {
    onUpdateAvailability(locationId, { stockNote });
  };

  // No locations configured
  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <Store className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">{t('noLocations')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('noLocationsHint')}
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('selectLocations')}</p>

      <div className="space-y-3">
        {locations.map((location) => {
          const locationAvailability = getLocationAvailability(location.id);
          const isEnabled = !!locationAvailability;
          const isInStock = locationAvailability?.isInStock ?? true;

          return (
            <Card
              key={location.id}
              className={cn(
                'transition-colors',
                isEnabled ? 'border-primary/50 bg-primary/5' : 'opacity-75'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Enable Toggle */}
                  <div className="pt-1">
                    <Switch
                      id={`location-${location.id}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        handleToggleLocation(location, checked)
                      }
                    />
                  </div>

                  {/* Location Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`location-${location.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {location.name}
                      </Label>
                      {location.isPrimary && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {location.addressLine1}, {location.city}
                    </p>

                    {/* Stock Configuration (only when enabled) */}
                    {isEnabled && (
                      <div className="mt-4 space-y-3 pt-3 border-t">
                        {/* In Stock Toggle */}
                        <div className="flex items-center gap-3">
                          <Switch
                            id={`stock-${location.id}`}
                            checked={isInStock}
                            onCheckedChange={(checked) =>
                              handleStockToggle(location.id, checked)
                            }
                          />
                          <Label
                            htmlFor={`stock-${location.id}`}
                            className={cn(
                              'text-sm cursor-pointer',
                              isInStock ? 'text-green-600' : 'text-amber-600'
                            )}
                          >
                            {isInStock ? t('inStock') : t('outOfStock')}
                          </Label>
                        </div>

                        {/* Stock Note */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`note-${location.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            {t('stockNote')}
                          </Label>
                          <Input
                            id={`note-${location.id}`}
                            value={locationAvailability?.stockNote ?? ''}
                            onChange={(e) =>
                              handleStockNoteChange(location.id, e.target.value)
                            }
                            placeholder={t('stockNotePlaceholder')}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {availability.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span>
              {availability.length}{' '}
              {availability.length === 1 ? 'location' : 'locations'} configured
              {' • '}
              {availability.filter((a) => a.isInStock).length} in stock
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoadoutAvailabilityStep;
