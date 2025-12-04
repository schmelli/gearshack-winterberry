/**
 * Edit Gear Item Page
 *
 * Feature: 001-gear-item-editor
 * Task: T024
 * Route: /inventory/[id]/edit
 *
 * Page for editing an existing gear item.
 * For MVP, uses mock data since no backend persistence exists.
 */

'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Mock Data (MVP - no backend persistence)
// =============================================================================

// In a real app, this would be fetched from an API or database
const MOCK_GEAR_ITEMS: Record<string, GearItem> = {
  'gear-demo-1': {
    id: 'gear-demo-1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    name: 'Nemo Hornet Elite 2P',
    brand: 'Nemo Equipment',
    brandUrl: 'https://www.nemoequipment.com',
    modelNumber: 'HOR2P-2021',
    productUrl: 'https://www.nemoequipment.com/product/hornet-elite',
    categoryId: 'shelter',
    subcategoryId: 'tents',
    productTypeId: 'freestanding-tent',
    weightGrams: 850,
    weightDisplayUnit: 'oz',
    lengthCm: 213,
    widthCm: 127,
    heightCm: 98,
    pricePaid: 449.95,
    currency: 'USD',
    purchaseDate: new Date('2024-01-10'),
    retailer: 'REI',
    retailerUrl: 'https://www.rei.com',
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'active',
    notes: 'Ultralight backpacking tent for 2 people. Great ventilation.',
  },
};

// =============================================================================
// Page Component
// =============================================================================

interface EditGearItemPageProps {
  params: Promise<{ id: string }>;
}

export default function EditGearItemPage({ params }: EditGearItemPageProps) {
  const { id } = use(params);

  // In MVP, look up mock data
  const gearItem = MOCK_GEAR_ITEMS[id];

  // If item not found, show 404
  if (!gearItem) {
    notFound();
  }

  return (
    <main className="container py-8">
      <GearEditorForm
        initialItem={gearItem}
        title={`Edit: ${gearItem.name}`}
      />
    </main>
  );
}
