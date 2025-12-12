/**
 * New Gear Item Page
 *
 * Feature: 001-gear-item-editor
 * Task: T020
 * Route: /inventory/new
 *
 * Page for creating a new gear item.
 * Feature: 008-auth-and-profile - Protected route (requires authentication)
 */

'use client';

import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function NewGearItemPage() {
  return (
    <ProtectedRoute>
      <main className="container py-8">
        <GearEditorForm />
      </main>
    </ProtectedRoute>
  );
}
