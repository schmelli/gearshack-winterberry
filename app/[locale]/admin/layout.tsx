/**
 * Admin Layout
 *
 * Feature: Admin Panel with Category Management
 * Protected layout for admin-only routes
 */

import { AdminRoute } from '@/components/auth/AdminRoute';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';
import { PageContainer } from '@/components/layout/PageContainer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <PageContainer className="max-w-7xl">
        {/* Mobile: Show only the main content + floating nav button */}
        <div className="md:hidden">
          <AdminMobileNav />
          <main>{children}</main>
        </div>

        {/* Desktop: Show sidebar + content in grid */}
        <div className="hidden md:grid md:grid-cols-[250px_1fr] md:gap-6">
          <AdminNav />
          <main>{children}</main>
        </div>
      </PageContainer>
    </AdminRoute>
  );
}
