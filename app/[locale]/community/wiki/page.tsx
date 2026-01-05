/**
 * Wiki Home Page
 *
 * Feature: Community Section Restructure
 *
 * Main wiki page with search, categories, and page listing.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WikiHomeContent } from './WikiHomeContent';

interface WikiPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function WikiPage({ searchParams }: WikiPageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <WikiHomeContent query={params.q} categoryId={params.category} />;
}
