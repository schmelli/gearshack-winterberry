/**
 * Data & Sync Settings Page
 *
 * Feature: settings-update
 * Data export, import, and sync status management.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  Upload,
  Trash,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingItem } from '@/components/settings/SettingItem';
import { toast } from 'sonner';
import { useItems, useLoadouts } from '@/hooks/useSupabaseStore';
import type { GearItem } from '@/types/gear';
import type { LoadoutLocal } from '@/hooks/useSupabaseStore';

type ExportFormat = 'json' | 'csv';

export default function DataSettingsPage() {
  const t = useTranslations('settings.data');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Get actual data from store
  const allItems = useItems();
  const allLoadouts = useLoadouts();

  // Storage status (mock for now)
  const storageUsed = 45; // MB
  const storageLimit = 500; // MB
  const storagePercentage = (storageUsed / storageLimit) * 100;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Separate inventory items from wishlist items
      const inventoryItems = allItems.filter((item) => item.status !== 'wishlist');
      const wishlistItems = allItems.filter((item) => item.status === 'wishlist');

      // Prepare export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        gear: inventoryItems,
        loadouts: allLoadouts,
        wishlist: wishlistItems,
        settings: {
          // TODO: Add user settings when available
        },
      };

      let content: string;
      let mimeType: string;

      if (exportFormat === 'json') {
        // JSON export (preserve all data structure)
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
      } else {
        // CSV export (flatten data, separate sheets for gear/loadouts/wishlist)
        content = convertToCSV(exportData);
        mimeType = 'text/csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gearshack-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      a.click();
      // Delay revocation to ensure download starts (some browsers need this)
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast.success(t('export.success'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Convert data to CSV format
  const convertToCSV = (data: {
    gear: GearItem[];
    loadouts: LoadoutLocal[];
    wishlist: GearItem[];
  }): string => {
    const sections: string[] = [];

    // CSV for Gear Items
    if (data.gear.length > 0) {
      sections.push('=== GEAR INVENTORY ===');
      sections.push(gearItemsToCSV(data.gear));
      sections.push('');
    }

    // CSV for Loadouts
    if (data.loadouts.length > 0) {
      sections.push('=== LOADOUTS ===');
      sections.push(loadoutsToCSV(data.loadouts));
      sections.push('');
    }

    // CSV for Wishlist
    if (data.wishlist.length > 0) {
      sections.push('=== WISHLIST ===');
      sections.push(gearItemsToCSV(data.wishlist));
      sections.push('');
    }

    return sections.join('\n');
  };

  // Convert gear items to CSV
  const gearItemsToCSV = (items: GearItem[]): string => {
    if (items.length === 0) return '';

    const headers = [
      'ID',
      'Name',
      'Brand',
      'Status',
      'Condition',
      'Weight (g)',
      'Price Paid',
      'Currency',
      'Purchase Date',
      'Product Type ID',
      'Description',
      'Notes',
      'Quantity',
      'Is Favourite',
      'Created At',
    ];

    const rows = items.map((item) => [
      item.id,
      escapeCSV(item.name),
      escapeCSV(item.brand || ''),
      item.status,
      item.condition,
      item.weightGrams || '',
      item.pricePaid || '',
      item.currency || '',
      item.purchaseDate ? item.purchaseDate.toISOString().split('T')[0] : '',
      item.productTypeId || '',
      escapeCSV(item.description || ''),
      escapeCSV(item.notes || ''),
      item.quantity,
      item.isFavourite ? 'Yes' : 'No',
      item.createdAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  };

  // Convert loadouts to CSV
  const loadoutsToCSV = (loadouts: LoadoutLocal[]): string => {
    if (loadouts.length === 0) return '';

    const headers = [
      'ID',
      'Name',
      'Trip Date',
      'Item Count',
      'Item IDs',
      'Activity Types',
      'Seasons',
      'Description',
      'Created At',
    ];

    const rows = loadouts.map((loadout) => [
      loadout.id,
      escapeCSV(loadout.name),
      loadout.tripDate ? loadout.tripDate.toISOString().split('T')[0] : '',
      loadout.itemIds.length,
      escapeCSV(loadout.itemIds.join('; ')),
      escapeCSV(loadout.activityTypes.join('; ')),
      escapeCSV(loadout.seasons.join('; ')),
      escapeCSV(loadout.description || ''),
      loadout.createdAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  };

  // Escape CSV special characters
  const escapeCSV = (value: string): string => {
    if (!value) return '';
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear localStorage cache
      const keysToKeep = ['theme', 'locale'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (!keysToKeep.some((keep) => key.includes(keep))) {
          localStorage.removeItem(key);
        }
      });

      toast.success(t('cache.cleared'));
      setShowClearDialog(false);
    } catch {
      toast.error(t('cache.error'));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <SettingsSection
        title={t('export.title')}
        description={t('export.description')}
      >
        <SettingItem label={t('export.format.label')}>
          <Select
            value={exportFormat}
            onValueChange={(value) => setExportFormat(value as ExportFormat)}
          >
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {t('export.includes')}
          </p>
          <ul className="text-sm space-y-1 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('export.items.gear')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('export.items.loadouts')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('export.items.wishlist')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('export.items.settings')}
            </li>
          </ul>

          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? t('export.exporting') : t('export.button')}
          </Button>
        </div>
      </SettingsSection>

      {/* Import Section */}
      <SettingsSection
        title={t('import.title')}
        description={t('import.description')}
      >
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            {t('import.dropzone')}
          </p>
          <Button variant="outline" disabled>
            {t('import.button')}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('import.comingSoon')}
          </p>
        </div>
      </SettingsSection>

      {/* Storage Section */}
      <SettingsSection
        title={t('storage.title')}
        description={t('storage.description')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {t('storage.used', { used: storageUsed, limit: storageLimit })}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {storagePercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={storagePercentage} />
        </div>
      </SettingsSection>

      {/* Clear Cache */}
      <SettingsSection
        title={t('cache.title')}
        description={t('cache.description')}
      >
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Trash className="mr-2 h-4 w-4" />
              {t('cache.button')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('cache.dialog.title')}</DialogTitle>
              <DialogDescription>
                {t('cache.dialog.description')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowClearDialog(false)}
              >
                {t('cache.dialog.cancel')}
              </Button>
              <Button onClick={handleClearCache} disabled={isClearing}>
                {isClearing ? t('cache.dialog.clearing') : t('cache.dialog.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsSection>
    </div>
  );
}
