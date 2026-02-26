/**
 * Admin Dashboard Content (Client Component)
 *
 * Feature: Admin Section Enhancement
 *
 * Client-side component with dashboard statistics.
 */

'use client';

import { useTranslations } from 'next-intl';
import { AdminDashboard } from '@/components/admin/dashboard';

export function AdminDashboardContent() {
  const t = useTranslations('Admin.dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Dashboard */}
      <AdminDashboard />
    </div>
  );
}
