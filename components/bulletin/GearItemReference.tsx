'use client';

/**
 * Gear Item Reference Component
 *
 * Feature: 051-community-bulletin-board (Enhancement)
 *
 * Renders a gear item reference with quick actions
 * Syntax: #gear:item-id or [Gear Name](#gear:item-id)
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Package, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GearItemReferenceProps {
  itemId: string;
  name?: string;
}

export function GearItemReference({ itemId, name }: GearItemReferenceProps) {
  const t = useTranslations('bulletin');
  const [loading, setLoading] = useState(false);

  // TODO: Implement actual gear item data fetching and add-to-inventory/wishlist functionality
  const handleAddToInventory = async () => {
    setLoading(true);
    // Implementation will be added based on existing gear item system
    console.log('Add to inventory:', itemId);
    setLoading(false);
  };

  return (
    <Card className="p-3 my-2 bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-1">
            {name || t('gearReference.defaultName', { id: itemId.slice(0, 8) })}
          </p>
          <p className="text-xs text-muted-foreground">{t('gearReference.description')}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddToInventory}
          disabled={loading}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('gearReference.add')}
        </Button>
      </div>
    </Card>
  );
}
