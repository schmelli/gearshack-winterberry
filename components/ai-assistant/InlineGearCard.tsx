/**
 * Inline Gear Card Component
 * Feature 050: AI Assistant - T035
 *
 * Compact gear item display within chat messages.
 * Shows key specs and quick action buttons.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExternalLink, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';

interface GearItem {
  id: string;
  name: string;
  brand: string | null;
  product_type_id: string | null;
  weight_grams: number | null;
  price_paid: number | null;
  primary_image_url: string | null;
}

interface InlineGearCardProps {
  gearId: string;
}

export function InlineGearCard({ gearId }: InlineGearCardProps) {
  const [gear, setGear] = useState<GearItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchGear = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('gear_items')
          .select('id, name, brand, product_type_id, weight_grams, price_paid, primary_image_url')
          .eq('id', gearId)
          .single();

        if (!error && data) {
          setGear(data);
        }
      } catch (err) {
        console.error('Failed to fetch gear:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGear();
  }, [gearId, supabase]);

  if (isLoading) {
    return (
      <div className="flex h-20 w-full animate-pulse items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
        <div className="h-14 w-14 rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!gear) {
    return null;
  }

  const imageUrl = gear.primary_image_url;
  const formattedWeight = gear.weight_grams
    ? `${gear.weight_grams}g`
    : 'Weight not set';

  return (
    <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      {/* Gear Image */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={gear.name}
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Gear Info */}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold">{gear.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {gear.brand && <span>{gear.brand}</span>}
          <span>•</span>
          <span>{formattedWeight}</span>
          {gear.price_paid && (
            <>
              <span>•</span>
              <span>${gear.price_paid}</span>
            </>
          )}
        </div>
      </div>

      {/* View Button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => router.push(`/inventory?item=${gear.id}`)}
      >
        <ExternalLink className="h-4 w-4" />
        <span className="sr-only">View item</span>
      </Button>
    </div>
  );
}
