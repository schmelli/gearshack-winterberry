/**
 * Not Found Page for Shared Loadouts
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T054 - Friendly 404 page for invalid/expired share tokens
 *
 * Displays a user-friendly message when a share token is invalid or expired.
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PackageX, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  const t = useTranslations('SharedLoadout');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <PackageX className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{t('notFoundTitle')}</CardTitle>
          <CardDescription className="text-base">
            {t('notFoundDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground text-center">
            {t('notFoundHint')}
          </p>
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              {t('backToHome')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
