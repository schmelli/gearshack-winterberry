/**
 * useLighterpackImport
 *
 * Client hook for previewing and finalizing Lighterpack imports.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  LighterpackFinalizeItemInput,
  LighterpackFinalizeSummary,
  LighterpackPreviewData,
  LighterpackResolutionType,
} from '@/types/lighterpack-import';
import {
  lighterpackFinalizeApiResponseSchema,
  lighterpackPreviewApiResponseSchema,
} from '@/lib/validations/lighterpack-schema';

export type LighterpackImportStatus =
  | 'idle'
  | 'previewing'
  | 'preview'
  | 'finalizing'
  | 'success'
  | 'error';

interface UseLighterpackImportReturn {
  status: LighterpackImportStatus;
  previewData: LighterpackPreviewData | null;
  previewItems: LighterpackFinalizeItemInput[];
  finalizeSummary: LighterpackFinalizeSummary | null;
  error: string | null;
  requestPreview: (url: string) => Promise<boolean>;
  setItemResolution: (index: number, resolution: LighterpackResolutionType) => void;
  setItemInventorySelection: (index: number, inventoryItemId: string | null) => void;
  finalizeImport: (loadoutName?: string) => Promise<boolean>;
  reset: () => void;
}

function extractApiError<T extends { success: false; error: string }>(
  parsed: { success: true; data: unknown } | T,
  fallback: string,
): string {
  if (!parsed.success) return parsed.error;
  return fallback;
}

export function useLighterpackImport(): UseLighterpackImportReturn {
  const [status, setStatus] = useState<LighterpackImportStatus>('idle');
  const [previewData, setPreviewData] = useState<LighterpackPreviewData | null>(null);
  const [previewItems, setPreviewItems] = useState<LighterpackFinalizeItemInput[]>([]);
  const [finalizeSummary, setFinalizeSummary] = useState<LighterpackFinalizeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestPreview = useCallback(async (url: string) => {
    setStatus('previewing');
    setError(null);
    setFinalizeSummary(null);

    try {
      const response = await fetch('/api/loadouts/import-lighterpack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', url }),
      });

      const parsed = lighterpackPreviewApiResponseSchema.safeParse(await response.json());

      if (!parsed.success || !response.ok) {
        setStatus('error');
        setPreviewData(null);
        setPreviewItems([]);
        setError(parsed.success
          ? extractApiError(parsed.data, 'Failed to preview import.')
          : 'Unexpected response from server.'
        );
        return false;
      }

      const payload = parsed.data;

      if (!payload.success) {
        setStatus('error');
        setPreviewData(null);
        setPreviewItems([]);
        setError(payload.error);
        return false;
      }

      const itemsWithSelections: LighterpackFinalizeItemInput[] = payload.data.items.map((item) => ({
        ...item,
        selectedResolution: item.suggestedResolution,
        selectedInventoryItemId: item.inventoryCandidates[0]?.inventoryItemId ?? null,
      }));

      setPreviewData(payload.data);
      setPreviewItems(itemsWithSelections);
      setStatus('preview');
      return true;
    } catch (err) {
      setStatus('error');
      setPreviewData(null);
      setPreviewItems([]);
      setError(err instanceof Error ? err.message : 'Preview failed.');
      return false;
    }
  }, []);

  const setItemResolution = useCallback((index: number, resolution: LighterpackResolutionType) => {
    setPreviewItems((current) =>
      current.map((item) => {
        if (item.index !== index) return item;
        const nextInventorySelection = resolution === 'link_inventory'
          ? (item.selectedInventoryItemId ?? item.inventoryCandidates[0]?.inventoryItemId ?? null)
          : item.selectedInventoryItemId ?? null;
        return {
          ...item,
          selectedResolution: resolution,
          selectedInventoryItemId: nextInventorySelection,
        };
      })
    );
  }, []);

  const setItemInventorySelection = useCallback((index: number, inventoryItemId: string | null) => {
    setPreviewItems((current) =>
      current.map((item) =>
        item.index === index
          ? { ...item, selectedInventoryItemId: inventoryItemId }
          : item
      )
    );
  }, []);

  const finalizeImport = useCallback(async (loadoutName?: string) => {
    if (!previewData) {
      setError('No preview data available.');
      setStatus('error');
      return false;
    }

    setStatus('finalizing');
    setError(null);

    try {
      const response = await fetch('/api/loadouts/import-lighterpack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'finalize',
          sourceUrl: previewData.sourceUrl,
          listName: previewData.listName,
          loadoutName,
          items: previewItems,
        }),
      });

      const parsed = lighterpackFinalizeApiResponseSchema.safeParse(await response.json());

      if (!parsed.success || !response.ok) {
        setStatus('error');
        setError(parsed.success
          ? extractApiError(parsed.data, 'Import failed.')
          : 'Unexpected response from server.'
        );
        return false;
      }

      const payload = parsed.data;

      if (!payload.success) {
        setStatus('error');
        setError(payload.error);
        return false;
      }

      setFinalizeSummary(payload.data);
      setStatus('success');
      return true;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Import failed.');
      return false;
    }
  }, [previewData, previewItems]);

  const reset = useCallback(() => {
    setStatus('idle');
    setPreviewData(null);
    setPreviewItems([]);
    setFinalizeSummary(null);
    setError(null);
  }, []);

  // Keep state updates stable for consumers.
  return useMemo(() => ({
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
  }), [
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
  ]);
}

