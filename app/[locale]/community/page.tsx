/**
 * Community Bulletin Board Page
 *
 * Feature: 051-community-bulletin-board
 * Task: T031
 *
 * Main bulletin board page with authentication requirement.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BulletinBoard } from '@/components/bulletin/BulletinBoard';

export default async function CommunityPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <BulletinBoard />
    </div>
  );
}
