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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

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
