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
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function NewGearItemContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') as 'inventory' | 'wishlist' | null;
  const isWishlistMode = mode === 'wishlist';

  return (
    <main className="container py-8">
      <GearEditorForm
        title={isWishlistMode ? 'Add to Wishlist' : 'Add New Gear Item'}
        mode={isWishlistMode ? 'wishlist' : 'inventory'}
      />
    </main>
  );
}

export default function NewGearItemPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="container py-8"><div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>}>
        <NewGearItemContent />
      </Suspense>
    </ProtectedRoute>
  );
}
