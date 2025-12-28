/**
 * OnlineStatusControl Component
 *
 * Feature: 001-social-graph
 * Task: T047
 *
 * Quick status control for profile dropdowns and headers.
 * Allows users to quickly set their online status.
 *
 * Variants:
 * - 'dropdown': For use in dropdown menus (inline)
 * - 'card': Standalone card with more info
 */

'use client';

import { useState } from 'react';
import { Circle, Moon, EyeOff, Power, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOnlineStatus, getStatusInfo } from '@/hooks/social/useOnlineStatus';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { OnlineStatus } from '@/types/social';

// =============================================================================
// Types
// =============================================================================

interface OnlineStatusControlProps {
  /** Display variant */
  variant?: 'dropdown' | 'card';
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Status Options
// =============================================================================

const STATUS_OPTIONS: {
  value: OnlineStatus;
  icon: typeof Circle;
  colorClass: string;
}[] = [
  { value: 'online', icon: Circle, colorClass: 'text-green-500' },
  { value: 'away', icon: Moon, colorClass: 'text-yellow-500' },
  { value: 'invisible', icon: EyeOff, colorClass: 'text-gray-400' },
  { value: 'offline', icon: Power, colorClass: 'text-gray-400' },
];

// =============================================================================
// Dropdown Variant (for use in menus)
// =============================================================================

function DropdownStatusControl({ className }: { className?: string }) {
  const t = useTranslations('Social');
  const { status, setStatus } = useOnlineStatus();
  const [isChanging, setIsChanging] = useState(false);
  const currentInfo = getStatusInfo(status);

  const handleStatusChange = async (newStatus: OnlineStatus) => {
    if (newStatus === status) return;

    setIsChanging(true);
    try {
      await setStatus(newStatus);
      toast.success(t(`presence.${newStatus}`));
    } catch (err) {
      console.error('Error changing status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2 justify-start', className)}
          disabled={isChanging}
        >
          {isChanging ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className={cn('h-2 w-2 rounded-full', currentInfo.dotClass)} />
          )}
          <span>{t(`presence.${status}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t('presence.online')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUS_OPTIONS.map(({ value, icon: Icon, colorClass }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleStatusChange(value)}
            className="gap-2"
          >
            <Icon className={cn('h-4 w-4', colorClass)} />
            <span className="flex-1">{t(`presence.${value}`)}</span>
            {status === value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Card Variant (for standalone display)
// =============================================================================

function CardStatusControl({ className }: { className?: string }) {
  const t = useTranslations('Social');
  const { status, setStatus } = useOnlineStatus();
  const [isChanging, setIsChanging] = useState(false);

  const handleStatusChange = async (newStatus: OnlineStatus) => {
    if (newStatus === status) return;

    setIsChanging(true);
    try {
      await setStatus(newStatus);
      toast.success(t(`presence.${newStatus}`));
    } catch (err) {
      console.error('Error changing status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your Status</CardTitle>
        <CardDescription>
          Set how you appear to other users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map(({ value, icon: Icon, colorClass }) => {
            const isActive = status === value;
            return (
              <Button
                key={value}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(value)}
                disabled={isChanging}
                className={cn(
                  'gap-2 justify-start',
                  isActive && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                {isChanging && isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className={cn('h-4 w-4', !isActive && colorClass)} />
                )}
                <span>{t(`presence.${value}`)}</span>
              </Button>
            );
          })}
        </div>

        {/* Status descriptions */}
        <div className="mt-4 text-xs text-muted-foreground">
          {status === 'online' && 'You appear online to everyone.'}
          {status === 'away' && 'You appear as away. Auto-set after 5 min inactivity.'}
          {status === 'invisible' && 'You appear offline but can still use the app.'}
          {status === 'offline' && 'You appear offline to everyone.'}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OnlineStatusControl({
  variant = 'dropdown',
  className,
}: OnlineStatusControlProps) {
  if (variant === 'card') {
    return <CardStatusControl className={className} />;
  }

  return <DropdownStatusControl className={className} />;
}

// =============================================================================
// Status Menu Item (for embedding in existing dropdown menus)
// =============================================================================

interface StatusMenuItemProps {
  onStatusChange?: (status: OnlineStatus) => void;
}

/**
 * Status menu items for embedding in existing dropdown menus.
 * Use this when you want to add status options to an existing menu.
 */
export function StatusMenuItems({ onStatusChange }: StatusMenuItemProps) {
  const t = useTranslations('Social');
  const { status, setStatus } = useOnlineStatus();

  const handleStatusChange = async (newStatus: OnlineStatus) => {
    if (newStatus === status) return;
    await setStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">
        Status
      </DropdownMenuLabel>
      {STATUS_OPTIONS.slice(0, 3).map(({ value, icon: Icon, colorClass }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => handleStatusChange(value)}
          className="gap-2"
        >
          <Icon className={cn('h-3 w-3', colorClass)} />
          <span className="flex-1 text-sm">{t(`presence.${value}`)}</span>
          {status === value && <Check className="h-3 w-3" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export default OnlineStatusControl;
