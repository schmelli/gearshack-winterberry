/**
 * Admin Layout
 *
 * Feature: Admin Panel with Category Management
 * Protected layout for admin-only routes
 */

import { AdminRoute } from '@/components/auth/AdminRoute';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="container mx-auto max-w-7xl py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_1fr]">
          <AdminNav />
          <main>{children}</main>
        </div>
      </div>
    </AdminRoute>
  );
}
