/**
 * Alert Settings Page
 * Feature: 050-price-tracking (US6)
 * Date: 2025-12-17
 */

'use client';

import { AlertPreferencesForm } from '@/components/settings/AlertPreferencesForm';
import { useAlertPreferences } from '@/hooks/price-tracking/useAlertPreferences';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

export default function AlertSettingsPage() {
  const router = useRouter();
  const { preferences, isLoading, error, updatePreferences } = useAlertPreferences();

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alert Preferences</h1>
        <p className="text-muted-foreground mt-2">
          Manage how and when you receive price tracking notifications
        </p>
      </div>

      {/* Form */}
      <AlertPreferencesForm
        preferences={preferences}
        isLoading={isLoading}
        error={error}
        onUpdate={updatePreferences}
      />
    </div>
  );
}
