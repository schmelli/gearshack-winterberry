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
 *
 * Feature: 049-wishlist-view
 * Bug Fix (Issue #85): Also check wishlist items to allow editing wishlist gear
 */

'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import { useItems } from '@/hooks/useSupabaseStore';
import { useWishlist } from '@/hooks/useWishlist';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// =============================================================================
// Page Content Component
// =============================================================================

interface EditGearItemContentProps {
  id: string;
}

function EditGearItemContent({ id }: EditGearItemContentProps) {
  // Get items from zustand store (inventory items)
  const items = useItems();

  // Feature 049: Also get wishlist items (Issue #85 fix)
  const { wishlistItems } = useWishlist();

  // Find the item by ID - check both inventory and wishlist
  const gearItem = items.find((item) => item.id === id) ??
                   wishlistItems.find((item) => item.id === id);

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
