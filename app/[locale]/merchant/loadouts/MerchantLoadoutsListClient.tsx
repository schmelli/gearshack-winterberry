/**
 * MerchantLoadoutsListClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T040
 *
 * Client-side list of merchant loadouts with filtering and actions.
 */

'use client';

import { useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Send,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMerchantLoadouts, type LoadoutsFilter } from '@/hooks/merchant';
import type { MerchantLoadout, LoadoutStatus } from '@/types/merchant-loadout';

// =============================================================================
// Component
// =============================================================================

export function MerchantLoadoutsListClient() {
  const t = useTranslations('MerchantLoadouts');
  const tDashboard = useTranslations('MerchantDashboard');
  const locale = useLocale();
  const router = useRouter();

  const {
    filteredLoadouts,
    isLoading,
    filter,
    setFilter,
    submitForReview,
    publish,
    archive,
    unpublish,
    deleteLoadout,
  } = useMerchantLoadouts();

  // Status badge
  const getStatusBadge = (status: LoadoutStatus) => {
    const variants: Record<LoadoutStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      draft: 'secondary',
      pending_review: 'outline',
      published: 'default',
      archived: 'destructive',
    };
    const labels: Record<LoadoutStatus, string> = {
      draft: tDashboard('status.draft'),
      pending_review: tDashboard('status.pendingReview'),
      published: tDashboard('status.published'),
      archived: tDashboard('status.archived'),
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  // Navigate to edit
  const handleEdit = useCallback(
    (loadout: MerchantLoadout) => {
      router.push(`/${locale}/merchant/loadouts/${loadout.id}/edit`);
    },
    [router, locale]
  );

  // Navigate to view
  const handleView = useCallback(
    (loadout: MerchantLoadout) => {
      router.push(`/${locale}/community/merchant-loadouts/${loadout.slug}`);
    },
    [router, locale]
  );

  // Navigate to create
  const handleCreate = useCallback(() => {
    router.push(`/${locale}/merchant/loadouts/create`);
  }, [router, locale]);

  // Loading state
  if (isLoading) {
    return <MerchantLoadoutsListSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {tDashboard('createLoadout')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('wizard.items.searchPlaceholder')} className="pl-9" />
        </div>
        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as LoadoutsFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allLoadouts')}</SelectItem>
            <SelectItem value="draft">{tDashboard('status.draft')}</SelectItem>
            <SelectItem value="pending_review">
              {tDashboard('status.pendingReview')}
            </SelectItem>
            <SelectItem value="published">{tDashboard('status.published')}</SelectItem>
            <SelectItem value="archived">{tDashboard('status.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loadouts List */}
      {filteredLoadouts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-medium text-muted-foreground">{t('noResults')}</p>
            <p className="text-sm text-muted-foreground/75 mt-1">
              {t('noResultsHint')}
            </p>
            <Button onClick={handleCreate} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              {tDashboard('createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLoadouts.map((loadout) => (
            <LoadoutListItem
              key={loadout.id}
              loadout={loadout}
              onView={() => handleView(loadout)}
              onEdit={() => handleEdit(loadout)}
              onSubmitForReview={() => submitForReview(loadout.id)}
              onPublish={() => publish(loadout.id)}
              onArchive={() => archive(loadout.id)}
              onUnpublish={() => unpublish(loadout.id)}
              onDelete={() => deleteLoadout(loadout.id)}
              statusBadge={getStatusBadge(loadout.status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface LoadoutListItemProps {
  loadout: MerchantLoadout;
  onView: () => void;
  onEdit: () => void;
  onSubmitForReview: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  onArchive: () => Promise<boolean>;
  onUnpublish: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  statusBadge: React.ReactNode;
}

function LoadoutListItem({
  loadout,
  onView,
  onEdit,
  onSubmitForReview,
  onPublish,
  onArchive,
  onUnpublish,
  onDelete,
  statusBadge,
}: LoadoutListItemProps) {
  const t = useTranslations('MerchantLoadouts');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{loadout.name}</h3>
              {statusBadge}
              {loadout.isFeatured && (
                <Badge variant="outline" className="text-xs">
                  {t('featured')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {loadout.tripType && `${loadout.tripType} · `}
              {t('items', { count: 0 })} · {t('weight', { weight: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('updated', { date: new Date(loadout.updatedAt).toLocaleDateString() })}
            </p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="font-medium">{loadout.viewCount}</p>
              <p className="text-xs text-muted-foreground">{t('views')}</p>
            </div>
            <div className="text-center">
              <p className="font-medium">{loadout.wishlistAddCount}</p>
              <p className="text-xs text-muted-foreground">{t('wishlistAdds')}</p>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {loadout.status === 'published' && (
                <DropdownMenuItem onClick={onView}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('view')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                {t('edit')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Status actions */}
              {loadout.status === 'draft' && (
                <DropdownMenuItem onClick={() => onSubmitForReview()}>
                  <Send className="mr-2 h-4 w-4" />
                  {t('submitForReview')}
                </DropdownMenuItem>
              )}
              {loadout.status === 'pending_review' && (
                <DropdownMenuItem onClick={() => onPublish()}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('publish')}
                </DropdownMenuItem>
              )}
              {loadout.status === 'published' && (
                <DropdownMenuItem onClick={() => onArchive()}>
                  <Archive className="mr-2 h-4 w-4" />
                  {t('archive')}
                </DropdownMenuItem>
              )}
              {loadout.status === 'archived' && (
                <DropdownMenuItem onClick={() => onUnpublish()}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('restoreToDraft')}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('delete')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteDescription', { name: loadout.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

function MerchantLoadoutsListSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
