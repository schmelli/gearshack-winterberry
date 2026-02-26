/**
 * Privacy Settings Page
 *
 * Feature: 046-user-messaging-system, 001-social-graph
 * Tasks: T040, T051
 *
 * Page for managing messaging and social privacy preferences.
 * Includes preset cards for quick privacy levels and granular controls.
 */

'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PrivacySettingsForm } from '@/components/settings/PrivacySettingsForm';
import { PrivacySettingsPanel } from '@/components/social/PrivacySettingsPanel';
import { BlockedUsersList } from '@/components/messaging/BlockedUsersList';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

function PrivacySettingsContent() {
  const t = useTranslations('Social');

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.backToSettings')}
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold">{t('privacy.title')}</h1>
      <p className="mt-1 text-muted-foreground">
        {t('privacy.description')}
      </p>

      <Tabs defaultValue="social" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="social">{t('privacy.tabs.social')}</TabsTrigger>
          <TabsTrigger value="messaging">{t('privacy.tabs.messaging')}</TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="mt-4">
          <PrivacySettingsPanel />
        </TabsContent>

        <TabsContent value="messaging" className="mt-4 space-y-6">
          <PrivacySettingsForm />

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy.blocked.title')}</CardTitle>
              <CardDescription>
                {t('privacy.blocked.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BlockedUsersList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
