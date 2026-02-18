/**
 * New Gear Item Page
 *
 * Feature: 001-gear-item-editor
 * Task: T020
 * Route: /inventory/new
 *
 * Page for creating a new gear item.
 * Feature: 008-auth-and-profile - Protected route (requires authentication)
 * Feature: 049-wishlist-view - Supports ?mode=wishlist query parameter (T033)
 * Feature: URL-Import - Supports ?prefill=true with data from sessionStorage
 */

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getImportPrefillData } from '@/components/gear-editor/UrlImportDialog';
import type { GearItemFormData } from '@/types/gear';

function NewGearItemContent() {
  const t = useTranslations('GearEditor');
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') as 'inventory' | 'wishlist' | null;
  const hasPrefill = searchParams.get('prefill') === 'true';
  const isWishlistMode = mode === 'wishlist';

  // Load prefill data from sessionStorage (only on initial mount)
  const [prefillState] = useState(() => {
    if (!hasPrefill || typeof window === 'undefined') {
      return { data: null, loaded: true };
    }
    const data = getImportPrefillData();
    return { data, loaded: true };
  });

  const prefillData = prefillState.data;
  const prefillLoaded = prefillState.loaded;

  // Wait for prefill data to load before rendering form
  if (!prefillLoaded) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </main>
    );
  }

  // Convert prefill data to form data format
  const prefillFormData: Partial<GearItemFormData> | undefined = prefillData
    ? {
        name: prefillData.name || '',
        brand: prefillData.brand || '',
        description: prefillData.description || '',
        primaryImageUrl: prefillData.primaryImageUrl || '',
        weightValue: prefillData.weightValue || '',
        weightDisplayUnit: prefillData.weightDisplayUnit || 'g',
        pricePaid: prefillData.pricePaid || '',
        currency: prefillData.currency || 'USD',
        productUrl: prefillData.productUrl || '',
        productTypeId: prefillData.productTypeId || '',
      }
    : undefined;

  // Extract prefill metadata for contribution tracking
  const prefillMeta = prefillData
    ? {
        sourceUrl: prefillData.sourceUrl,
        catalogMatchId: prefillData.catalogMatchId,
        catalogMatchConfidence: prefillData.catalogMatchConfidence,
      }
    : undefined;

  return (
    <main className="container mx-auto px-4 py-8">
      <GearEditorForm
        title={isWishlistMode ? t('addToWishlistTitle') : t('addTitle')}
        mode={isWishlistMode ? 'wishlist' : 'inventory'}
        prefillFormData={prefillFormData}
        prefillMeta={prefillMeta}
      />
    </main>
  );
}

export default function NewGearItemPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>}>
        <NewGearItemContent />
      </Suspense>
    </ProtectedRoute>
  );
}
