/**
 * User List Component
 *
 * Feature: Admin Section Enhancement
 *
 * Displays all users with search, filter, sort, and management actions.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Crown,
  Ban,
  UserCheck,
  Package,
  Layers,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  AdminUserView,
  UserFilter,
  UserSort,
  AccountStatus,
} from '@/types/admin';
import { ACCOUNT_STATUS_COLORS } from '@/types/admin';

// ============================================================================
// Types
// ============================================================================

interface UserListProps {
  users: AdminUserView[];
  isLoading: boolean;
  total: number;
  hasMore: boolean;
  searchQuery: string;
  filter: UserFilter;
  sort: UserSort;
  onSearch: (query: string) => void;
  onFilterChange: (filter: UserFilter) => void;
  onSortChange: (sort: UserSort) => void;
  onLoadMore: () => void;
  onViewUser: (user: AdminUserView) => void;
  onChangeRole: (userId: string, newRole: 'user' | 'admin') => void;
  onChangeTier: (userId: string, newTier: 'standard' | 'trailblazer') => void;
  onSuspend: (user: AdminUserView) => void;
  onUnsuspend: (userId: string) => void;
  onBan: (user: AdminUserView) => void;
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// Component
// ============================================================================

export function UserList({
  users,
  isLoading,
  total,
  hasMore,
  searchQuery,
  filter,
  sort,
  onSearch,
  onFilterChange,
  onSortChange,
  onLoadMore,
  onViewUser,
  onChangeRole,
  onChangeTier,
  onSuspend,
  onUnsuspend,
  onBan,
  onUnban,
}: UserListProps) {
  const t = useTranslations('Admin.users');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(e.target.value);
    },
    [onSearch]
  );

  // Loading skeleton
  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="rounded-md border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <Filter className="mr-2 h-4 w-4" />
          {t('filters')}
          <ChevronDown
            className={cn(
              'ml-2 h-4 w-4 transition-transform',
              showFilters && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/50 p-4">
          {/* Role Filter */}
          <Select
            value={filter.role || 'all'}
            onValueChange={(v) =>
              onFilterChange({ ...filter, role: v as UserFilter['role'] })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('filterRole')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="user">{t('roleUser')}</SelectItem>
              <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Tier Filter */}
          <Select
            value={filter.tier || 'all'}
            onValueChange={(v) =>
              onFilterChange({ ...filter, tier: v as UserFilter['tier'] })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('filterTier')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="standard">{t('tierStandard')}</SelectItem>
              <SelectItem value="trailblazer">{t('tierTrailblazer')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filter.status || 'all'}
            onValueChange={(v) =>
              onFilterChange({ ...filter, status: v as UserFilter['status'] })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="active">{t('statusActive')}</SelectItem>
              <SelectItem value="suspended">{t('statusSuspended')}</SelectItem>
              <SelectItem value="banned">{t('statusBanned')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={`${sort.field}-${sort.direction}`}
            onValueChange={(v) => {
              const [field, direction] = v.split('-') as [
                UserSort['field'],
                UserSort['direction']
              ];
              onSortChange({ field, direction });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">{t('sortNewest')}</SelectItem>
              <SelectItem value="created_at-asc">{t('sortOldest')}</SelectItem>
              <SelectItem value="display_name-asc">{t('sortNameAZ')}</SelectItem>
              <SelectItem value="display_name-desc">{t('sortNameZA')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {t('showingResults', { count: users.length, total })}
      </p>

      {/* User Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnUser')}</TableHead>
              <TableHead>{t('columnRole')}</TableHead>
              <TableHead>{t('columnTier')}</TableHead>
              <TableHead>{t('columnStatus')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('columnActivity')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('columnJoined')}</TableHead>
              <TableHead className="w-[60px]">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t('noUsers')}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewUser(user)}
                >
                  {/* User Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(user.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {user.display_name || 'Unnamed User'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email || 'No email'}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge
                      variant={user.role === 'admin' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {user.role === 'admin' && (
                        <Shield className="mr-1 h-3 w-3" />
                      )}
                      {t(`role${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`)}
                    </Badge>
                  </TableCell>

                  {/* Tier */}
                  <TableCell>
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
                      {t(`tier${(user.subscription_tier || 'standard').charAt(0).toUpperCase()}${(user.subscription_tier || 'standard').slice(1)}`)}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'capitalize',
                        ACCOUNT_STATUS_COLORS[user.account_status as AccountStatus]
                      )}
                    >
                      {t(`status${user.account_status.charAt(0).toUpperCase()}${user.account_status.slice(1)}`)}
                    </Badge>
                  </TableCell>

                  {/* Activity (hidden on mobile) */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {user.gear_items_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {user.loadouts_count || 0}
                      </span>
                    </div>
                  </TableCell>

                  {/* Joined (hidden on mobile) */}
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Role toggle */}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeRole(
                              user.id,
                              user.role === 'admin' ? 'user' : 'admin'
                            );
                          }}
                        >
                          {user.role === 'admin' ? (
                            <>
                              <ShieldOff className="mr-2 h-4 w-4" />
                              {t('actionRemoveAdmin')}
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              {t('actionMakeAdmin')}
                            </>
                          )}
                        </DropdownMenuItem>

                        {/* Tier toggle */}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeTier(
                              user.id,
                              user.subscription_tier === 'trailblazer'
                                ? 'standard'
                                : 'trailblazer'
                            );
                          }}
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          {user.subscription_tier === 'trailblazer'
                            ? t('actionRemoveTrailblazer')
                            : t('actionMakeTrailblazer')}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Suspend/Unsuspend */}
                        {user.account_status === 'suspended' ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnsuspend(user.id);
                            }}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            {t('actionUnsuspend')}
                          </DropdownMenuItem>
                        ) : user.account_status !== 'banned' ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onSuspend(user);
                            }}
                            className="text-amber-600"
                          >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            {t('actionSuspend')}
                          </DropdownMenuItem>
                        ) : null}

                        {/* Ban/Unban */}
                        {user.account_status === 'banned' ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnban(user.id);
                            }}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            {t('actionUnban')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onBan(user);
                            }}
                            className="text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            {t('actionBan')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? t('loading') : t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
