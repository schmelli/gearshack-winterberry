/**
 * LighterpackImportDialog
 *
 * Dialog flow:
 * 1) Enter Lighterpack URL
 * 2) Preview parsing + match summary
 * 3) Manual correction and finalize
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Loader2, Link2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useLighterpackImport } from '@/hooks/useLighterpackImport';
import type { LighterpackFinalizeSummary, LighterpackResolutionType } from '@/types/lighterpack-import';
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface LighterpackImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (summary: LighterpackFinalizeSummary) => void;
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

function getResolutionLabel(
  t: Translator,
  resolution: LighterpackResolutionType
): string {
  switch (resolution) {
    case 'link_inventory':
      return t('import.resolutions.linkInventory');
    case 'create_from_geargraph':
      return t('import.resolutions.createGearGraph');
    case 'create_temporary':
      return t('import.resolutions.createTemporary');
    case 'unresolved':
    default:
      return t('import.resolutions.unresolved');
  }
}

export function LighterpackImportDialog({
  open,
  onOpenChange,
  onImported,
}: LighterpackImportDialogProps) {
  const t = useTranslations('Loadouts');
  const [url, setUrl] = useState('');
  const [loadoutName, setLoadoutName] = useState('');

  const {
    status,
    previewData,
    previewItems,
    finalizeSummary,
    error,
    requestPreview,
    setItemResolution,
    setItemInventorySelection,
    finalizeImport,
    reset,
  } = useLighterpackImport();

  const defaultLoadoutName = previewData
    ? `${previewData.listName} (${t('import.importedSuffix')})`
    : '';

  const selectionSummary = useMemo(() => {
    const counts = {
      link_inventory: 0,
      create_from_geargraph: 0,
      create_temporary: 0,
      unresolved: 0,
    } as Record<LighterpackResolutionType, number>;

    for (const item of previewItems) {
      counts[item.selectedResolution ?? item.suggestedResolution] += 1;
    }

    return counts;
  }, [previewItems]);

  const handleClose = () => {
    reset();
    setUrl('');
    setLoadoutName('');
    onOpenChange(false);
  };

  const handlePreview = async () => {
    if (!url.trim()) return;
    await requestPreview(url.trim());
  };

  const handleFinalize = async () => {
    const finalName = (loadoutName || defaultLoadoutName).trim();
    await finalizeImport(finalName || undefined);
  };

  useEffect(() => {
    if (status === 'success' && finalizeSummary) {
      onImported?.(finalizeSummary);
    }
  }, [status, finalizeSummary, onImported]);

  const showInput = status === 'idle' || status === 'error';
  const showPreview = status === 'preview';
  const isLoading = status === 'previewing' || status === 'finalizing';
  const showSuccess = status === 'success' && finalizeSummary;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('import.title')}
          </DialogTitle>
          <DialogDescription>{t('import.description')}</DialogDescription>
        </DialogHeader>

        {showInput && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lighterpack-url">{t('import.urlLabel')}</Label>
              <Input
                id="lighterpack-url"
                type="url"
                placeholder="https://lighterpack.com/r/gaev6f"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handlePreview();
                  }
                }}
              />
            </div>

            {status === 'error' && error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('import.cancel')}
              </Button>
              <Button onClick={handlePreview} disabled={!url.trim()}>
                {t('import.previewButton')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {status === 'previewing' ? t('import.loadingPreview') : t('import.loadingFinalize')}
            </p>
          </div>
        )}

        {showPreview && previewData && (
          <div className="space-y-5">
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t('import.previewListName')}</p>
                  <p className="font-medium">{previewData.listName}</p>
                </div>
                <Badge variant="secondary">
                  {previewData.items.length} {t('import.items')}
                </Badge>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">{t('import.summary.inventory')}</p>
                  <p className="text-lg font-semibold">{selectionSummary.link_inventory}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">{t('import.summary.geargraph')}</p>
                  <p className="text-lg font-semibold">{selectionSummary.create_from_geargraph}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">{t('import.summary.temporary')}</p>
                  <p className="text-lg font-semibold">{selectionSummary.create_temporary}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">{t('import.summary.unresolved')}</p>
                  <p className="text-lg font-semibold">{selectionSummary.unresolved}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-loadout-name">{t('import.loadoutNameLabel')}</Label>
                <Input
                  id="import-loadout-name"
                  value={loadoutName || defaultLoadoutName}
                  onChange={(event) => setLoadoutName(event.target.value)}
                />
              </div>
            </Card>

            <div className="space-y-3">
              {previewItems.map((item) => {
                const selectedResolution = item.selectedResolution ?? item.suggestedResolution;
                const canLinkInventory = item.inventoryCandidates.length > 0;
                const canCreateFromGearGraph = !!item.gearGraphMatch;
                const canCreateTemporary = !!item.externalResearch;

                return (
                  <Card key={item.index} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {item.parsedItem.imageUrl ? (
                          <Image
                            src={item.parsedItem.imageUrl}
                            alt={item.parsedItem.name}
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-md border object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-md border bg-muted">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                        <p className="font-medium">{item.parsedItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.parsedItem.category || t('import.noCategory')}
                          {' • '}
                          {item.parsedItem.weightGrams != null
                            ? `${item.parsedItem.weightGrams} g`
                            : t('import.noWeight')}
                          {' • '}
                          {t('import.qtyLabel', { qty: item.parsedItem.quantity })}
                        </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {t('import.suggested')}: {getResolutionLabel(t, item.suggestedResolution)}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('import.actionLabel')}</Label>
                        <select
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          value={selectedResolution}
                          onChange={(event) => {
                            setItemResolution(
                              item.index,
                              event.target.value as LighterpackResolutionType
                            );
                          }}
                        >
                          {canLinkInventory && (
                            <option value="link_inventory">{t('import.resolutions.linkInventory')}</option>
                          )}
                          {canCreateFromGearGraph && (
                            <option value="create_from_geargraph">{t('import.resolutions.createGearGraph')}</option>
                          )}
                          {canCreateTemporary && (
                            <option value="create_temporary">{t('import.resolutions.createTemporary')}</option>
                          )}
                          <option value="unresolved">{t('import.resolutions.unresolved')}</option>
                        </select>
                      </div>

                      {selectedResolution === 'link_inventory' && canLinkInventory && (
                        <div className="space-y-1">
                          <Label className="text-xs">{t('import.inventoryCandidateLabel')}</Label>
                          <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            value={item.selectedInventoryItemId ?? item.inventoryCandidates[0]?.inventoryItemId ?? ''}
                            onChange={(event) =>
                              setItemInventorySelection(item.index, event.target.value || null)
                            }
                          >
                            {item.inventoryCandidates.map((candidate) => (
                              <option key={candidate.inventoryItemId} value={candidate.inventoryItemId}>
                                {candidate.name} ({Math.round(candidate.score * 100)}%)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {item.parsedItem.notes && (
                      <p className="text-xs text-muted-foreground">{item.parsedItem.notes}</p>
                    )}

                    {item.warnings.length > 0 && (
                      <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        {item.warnings.map((warning, idx) => (
                          <p key={`${item.index}-warning-${idx}`}>• {warning}</p>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('import.cancel')}
              </Button>
              <Button onClick={handleFinalize}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('import.finalizeButton')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {showSuccess && finalizeSummary && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{t('import.successTitle')}</p>
                <p className="text-sm">{t('import.successDescription', { name: finalizeSummary.loadoutName })}</p>
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-md bg-muted p-2">
                <p className="text-muted-foreground">{t('import.summary.inventory')}</p>
                <p className="text-lg font-semibold">{finalizeSummary.matchedInventory}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="text-muted-foreground">{t('import.summary.geargraph')}</p>
                <p className="text-lg font-semibold">{finalizeSummary.matchedGearGraph}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="text-muted-foreground">{t('import.summary.wishlist')}</p>
                <p className="text-lg font-semibold">{finalizeSummary.addedToWishlist}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="text-muted-foreground">{t('import.summary.unresolved')}</p>
                <p className="text-lg font-semibold">{finalizeSummary.unresolved}</p>
              </div>
            </div>

            {finalizeSummary.warnings.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3 text-xs text-muted-foreground">
                {finalizeSummary.warnings.map((warning, idx) => (
                  <p key={`final-warning-${idx}`}>• {warning}</p>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>{t('import.done')}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
