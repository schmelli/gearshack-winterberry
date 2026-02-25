/**
 * Shakedown Detail Page
 *
 * Feature: 001-community-shakedowns
 * Task: T035
 * Route: /community/shakedowns/[id]
 *
 * Displays a single shakedown with all its details and feedback.
 * Supports private shakedown access via shareToken query parameter.
 *
 * Architecture: Feature-Sliced Light
 * - Server component for metadata generation
 * - Client component for interactive content
 */

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ShakedownDetailContent } from './ShakedownDetailContent';

// =============================================================================
// Types
// =============================================================================

interface ShakedownDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

// =============================================================================
// Metadata Generation
// =============================================================================

/**
 * Generates dynamic metadata based on the shakedown's trip name.
 * Falls back to generic title if shakedown is not found or inaccessible.
 */
export async function generateMetadata({
  params,
}: ShakedownDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations('Shakedowns');
  const supabase = await createClient();

  try {
    // Fetch just the trip name for metadata
    // Using type assertion until Supabase types are regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedown } = await (supabase as any)
      .from('shakedowns')
      .select('trip_name')
      .eq('id', id)
      .single();

    if (shakedown?.trip_name) {
      return {
        title: shakedown.trip_name,
        description: t('subtitle'),
      };
    }
  } catch {
    // Fall through to default metadata
  }

  // Fallback metadata
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

// =============================================================================
// Page Component
// =============================================================================

export default async function ShakedownDetailPage({
  params,
}: ShakedownDetailPageProps) {
  const { id } = await params;

  // Validate UUID format to fail fast on invalid IDs
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    // Let the client component handle the 404 display
    // This allows for proper i18n error messages
    return <ShakedownDetailContent shakedownId={null} />;
  }

  return <ShakedownDetailContent shakedownId={id} />;
}
