/**
 * LocationCard - Location Message Display Component
 *
 * Feature: 046-user-messaging-system
 * Task: T052
 *
 * Displays a shared location with map preview and place name.
 */

'use client';

import { MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LocationMetadata } from '@/types/messaging';
import { cn } from '@/lib/utils';

interface LocationCardProps {
  metadata: LocationMetadata;
  isOwnMessage?: boolean;
  className?: string;
}

/**
 * Displays a location message with a static map preview.
 */
export function LocationCard({
  metadata,
  isOwnMessage = false,
  className,
}: LocationCardProps) {
  const { latitude, longitude, place_name } = metadata;

  // Validate coordinates to prevent malformed URLs
  const isValidCoordinate = (lat: number, lon: number): boolean => {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      isFinite(lat) &&
      isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  };

  const validCoords = isValidCoordinate(latitude, longitude);
  const safeLat = validCoords ? latitude : 0;
  const safeLon = validCoords ? longitude : 0;

  // Generate static map URL (OpenStreetMap tiles)
  const mapUrl = `https://www.openstreetmap.org/?mlat=${safeLat}&mlon=${safeLon}#map=15/${safeLat}/${safeLon}`;

  // Static map image from OpenStreetMap's static map service
  const staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${safeLat},${safeLon}&zoom=14&size=300x150&maptype=osmarenderer&markers=${safeLat},${safeLon},red-pushpin`;

  const handleOpenMap = () => {
    if (!validCoords) {
      console.error('[LocationCard] Invalid coordinates:', { latitude, longitude });
      return;
    }
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      className={cn(
        'w-[280px] cursor-pointer overflow-hidden transition-shadow hover:shadow-md',
        isOwnMessage ? 'bg-primary/10' : 'bg-muted/50',
        className
      )}
      onClick={handleOpenMap}
    >
      {/* Map Preview */}
      <div className="relative h-[120px] bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={staticMapUrl}
          alt={`Map of ${place_name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-red-500 p-2 shadow-lg">
            <MapPin className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{place_name}</p>
            <p className="text-xs text-muted-foreground">
              {validCoords ? `${safeLat.toFixed(4)}, ${safeLon.toFixed(4)}` : 'Invalid location'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMap();
            }}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Open in maps</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
