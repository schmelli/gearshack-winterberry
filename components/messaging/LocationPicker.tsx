/**
 * LocationPicker - Location Selection for Messages
 *
 * Feature: 046-user-messaging-system
 * Task: T056
 *
 * Dialog for selecting a location to share in messages.
 */

'use client';

import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationAutocomplete } from '@/components/profile/LocationAutocomplete';
import type { LocationSelection } from '@/types/profile';
import type { LocationMetadata } from '@/types/messaging';

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (metadata: LocationMetadata) => void;
}

/**
 * Dialog for selecting a location to share.
 */
export function LocationPicker({ open, onOpenChange, onSelect }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleLocationSelect = (location: LocationSelection | null) => {
    setSelectedLocation(location);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get place name with timeout protection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          const data = await response.json();
          const placeName =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.display_name?.split(',')[0] ||
            'Current Location';

          setSelectedLocation({
            name: placeName,
            formattedAddress: placeName,
            latitude,
            longitude,
            placeId: '',
          });
        } catch {
          clearTimeout(timeoutId);
          // Fallback to basic coordinates on timeout or error
          setSelectedLocation({
            name: 'Current Location',
            formattedAddress: 'Current Location',
            latitude,
            longitude,
            placeId: '',
          });
        }
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (selectedLocation && selectedLocation.latitude && selectedLocation.longitude) {
      const metadata: LocationMetadata = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        place_name: selectedLocation.formattedAddress,
      };
      onSelect(metadata);
      onOpenChange(false);
      setSelectedLocation(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedLocation(null);
  };

  const canConfirm = selectedLocation && selectedLocation.latitude && selectedLocation.longitude;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Search */}
          <LocationAutocomplete
            value={selectedLocation?.formattedAddress ?? ''}
            onSelect={handleLocationSelect}
            placeholder="Search for a location..."
          />

          {/* Current Location Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {isGettingLocation ? 'Getting location...' : 'Use Current Location'}
          </Button>

          {/* Selected Location Preview */}
          {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{selectedLocation.formattedAddress}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Share Location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
