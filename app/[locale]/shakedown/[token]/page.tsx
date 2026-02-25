/**
 * Virtual Gear Shakedown Page
 *
 * Public view for shared loadouts with realtime comments.
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T015, T032, T033 - Server-side auth detection for dual-mode rendering
 *
 * Renders SharedLoadoutAppView for authenticated users (within app shell),
 * or VirtualGearShakedown for anonymous users (standalone hero layout).
 */

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VirtualGearShakedown } from '@/components/loadouts/VirtualGearShakedown';
import { SharedLoadoutAppView } from '@/components/shakedown/SharedLoadoutAppView';
import { getSharedLoadoutWithOwner } from '@/lib/supabase/queries/sharing';

interface ShakedownPageProps {
  params: Promise<{ token: string }>;
}

export default async function ShakedownPage({ params }: ShakedownPageProps) {
  const { token } = await params;

  const supabase = await createClient();

  // Detect authentication status (Feature 048, Task T015)
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const userId = user?.id ?? null;

  // Fetch shared loadout data with owner profile (Feature 048, Task T032)
  const loadoutData = await getSharedLoadoutWithOwner(supabase, token);

  if (!loadoutData) {
    notFound();
  }

  // Authenticated users see the in-app view with standard navigation (T032, T033)
  if (isAuthenticated && userId) {
    return (
      <SharedLoadoutAppView
        payload={loadoutData.payload}
        allowComments={loadoutData.allowComments}
        shareToken={token}
        owner={loadoutData.owner}
        userId={userId}
      />
    );
  }

  // Anonymous users see the standalone hero layout
  return (
    <VirtualGearShakedown
      shareToken={token}
      payload={loadoutData.payload}
      allowComments={loadoutData.allowComments}
      createdAt={loadoutData.createdAt}
      isAuthenticated={isAuthenticated}
      userId={userId}
      owner={loadoutData.owner}
    />
  );
}
