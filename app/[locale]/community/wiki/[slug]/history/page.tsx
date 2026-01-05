/**
 * Wiki Page History
 *
 * Feature: Community Section Restructure
 *
 * Page for viewing revision history.
 */

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WikiHistoryContent } from './WikiHistoryContent';

interface WikiPageHistoryProps {
  params: Promise<{ slug: string }>;
}

export default async function WikiPageHistoryPage({ params }: WikiPageHistoryProps) {
  const supabase = await createClient();
  const { slug } = await params;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if page exists
  const { data: page } = await supabase
    .from('wiki_pages')
    .select('id, title_en, title_de')
    .eq('slug', slug)
    .single();

  if (!page) {
    notFound();
  }

  return (
    <WikiHistoryContent
      slug={slug}
      pageId={page.id}
      titleEn={page.title_en}
      titleDe={page.title_de}
    />
  );
}
