/**
 * Root Layout with i18n Support
 *
 * Feature: 027-i18n-next-intl
 * DR-004: Wrap existing providers with NextIntlClientProvider
 * FR-007: Dynamic lang attribute on html tag
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono, Rock_Salt } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Shell } from "@/components/layout/Shell";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { locales } from '@/i18n/config';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      >
        {/* Feature 027: NextIntlClientProvider wraps all providers */}
        <NextIntlClientProvider messages={messages} locale={locale}>
          {/* T019: Existing providers preserved in same order */}
          <ThemeProvider>
            <AuthProvider>
              <SyncProvider />
              <Shell>{children}</Shell>
              <Toaster richColors position="bottom-right" />
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
