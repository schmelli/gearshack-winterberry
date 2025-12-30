/**
 * Community Moderation Page
 *
 * Feature: 051-community-bulletin-board
 * Task: T063
 *
 * Admin page for reviewing and acting on reported bulletin content.
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ModerationPanel } from '@/components/bulletin/ModerationPanel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function ModerationPage() {
  const supabase = await createClient();
  const t = await getTranslations('bulletin');

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
    redirect('/community');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('moderation.title')}</CardTitle>
          <CardDescription>{t('moderation.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ModerationPanel />
        </CardContent>
      </Card>
    </div>
  );
}
