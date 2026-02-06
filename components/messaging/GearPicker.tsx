/**
 * GearPicker - Gear Item Selection for Messages
 *
 * Feature: 046-user-messaging-system
 * Task: T053
 *
 * Allows users to pick from their gear inventory to share in messages.
 */

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Package, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useItems } from '@/hooks/useSupabaseStore';
import type { GearItem } from '@/types/gear';
import type { GearReferenceMetadata } from '@/types/messaging';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface GearPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (metadata: GearReferenceMetadata) => void;
}

/**
 * Dialog for selecting gear items from inventory to share.
 */
export function GearPicker({ open, onOpenChange, onSelect }: GearPickerProps) {
  const t = useTranslations('Messaging');
  const tCommon = useTranslations('Common');
  const items = useItems();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleSelect = (item: GearItem) => {
    setSelectedId(item.id);
  };

  const handleConfirm = () => {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      const metadata: GearReferenceMetadata = {
        gear_item_id: selected.id,
        name: selected.brand ? `${selected.brand} ${selected.name}` : selected.name,
        image_url: selected.primaryImageUrl || '',
      };
      onSelect(metadata);
      onOpenChange(false);
      setSelectedId(null);
      setSearchQuery('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedId(null);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('gearPicker.title')}</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('gearPicker.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Gear List */}
        <ScrollArea className="h-[300px]">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {items.length === 0
                  ? t('gearPicker.noGearInInventory')
                  : t('gearPicker.noGearMatches')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-1">
              {filteredItems.map((item) => (
                <GearPickerItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onSelect={() => handleSelect(item)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>
            {t('gearPicker.share')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface GearPickerItemProps {
  item: GearItem;
  isSelected: boolean;
  onSelect: () => void;
}

function GearPickerItem({ item, isSelected, onSelect }: GearPickerItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative overflow-hidden rounded-lg border-2 text-left transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-transparent hover:border-muted-foreground/20'
      )}
    >
      <AspectRatio ratio={1} className="bg-muted">
        {item.primaryImageUrl ? (
          <Image
            src={item.primaryImageUrl}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </AspectRatio>

      <div className="p-2">
        <p className="truncate text-xs font-medium">{item.name}</p>
        {item.brand && (
          <p className="truncate text-xs text-muted-foreground">{item.brand}</p>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute right-1 top-1 rounded-full bg-primary p-1">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}
