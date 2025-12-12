/**
 * LoadoutMetadataSheet - Form for editing loadout metadata
 *
 * Feature: 007-grand-polish-sprint
 * US5: Loadout Metadata Editing
 * Allows editing of name, description, season, and trip date
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Loadout, Season } from '@/types/loadout';
import { SEASON_LABELS } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface LoadoutMetadataSheetProps {
  /** Loadout to edit */
  loadout: Loadout;
  /** Whether sheet is open */
  open: boolean;
  /** Callback when sheet open state changes */
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
}

function MetadataForm({ loadout, onSave, onCancel }: MetadataFormProps) {
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
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter loadout name"
            maxLength={100}
          />
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this loadout"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Season Select */}
        <div className="space-y-2">
          <Label htmlFor="season">Season</Label>
          <Select
            value={season ?? 'none'}
            onValueChange={(value) => setSeason(value === 'none' ? null : value as Season)}
          >
            <SelectTrigger id="season" className="w-full">
              <SelectValue placeholder="Select a season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No season</SelectItem>
              <SelectItem value="spring">{SEASON_LABELS.spring}</SelectItem>
              <SelectItem value="summer">{SEASON_LABELS.summer}</SelectItem>
              <SelectItem value="fall">{SEASON_LABELS.fall}</SelectItem>
              <SelectItem value="winter">{SEASON_LABELS.winter}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trip Date Field */}
        <div className="space-y-2">
          <Label htmlFor="tripDate">Trip Date</Label>
          <Input
            id="tripDate"
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
          />
        </div>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid}>
          Save Changes
        </Button>
      </SheetFooter>
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutMetadataSheet({
  loadout,
  open,
  onOpenChange,
  onSave,
}: LoadoutMetadataSheetProps) {
  // Generate a key that changes when the sheet opens to reset the form
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Loadout</SheetTitle>
          <SheetDescription>
            Update the name, description, season, and trip date for this loadout.
          </SheetDescription>
        </SheetHeader>

        {open && (
          <MetadataForm
            key={formKey}
            loadout={loadout}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
