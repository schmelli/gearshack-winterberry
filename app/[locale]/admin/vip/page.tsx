/**
 * VIP Admin Management Page
 *
 * Feature: 052-vip-loadouts
 * Task: T033
 *
 * Admin dashboard for managing VIP accounts and loadouts.
 * Requires admin role authentication.
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { VipAdminDashboard } from '@/components/admin/vip/VipAdminDashboard';

// =============================================================================
// Page Component
// =============================================================================

export default async function VipAdminPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  return <VipAdminDashboard />;
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata() {
  const t = await getTranslations('vip');

  return {
    title: t('admin.title'),
  };
}
