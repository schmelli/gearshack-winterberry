/**
 * Privacy Settings Page
 *
 * Feature: 046-user-messaging-system
 * Task: T040
 *
 * Page for managing messaging privacy preferences.
 */

'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PrivacySettingsForm } from '@/components/settings/PrivacySettingsForm';
import { BlockedUsersList } from '@/components/messaging/BlockedUsersList';
import { Link } from '@/i18n/navigation';

function PrivacySettingsContent() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold">Privacy Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Control who can contact you and see your activity.
      </p>

      <div className="mt-6">
        <PrivacySettingsForm />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Blocked Users</CardTitle>
          <CardDescription>
            Manage users you have blocked. Blocked users cannot message you or find you in search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BlockedUsersList />
        </CardContent>
      </Card>
    </main>
  );
}

export default function PrivacySettingsPage() {
  return (
    <ProtectedRoute>
      <PrivacySettingsContent />
    </ProtectedRoute>
  );
}
