/**
 * Admin Layout
 *
 * Feature: Admin Panel with Category Management
 * Protected layout for admin-only routes
 */

import { AdminRoute } from '@/components/auth/AdminRoute';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="container mx-auto max-w-7xl py-8">
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
      </div>
    </AdminRoute>
  );
}
