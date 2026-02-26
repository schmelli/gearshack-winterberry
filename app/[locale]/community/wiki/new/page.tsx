/**
 * New Wiki Page
 *
 * Feature: Community Section Restructure
 *
 * Page for creating new wiki articles.
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { WikiLayout } from '@/components/wiki';
import { WikiPageEditor } from '@/components/wiki/WikiPageEditor';

export default async function NewWikiPage() {
  const supabase = await createClient();
  const t = await getTranslations('Wiki');

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <WikiLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('createNewPage')}</h1>
          <p className="text-muted-foreground mt-1">{t('createNewPageDescription')}</p>
        </div>

        <WikiPageEditor mode="create" />
      </div>
    </WikiLayout>
  );
}
