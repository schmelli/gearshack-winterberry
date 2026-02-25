'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, ClipboardCheck } from 'lucide-react';
import { GardenerChatClient } from './GardenerChatClient';
import { ReviewQueue } from '@/components/admin/gardener';

/**
 * GardenerTabs component
 * Provides a tabbed interface for the Gardener section with Chat and Review tabs
 */
export function GardenerTabs() {
  const t = useTranslations('Admin.gardener');

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <Tabs defaultValue="chat" className="flex flex-1 flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {t('tabs.chat')}
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            {t('tabs.review')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 mt-4 min-h-0 overflow-hidden">
          <GardenerChatClient />
        </TabsContent>

        <TabsContent value="review" className="flex-1 mt-4 overflow-auto">
          <ReviewQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}
