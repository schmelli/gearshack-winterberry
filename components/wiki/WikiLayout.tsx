/**
 * Wiki Layout Component
 *
 * Feature: Community Section Restructure
 *
 * Main layout wrapper for wiki pages with sidebar.
 */

'use client';

import { WikiSidebar } from './WikiSidebar';

interface WikiLayoutProps {
  children: React.ReactNode;
}

export function WikiLayout({ children }: WikiLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          <WikiSidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
