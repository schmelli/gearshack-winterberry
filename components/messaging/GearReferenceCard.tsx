/**
 * GearReferenceCard - Gear Item Reference Display Component
 *
 * Feature: 046-user-messaging-system
 * Task: T053
 *
 * Displays a shared gear item with image, name, and link to details.
 */

'use client';

import { Package, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import type { GearReferenceMetadata } from '@/types/messaging';
import { cn } from '@/lib/utils';

interface GearReferenceCardProps {
  metadata: GearReferenceMetadata;
  isOwnMessage?: boolean;
  onViewGear?: (gearItemId: string) => void;
  className?: string;
}

/**
 * Displays a gear item reference with image preview.
 */
export function GearReferenceCard({
  metadata,
  isOwnMessage = false,
  onViewGear,
  className,
}: GearReferenceCardProps) {
  const { gear_item_id, name, image_url } = metadata;

  const handleViewGear = () => {
    onViewGear?.(gear_item_id);
  };

  return (
    <Card
      className={cn(
        'w-[240px] cursor-pointer overflow-hidden transition-shadow hover:shadow-md',
        isOwnMessage ? 'bg-primary/10' : 'bg-muted/50',
        className
      )}
      onClick={handleViewGear}
    >
      {/* Gear Image */}
      <AspectRatio ratio={4 / 3} className="bg-muted">
        {image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_url}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
      </AspectRatio>

      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{name}</p>
            <p className="text-xs text-muted-foreground">Gear Item</p>
          </div>
          {onViewGear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleViewGear();
              }}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">View gear details</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
