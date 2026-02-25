/**
 * Wiki Management Content (Client Component)
 *
 * Feature: Admin Section Enhancement
 *
 * Client-side component with tabs for analytics and article generation.
 */

'use client';

import { useTranslations } from 'next-intl';
import { BarChart3, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWikiAdmin } from '@/hooks/admin/useWikiAdmin';
import { WikiAnalyticsDashboard, WikiGeneratorForm } from '@/components/admin/wiki';

export function WikiManagementContent() {
  const t = useTranslations('Admin.wiki');
  const { stats, isLoading, error, refetch } = useWikiAdmin();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('tabs.analytics')}
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t('tabs.generate')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <WikiAnalyticsDashboard
            stats={stats}
            isLoading={isLoading}
            error={error}
          />
        </TabsContent>

        <TabsContent value="generate">
          <WikiGeneratorForm
            onArticleCreated={(_slug) => {
              // Refetch stats after new article created
              refetch();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
