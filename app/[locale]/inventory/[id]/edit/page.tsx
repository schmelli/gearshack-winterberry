/**
 * Edit Gear Item Page
 *
 * Feature: 001-gear-item-editor
 * Task: T024
 * Route: /inventory/[id]/edit
 *
 * Page for editing an existing gear item.
 * Uses zustand store for data persistence.
 *
 * Bug Fix: Functional Fixes Sprint
 * Fixed 404 error by reading items from zustand store instead of hardcoded mock data.
 */

'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import { useItems } from '@/hooks/useSupabaseStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// =============================================================================
// Page Content Component
// =============================================================================

interface EditGearItemContentProps {
  id: string;
}

function EditGearItemContent({ id }: EditGearItemContentProps) {
  // Get items from zustand store
  const items = useItems();

  // Find the item by ID
  const gearItem = items.find((item) => item.id === id);

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

// =============================================================================
// Page Component
// =============================================================================

interface EditGearItemPageProps {
  params: Promise<{ id: string }>;
}

export default function EditGearItemPage({ params }: EditGearItemPageProps) {
  const { id } = use(params);

  return (
    <ProtectedRoute>
      <EditGearItemContent id={id} />
    </ProtectedRoute>
  );
}
