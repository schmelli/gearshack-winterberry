/**
 * New Gear Item Page
 *
 * Feature: 001-gear-item-editor
 * Task: T020
 * Route: /inventory/new
 *
 * Page for creating a new gear item.
 */

import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';

export const metadata = {
  title: 'Add New Gear Item',
  description: 'Add a new item to your gear inventory',
};

export default function NewGearItemPage() {
  return (
    <main className="container py-8">
      <GearEditorForm />
    </main>
  );
}
