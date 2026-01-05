/**
 * Settings Page
 *
 * Feature: 004-nature-vibe-polish
 * Provides user preferences including theme appearance settings.
 *
 * Feature: 008-auth-and-profile
 * T047: Protected route - requires authentication
 *
 * Feature: 012-automatic-unit-conversion
 * T048: Weight unit preference setting
 */

'use client';

import { ChevronRight, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { WeightUnit } from '@/types/gear';

function SettingsContent() {
  const t = useTranslations('Settings');
  const { user } = useAuth();
  const { preferredWeightUnit, setPreferredWeightUnit } = useUserPreferences(user?.id ?? null);

  const handleWeightUnitChange = async (unit: string) => {
    await setPreferredWeightUnit(unit as WeightUnit);
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-muted-foreground">
        {t('description')}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('appearance.title')}</CardTitle>
          <CardDescription>
            {t('appearance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('units.title')}</CardTitle>
          <CardDescription>
            {t('units.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label htmlFor="weight-unit" className="text-sm font-medium">
              {t('units.weightUnitLabel')}
            </label>
            <Select
              value={preferredWeightUnit}
              onValueChange={handleWeightUnitChange}
            >
              <SelectTrigger id="weight-unit" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">{t('units.grams')}</SelectItem>
                <SelectItem value="oz">{t('units.ounces')}</SelectItem>
                <SelectItem value="lb">{t('units.pounds')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Link href="/settings/privacy">
        <Card className="mt-4 cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t('privacy.title')}</CardTitle>
                  <CardDescription>
                    {t('privacy.description')}
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>
      </Link>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
