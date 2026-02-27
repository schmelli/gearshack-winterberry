/**
 * VisionScanDialog Component
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Dialog for uploading a photo and importing detected gear items.
 * Supports importing to inventory or wishlist based on destination prop.
 * Follows Feature-Sliced Light: stateless UI, logic in useVisionScan hook.
 */

'use client';

import { useRef, useCallback, useMemo } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVisionScan } from '@/hooks/inventory/useVisionScan';
import { useAlternativeImages } from '@/hooks/inventory/useAlternativeImages';
import { VisionScanResults } from './VisionScanResults';
import { VisionScanDisambiguation } from './VisionScanDisambiguation';
import { VisionScanImagePreview } from './VisionScanImagePreview';
import type { VisionScanDestination, CatalogMatch } from '@/types/vision-scan';

// =============================================================================
// Types
// =============================================================================

interface VisionScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (count: number) => void;
  /** Where to import scanned items: 'inventory' or 'wishlist' */
  destination?: VisionScanDestination;
}

// =============================================================================
// Component
// =============================================================================

export function VisionScanDialog({
  open,
  onOpenChange,
  onImportComplete,
  destination = 'inventory',
}: VisionScanDialogProps) {
  const t = useTranslations('VisionScan');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    state,
    destination: activeDestination,
    scanImage,
    toggleItem,
    selectAll,
    deselectAll,
    importSelected,
    reset,
    openDisambiguation,
    selectAlternative,
    closeDisambiguation,
  } = useVisionScan({
    destination,
    onImportComplete,
    onAutoClose: () => onOpenChange(false),
  });

  // Get the item being disambiguated
  const disambiguatingItem =
    state.disambiguatingIndex !== null
      ? state.results[state.disambiguatingIndex] ?? null
      : null;

  // Build sorted list of all options (best match + alternatives) in one place.
  // Shared between useAlternativeImages (for lazy loading) and the
  // VisionScanDisambiguation component (for display), avoiding duplication.
  const disambiguationOptions = useMemo(() => {
    if (!disambiguatingItem) return [];
    const options: CatalogMatch[] = [];
    if (disambiguatingItem.catalogMatch) {
      options.push(disambiguatingItem.catalogMatch);
    }
    options.push(...disambiguatingItem.alternatives);
    return options.sort((a, b) => b.matchScore - a.matchScore);
  }, [disambiguatingItem]);

  // Lazy-load images for disambiguation alternatives (hook in hooks/ layer)
  const lazyImages = useAlternativeImages(disambiguationOptions);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        scanImage(file);
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [scanImage]
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isProcessing = state.status === 'analyzing';
  const isWishlist = activeDestination === 'wishlist';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {isWishlist ? t('descriptionWishlist') : t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* ============================================================== */}
        {/* IDLE / ERROR: Upload Zone                                      */}
        {/* ============================================================== */}
        {(state.status === 'idle' || state.status === 'error') && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">{t('uploadPrompt')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('uploadHint')}
                </p>
              </div>
            </button>

            {state.error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{state.error}</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PROCESSING: Scan Animation                                     */}
        {/* ============================================================== */}
        {isProcessing && (
          <div className="space-y-3">
            {state.previewUrl ? (
              <VisionScanImagePreview
                previewUrl={state.previewUrl}
                status={state.status}
                results={state.results}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {t('pleaseWait')}
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* REVIEW: Results                                                */}
        {/* ============================================================== */}
        {state.status === 'review' && (
          <>
            {/* Image preview with detection chips (only when items found) */}
            {state.previewUrl && state.results.length > 0 && (
              <VisionScanImagePreview
                previewUrl={state.previewUrl}
                status={state.status}
                results={state.results}
              />
            )}

            {state.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Camera className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('noItemsDetected')}
                </p>
                <Button variant="outline" size="sm" onClick={handleUploadClick}>
                  {t('tryAnother')}
                </Button>
              </div>
            ) : (
              <VisionScanResults
                results={state.results}
                selectedIndices={state.selectedIndices}
                onToggleItem={toggleItem}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                onOpenDisambiguation={openDisambiguation}
              />
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* SELECTING: Disambiguation                                      */}
        {/* ============================================================== */}
        {state.status === 'selecting' && disambiguatingItem && (
          <VisionScanDisambiguation
            item={disambiguatingItem}
            allOptions={disambiguationOptions}
            lazyImages={lazyImages}
            onSelect={selectAlternative}
            onCancel={closeDisambiguation}
          />
        )}

        {/* ============================================================== */}
        {/* IMPORTING: Progress                                            */}
        {/* ============================================================== */}
        {state.status === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">{t('statusImporting')}</p>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUCCESS: Done                                                  */}
        {/* ============================================================== */}
        {state.status === 'success' && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium">
              {isWishlist
                ? t('importSuccessWishlist', { count: state.importedCount })
                : t('importSuccess', { count: state.importedCount })}
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* Footer Actions                                                 */}
        {/* ============================================================== */}
        <DialogFooter>
          {state.status === 'review' && state.results.length > 0 && (
            <>
              <Button variant="outline" onClick={handleUploadClick}>
                {t('scanAnother')}
              </Button>
              <Button
                onClick={importSelected}
                disabled={state.selectedIndices.size === 0}
              >
                {isWishlist
                  ? t('importSelectedWishlist', {
                      count: state.selectedIndices.size,
                    })
                  : t('importSelected', {
                      count: state.selectedIndices.size,
                    })}
              </Button>
            </>
          )}

          {(state.status === 'idle' || state.status === 'error') && (
            <Button variant="outline" onClick={handleClose}>
              {t('cancel')}
            </Button>
          )}

          {state.status === 'success' && (
            <Button onClick={handleClose}>{t('done')}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
