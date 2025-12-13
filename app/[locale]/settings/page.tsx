/**
 * Settings Page
 *
 * Feature: 004-nature-vibe-polish
 * Provides user preferences including theme appearance settings.
 *
 * Feature: 008-auth-and-profile
 * T047: Protected route - requires authentication
 */

'use client';

import { ChevronRight, Shield } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Link } from '@/i18n/navigation';

function SettingsContent() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your account settings and preferences.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how Gearshack looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
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
                  <CardTitle className="text-base">Privacy</CardTitle>
                  <CardDescription>
                    Control who can contact you and see your activity
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
