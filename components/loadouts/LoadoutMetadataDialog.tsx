/**
 * LoadoutMetadataDialog - Form for editing loadout metadata
 *
 * Feature: 011-rescue-refine-bugs
 * T007: Migrate Edit Loadout from Sheet to Dialog
 * Allows editing of name, description, season, and trip date
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SeasonSelector } from '@/components/loadouts/SeasonSelector';
import { useTranslations } from 'next-intl';
import type { Loadout, Season } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface LoadoutMetadataDialogProps {
  /** Loadout to edit */
  loadout: Loadout;
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when form is submitted with updated data */
  onSave: (data: { name: string; description: string | null; season: Season | null; tripDate: Date | null }) => void;
}

// =============================================================================
// Inner Form Component (resets when key changes)
// =============================================================================

interface MetadataFormProps {
  loadout: Loadout;
  onSave: (data: { name: string; description: string | null; season: Season | null; tripDate: Date | null }) => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations<'Loadouts'>>;
  tCommon: ReturnType<typeof useTranslations<'Common'>>;
}

function MetadataForm({ loadout, onSave, onCancel, t, tCommon }: MetadataFormProps) {
  // Initialize form state from loadout
  const [name, setName] = useState(loadout.name);
  const [description, setDescription] = useState(loadout.description ?? '');
  const [season, setSeason] = useState<Season | null>(
    loadout.seasons && loadout.seasons.length > 0 ? loadout.seasons[0] : null
  );
  const [tripDate, setTripDate] = useState(
    loadout.tripDate ? loadout.tripDate.toISOString().split('T')[0] : ''
  );

  const handleSave = () => {
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      season,
      tripDate: tripDate ? new Date(tripDate) : null,
    });
  };

  const isValid = name.trim().length > 0;

  return (
    <>
      <div className="flex flex-col gap-4 py-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">{t('metadataSheet.nameLabel')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('metadataSheet.namePlaceholder')}
            maxLength={100}
          />
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description">{t('metadataSheet.descriptionLabel')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('metadataSheet.descriptionPlaceholder')}
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Season Select */}
        <div className="space-y-2">
          <Label htmlFor="season">{t('metadataSheet.seasonLabel')}</Label>
          <SeasonSelector
            value={season}
            onChange={setSeason}
          />
        </div>

        {/* Trip Date Field */}
        <div className="space-y-2">
          <Label htmlFor="tripDate">{t('metadataSheet.tripDateLabel')}</Label>
          <Input
            id="tripDate"
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {tCommon('cancel')}
        </Button>
        <Button onClick={handleSave} disabled={!isValid}>
          {tCommon('saveChanges')}
        </Button>
      </DialogFooter>
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutMetadataDialog({
  loadout,
  open,
  onOpenChange,
  onSave,
}: LoadoutMetadataDialogProps) {
  const t = useTranslations('Loadouts');
  const tCommon = useTranslations('Common');

  // Generate a key that changes when the dialog opens to reset the form
  const formKey = useMemo(() => {
    return open ? `${loadout.id}-${loadout.updatedAt.getTime()}` : 'closed';
  }, [open, loadout.id, loadout.updatedAt]);

  // Handle save and close
  const handleSave = (data: { name: string; description: string | null; season: Season | null; tripDate: Date | null }) => {
    onSave(data);
    onOpenChange(false);
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('metadataSheet.title')}</DialogTitle>
          <DialogDescription>
            {t('metadataSheet.description')}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <MetadataForm
            key={formKey}
            loadout={loadout}
            onSave={handleSave}
            onCancel={handleCancel}
            t={t}
            tCommon={tCommon}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
