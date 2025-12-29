/**
 * New Offer Page
 *
 * Feature: 053-merchant-integration
 * Task: T053
 *
 * Redirects to insights page for offer creation workflow.
 * The offer creation flow starts from selecting wishlist insights.
 */

import { redirect } from 'next/navigation';

interface NewOfferPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewOfferPage({ params }: NewOfferPageProps) {
  const { locale } = await params;

  // Redirect to insights page since offer creation starts there
  redirect(`/${locale}/merchant/insights`);
}
