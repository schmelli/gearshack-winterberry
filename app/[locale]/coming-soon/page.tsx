/**
 * Coming Soon / Pre-Announcement Landing Page
 *
 * Static pre-launch page with newsletter signup.
 * Can be activated as the default landing page via COMING_SOON_ENABLED env var.
 */

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ComingSoonPage } from '@/components/landing/ComingSoonPage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale = 'en' } = await params;
  const t = await getTranslations({ locale, namespace: 'ComingSoon' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      type: 'website',
      siteName: 'Gearshack',
    },
  };
}

export default function ComingSoon() {
  return <ComingSoonPage />;
}
