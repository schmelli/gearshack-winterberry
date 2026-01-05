/**
 * Wiki Page Edit
 *
 * Feature: Community Section Restructure
 *
 * Page for editing wiki articles.
 */

import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { WikiEditContent } from './WikiEditContent';

interface WikiPageEditProps {
  params: Promise<{ slug: string }>;
}

export default async function WikiPageEditPage({ params }: WikiPageEditProps) {
  const supabase = await createClient();
  const { slug } = await params;
  const t = await getTranslations('Wiki');

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if page exists and is not locked
  const { data: page } = await supabase
    .from('wiki_pages')
    .select('id, is_locked, locked_reason')
    .eq('slug', slug)
    .single();

  if (!page) {
    notFound();
  }

  if (page.is_locked) {
    redirect(`/community/wiki/${slug}`);
  }

  return <WikiEditContent slug={slug} />;
}
