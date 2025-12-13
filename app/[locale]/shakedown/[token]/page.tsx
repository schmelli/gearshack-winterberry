/**
 * Virtual Gear Shakedown Page
 *
 * Public view for shared loadouts with realtime comments.
 */

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VirtualGearShakedown } from '@/components/loadouts/VirtualGearShakedown';
import type { SharedLoadoutPayload } from '@/types/sharing';

interface ShakedownPageProps {
  params: Promise<{ token: string }>;
}

export default async function ShakedownPage({ params }: ShakedownPageProps) {
  const { token } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('loadout_shares')
    .select('payload, allow_comments, created_at')
    .eq('share_token', token)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <VirtualGearShakedown
      shareToken={token}
      payload={data.payload as unknown as SharedLoadoutPayload}
      allowComments={data.allow_comments}
      createdAt={data.created_at}
    />
  );
}
