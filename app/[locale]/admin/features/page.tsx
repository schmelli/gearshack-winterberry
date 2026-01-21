/**
 * Feature Activation Admin Page
 *
 * Feature: Admin Feature Activation
 *
 * Admin page for managing feature flags, enabling/disabling features
 * globally or restricting access to specific user groups.
 */

'use client';

import { useTranslations } from 'next-intl';
import { FeatureActivation } from '@/components/admin/FeatureActivation';

export default function FeaturesPage() {
  const t = useTranslations('Admin.features');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      {/* Feature Activation Card */}
      <FeatureActivation />
    </div>
  );
}
