/**
 * Root Layout with i18n Support
 *
 * Feature: 027-i18n-next-intl, 040-supabase-migration
 * DR-004: Wrap existing providers with NextIntlClientProvider
 * FR-007: Dynamic lang attribute on html tag
 */

import { Suspense } from 'react';
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rock_Salt } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SupabaseAuthProvider } from "@/components/auth/SupabaseAuthProvider";
import { ScreenContextProvider } from "@/components/context/ScreenContextProvider";
import { Shell } from "@/components/layout/Shell";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { locales } from '@/i18n/config';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Performance: Add display: "swap" to all fonts to prevent render blocking
// This allows the browser to show fallback fonts while custom fonts load
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const rockSalt = Rock_Salt({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-rock-salt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gearshack",
  description: "Gear management for the obsessed.",
};

// Explicit viewport for proper mobile rendering
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// T018: Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    // T017: Dynamic lang attribute based on current locale (FR-007)
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rockSalt.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Feature 027: NextIntlClientProvider wraps all providers */}
        <NextIntlClientProvider messages={messages} locale={locale}>
          {/* Feature 040: Supabase auth provider replaces Firebase */}
          <ThemeProvider>
            <SupabaseAuthProvider>
              {/* AI Agent Context-Awareness: Track current screen/loadout */}
              <ScreenContextProvider>
                <Shell>
                  <Suspense fallback={
                    <div className="flex min-h-screen items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  }>
                    {children}
                  </Suspense>
                </Shell>
              </ScreenContextProvider>
              <Toaster richColors position="bottom-right" />
            </SupabaseAuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
