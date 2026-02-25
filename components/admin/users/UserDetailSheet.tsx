/**
 * User Detail Sheet
 *
 * Feature: Admin Section Enhancement
 *
 * Side sheet showing user details, activity, and management actions.
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  Shield,
  Crown,
  Package,
  Layers,
  Mail,
  Calendar,
  MapPin,
  Globe,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { AdminUserView, AccountStatus } from '@/types/admin';
import { ACCOUNT_STATUS_COLORS } from '@/types/admin';

// ============================================================================
// Types
// ============================================================================

interface UserDetailSheetProps {
  user: AdminUserView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeRole: (userId: string, newRole: 'user' | 'admin') => void;
  onChangeTier: (userId: string, newTier: 'standard' | 'trailblazer') => void;
  onSuspend: () => void;
  onUnsuspend: (userId: string) => void;
  onBan: () => void;
  onUnban: (userId: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Component
// ============================================================================

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
  onChangeRole,
  onChangeTier,
  onSuspend,
  onUnsuspend,
  onBan,
  onUnban,
}: UserDetailSheetProps) {
  const t = useTranslations('Admin.users');

  if (!user) return null;

  const isSuspended = user.account_status === 'suspended';
  const isBanned = user.account_status === 'banned';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('userDetails')}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(user.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {user.display_name || 'Unnamed User'}
              </h3>
              {user.trail_name && (
                <p className="text-sm text-muted-foreground truncate">
                  &ldquo;{user.trail_name}&rdquo;
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                  {user.role}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize',
                    user.subscription_tier === 'trailblazer' &&
                      'border-amber-500 text-amber-600'
                  )}
                >
                  {user.subscription_tier === 'trailblazer' && (
                    <Crown className="mr-1 h-3 w-3" />
                  )}
                  {user.subscription_tier || 'standard'}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    'capitalize',
                    ACCOUNT_STATUS_COLORS[user.account_status as AccountStatus]
                  )}
                >
                  {user.account_status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Suspension/Ban Info */}
          {(isSuspended || isBanned) && (
            <div
              className={cn(
                'rounded-lg border p-4',
                isBanned
                  ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'
              )}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={cn(
                    'h-5 w-5 mt-0.5',
                    isBanned ? 'text-red-600' : 'text-amber-600'
                  )}
                />
                <div className="flex-1 space-y-1">
                  <p
                    className={cn(
                      'font-medium',
                      isBanned ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {isBanned ? t('userIsBanned') : t('userIsSuspended')}
                  </p>
                  {user.suspension_reason && (
                    <p className="text-sm text-muted-foreground">
                      <strong>{t('reason')}:</strong> {user.suspension_reason}
                    </p>
                  )}
                  {user.suspended_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('since')} {formatDateTime(user.suspended_at)}
                    </p>
                  )}
                  {user.suspended_until && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('until')} {formatDateTime(user.suspended_until)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              {t('contactInfo')}
            </h4>
            <div className="space-y-2">
              {user.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.location_name && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{user.location_name}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{t('joined')} {formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Stats */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              {t('activity')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span className="text-xs">{t('gearItems')}</span>
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {user.gear_items_count || 0}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span className="text-xs">{t('loadouts')}</span>
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {user.loadouts_count || 0}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Type */}
          {user.account_type && user.account_type !== 'standard' && (
            <>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  {t('accountType')}
                </h4>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="capitalize">
                    {user.account_type}
                  </Badge>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              {t('actions')}
            </h4>
            <div className="flex flex-col gap-2">
              {/* Role Action */}
              <Button
                variant="outline"
                onClick={() =>
                  onChangeRole(
                    user.id,
                    user.role === 'admin' ? 'user' : 'admin'
                  )
                }
              >
                <Shield className="mr-2 h-4 w-4" />
                {user.role === 'admin'
                  ? t('actionRemoveAdmin')
                  : t('actionMakeAdmin')}
              </Button>

              {/* Tier Action */}
              <Button
                variant="outline"
                onClick={() =>
                  onChangeTier(
                    user.id,
                    user.subscription_tier === 'trailblazer'
                      ? 'standard'
                      : 'trailblazer'
                  )
                }
              >
                <Crown className="mr-2 h-4 w-4" />
                {user.subscription_tier === 'trailblazer'
                  ? t('actionRemoveTrailblazer')
                  : t('actionMakeTrailblazer')}
              </Button>

              {/* Suspension/Ban Actions */}
              {isBanned ? (
                <Button variant="outline" onClick={() => onUnban(user.id)}>
                  {t('actionUnban')}
                </Button>
              ) : isSuspended ? (
                <Button variant="outline" onClick={() => onUnsuspend(user.id)}>
                  {t('actionUnsuspend')}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="text-amber-600 hover:text-amber-700"
                    onClick={onSuspend}
                  >
                    {t('actionSuspend')}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={onBan}
                  >
                    {t('actionBan')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
