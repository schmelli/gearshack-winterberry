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
  RefreshCw,
  Trash,
  CheckCircle2,
  Clock,
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

type ExportFormat = 'json' | 'csv';

export default function DataSettingsPage() {
  const t = useTranslations('settings.data');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Mock sync status
  const lastSync = new Date().toLocaleString();
  const storageUsed = 45; // MB
  const storageLimit = 500; // MB
  const storagePercentage = (storageUsed / storageLimit) * 100;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement data export via API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock download
      const data = { exported: true, format: exportFormat };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: exportFormat === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gearshack-export-${Date.now()}.${exportFormat}`;
      a.click();
      // Delay revocation to ensure download starts (some browsers need this)
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast.success(t('export.success'));
    } catch {
      toast.error(t('export.error'));
    } finally {
      setIsExporting(false);
    }
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

  const handleForceSync = async () => {
    try {
      // TODO: Implement force sync
      toast.success(t('sync.forced'));
    } catch {
      toast.error(t('sync.error'));
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
            <SelectTrigger className="w-[120px]">
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

      {/* Sync Status */}
      <SettingsSection
        title={t('sync.title')}
        description={t('sync.description')}
      >
        <SettingItem label={t('sync.lastSync')}>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{lastSync}</span>
          </div>
        </SettingItem>

        <Button variant="outline" onClick={handleForceSync}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('sync.forceButton')}
        </Button>
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
