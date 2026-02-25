/**
 * Wiki Page View
 *
 * Feature: Community Section Restructure
 *
 * Displays a single wiki page.
 */

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WikiPageViewContent } from './WikiPageViewContent';

interface WikiPageViewProps {
  params: Promise<{ slug: string }>;
}

export default async function WikiPageViewPage({ params }: WikiPageViewProps) {
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
    .select('id')
    .eq('slug', slug)
    .single();

  if (!page) {
    notFound();
  }

  return <WikiPageViewContent slug={slug} />;
}
