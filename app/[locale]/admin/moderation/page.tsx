/**
 * Community Moderation Page
 *
 * Feature: 051-community-bulletin-board
 * Task: T063
 *
 * Admin page for reviewing and acting on reported bulletin content.
 */

import { useTranslations } from 'next-intl';
import { ModerationPanel } from '@/components/bulletin/ModerationPanel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ModerationPage() {
  const t = useTranslations('bulletin');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('moderation.title')}</CardTitle>
          <CardDescription>{t('moderation.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ModerationPanel />
        </CardContent>
      </Card>
    </div>
  );
}
