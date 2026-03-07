/**
 * Wiki Layout Component
 *
 * Feature: Community Section Restructure
 *
 * Main layout wrapper for wiki pages with sidebar.
 */

'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { WikiSidebar } from './WikiSidebar';

interface WikiLayoutProps {
  children: React.ReactNode;
}

export function WikiLayout({ children }: WikiLayoutProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Mobile sidebar trigger */}
      <div className="lg:hidden mb-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="h-4 w-4 mr-2" />
              Wiki
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-4">
            <SheetTitle className="sr-only">Wiki Navigation</SheetTitle>
            <WikiSidebar />
          </SheetContent>
        </Sheet>
      </div>

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
