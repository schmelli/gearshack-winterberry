import type { Metadata } from "next";
import { Geist, Geist_Mono, Rock_Salt } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Shell } from "@/components/layout/Shell";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { Toaster } from "sonner";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rockSalt.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <SyncProvider />
            <Shell>{children}</Shell>
            <Toaster richColors position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
