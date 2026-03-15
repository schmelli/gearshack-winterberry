/**
 * Shell Component
 *
 * Feature: 023-login-layout-repair
 * DR-001: Conditional layout wrapper using usePathname()
 *
 * Conditionally renders SiteHeader/SiteFooter based on route.
 * Auth routes (/login, /register) display only children for immersive experience.
 */

'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { AppLayoutWithAIPanel } from '@/components/layout/AppLayoutWithAIPanel';

// =============================================================================
// Constants
// =============================================================================

/** Route patterns that should not show header/footer (immersive experience) */
const AUTH_ROUTE_PATTERNS = ['/login', '/register', '/coming-soon'];

/** Routes that should show footer but no header (landing page) */
const LANDING_ROUTES = ['/', '/en', '/de'];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if pathname matches an auth route pattern (handles i18n prefixes)
 * Matches: /login, /en/login, /de/login, etc.
 */
function isAuthRoutePath(pathname: string): boolean {
  return AUTH_ROUTE_PATTERNS.some(
    (route) => pathname === route || pathname.endsWith(route)
  );
}

// =============================================================================
// Component
// =============================================================================

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const isAuthRoute = isAuthRoutePath(pathname);
  const isLandingRoute = LANDING_ROUTES.includes(pathname);

  // Auth routes: render only children (no header/footer)
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Landing page: render children with footer but no header
  if (isLandingRoute) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    );
  }

  // All other routes: render full layout with header, AI panel, and footer
  // Note: Each page manages its own container/max-width to avoid double-nesting
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <AppLayoutWithAIPanel>
        <main className="flex-1">
          <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 xl:px-8 overflow-x-hidden">
            {children}
          </div>
        </main>
      </AppLayoutWithAIPanel>
      <SiteFooter />
    </div>
  );
}
