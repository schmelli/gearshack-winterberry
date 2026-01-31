/**
 * URL Import Dialog Component
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * Multi-step dialog for importing product data from URLs:
 * 1. URL input
 * 2. Loading state
 * 3. Preview with catalog match option
 * 4. Navigate to form with prefill
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Loader2, Link2, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useUrlImport, type FormPrefillData } from '@/hooks/useUrlImport';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface UrlImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'inventory' | 'wishlist';
}

// Session storage key for prefill data
const PREFILL_STORAGE_KEY = 'gearshack-import-prefill';

// =============================================================================
// Component
// =============================================================================

export function UrlImportDialog({
  open,
  onOpenChange,
  mode,
}: UrlImportDialogProps) {
  const t = useTranslations('Inventory');
  const router = useRouter();
  const [url, setUrl] = useState('');

  const {
    status,
    importedData,
    catalogMatch,
    error,
    useCatalogData,
    importFromUrl,
    clearImport,
    setUseCatalogData,
    getFormPrefill,
  } = useUrlImport();

  /**
   * Handle URL submission
   */
  const handleImport = useCallback(async () => {
    if (!url.trim()) return;
    await importFromUrl(url.trim());
  }, [url, importFromUrl]);

  /**
   * Handle proceed to form
   */
  const handleProceed = useCallback(() => {
    const prefillData = getFormPrefill();
    if (prefillData) {
      // Store prefill data in sessionStorage
      sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(prefillData));

      // Navigate to form with prefill flag
      const targetUrl = mode === 'wishlist'
        ? '/inventory/new?mode=wishlist&prefill=true'
        : '/inventory/new?prefill=true';

      router.push(targetUrl);
      onOpenChange(false);
    }
  }, [getFormPrefill, mode, router, onOpenChange]);

  /**
   * Handle dialog close
   */
  const handleClose = useCallback(() => {
    clearImport();
    setUrl('');
    onOpenChange(false);
  }, [clearImport, onOpenChange]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    clearImport();
  }, [clearImport]);

  /**
   * Get match confidence badge color
   */
  const getMatchColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500 text-white';
    if (score >= 0.6) return 'bg-yellow-500 text-black';
    return 'bg-orange-500 text-white';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('importFromUrl')}
          </DialogTitle>
          <DialogDescription>
            {t('importUrlDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: URL Input */}
        {status === 'idle' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-url">{t('productUrl')}</Label>
              <Input
                id="import-url"
                type="url"
                placeholder={t('importUrlPlaceholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleImport();
                }}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('cancel')}
              </Button>
              <Button onClick={handleImport} disabled={!url.trim()}>
                {t('import')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Loading */}
        {status === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('importProgress')}</p>
          </div>
        )}

        {/* Step 3: Error */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('cancel')}
              </Button>
              <Button onClick={handleRetry}>
                {t('tryAgain')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Success - Preview */}
        {status === 'success' && importedData && (
          <div className="space-y-4">
            {/* Extracted Data Preview */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                {importedData.imageUrl && (
                  <Image
                    src={importedData.imageUrl}
                    alt={importedData.name || 'Product'}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded-md border"
                    placeholder="empty"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {importedData.name || t('unknownProduct')}
                  </h4>
                  {importedData.brand && (
                    <p className="text-xs text-muted-foreground">{importedData.brand}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {importedData.extractionConfidence === 'high' ? t('highConfidence')
                        : importedData.extractionConfidence === 'medium' ? t('mediumConfidence')
                        : t('lowConfidence')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Extracted details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {importedData.weightGrams && (
                  <div>
                    <span className="text-muted-foreground">{t('weight')}:</span>{' '}
                    {importedData.weightGrams}g
                  </div>
                )}
                {importedData.priceValue && (
                  <div>
                    <span className="text-muted-foreground">{t('price')}:</span>{' '}
                    {importedData.currency || '$'}{importedData.priceValue}
                  </div>
                )}
              </div>
            </Card>

            {/* Catalog Match (if found) */}
            {catalogMatch && (
              <Card className={cn(
                'p-4 space-y-3 border-2 transition-colors',
                useCatalogData ? 'border-primary bg-primary/5' : 'border-muted'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{t('catalogMatchFound')}</span>
                    <Badge className={cn('text-xs', getMatchColor(catalogMatch.matchScore))}>
                      {Math.round(catalogMatch.matchScore * 100)}%
                    </Badge>
                  </div>
                  <Switch
                    checked={useCatalogData}
                    onCheckedChange={setUseCatalogData}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">{catalogMatch.name}</p>
                  {catalogMatch.brand && (
                    <p className="text-xs text-muted-foreground">{catalogMatch.brand}</p>
                  )}
                  {catalogMatch.productType && (
                    <p className="text-xs text-muted-foreground">
                      {catalogMatch.categoryMain} → {catalogMatch.subcategory} → {catalogMatch.productType}
                    </p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {useCatalogData ? t('usingCatalogData') : t('usingExtractedData')}
                </p>
              </Card>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('cancel')}
              </Button>
              <Button onClick={handleProceed}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('proceedToForm')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Helper: Get prefill data from session storage
// =============================================================================

/**
 * Retrieves and clears prefill data from session storage
 */
export function getImportPrefillData(): FormPrefillData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(PREFILL_STORAGE_KEY);
    if (stored) {
      sessionStorage.removeItem(PREFILL_STORAGE_KEY);
      return JSON.parse(stored) as FormPrefillData;
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}
