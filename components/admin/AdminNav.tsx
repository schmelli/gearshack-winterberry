/**
 * AdminNav Component
 *
 * Feature: Admin Panel with Category Management
 * Navigation sidebar for admin panel
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderTree,
  Users,
  MessageSquare,
  Settings,
  ArrowLeft,
  Shield,
  UsersRound,
  ImageIcon,
  Bell,
  BookOpen,
  Bot,
  Network,
  Activity,
  Upload,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Regular nav items (flat list)
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  { href: '/admin/vip', label: 'VIPs', icon: UsersRound },
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/wiki', label: 'Wiki', icon: BookOpen },
  { href: '/admin/prompts', label: 'Prompts', icon: MessageSquare, disabled: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, disabled: true },
];

// GearGraph section with sub-items
const gearGraphItems = [
  { href: '/admin/geargraph/status', label: 'Status', icon: Activity },
  { href: '/admin/geargraph/gardener', label: 'Gardener', icon: Bot },
  { href: '/admin/geargraph/ingestion', label: 'Ingestion', icon: Upload },
];

export function AdminNav() {
  const pathname = usePathname();
  // Auto-expand GearGraph section if we're on a GearGraph page
  const isGearGraphActive = pathname.includes('/admin/geargraph');
  const [gearGraphOpen, setGearGraphOpen] = useState(isGearGraphActive);

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader>
        <CardTitle>Admin Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.disabled ? '#' : item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : item.disabled
                    ? 'text-muted-foreground cursor-not-allowed opacity-50'
                    : 'hover:bg-muted'
                )}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* GearGraph Section */}
          <Collapsible open={gearGraphOpen} onOpenChange={setGearGraphOpen}>
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted',
                isGearGraphActive && 'bg-muted'
              )}
            >
              <span className="flex items-center gap-3">
                <Network className="h-4 w-4" />
                GearGraph
              </span>
              {gearGraphOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4">
              <div className="flex flex-col gap-1 border-l border-border py-1 pl-3">
                {gearGraphItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </nav>

        <Separator />

        <Link href="/inventory">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to App
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
