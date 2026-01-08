'use client';

/**
 * VIP Admin List Component
 *
 * Feature: 052-vip-loadouts
 * Task: T035
 *
 * Table view of VIPs with admin actions.
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import {
  MoreHorizontal,
  Edit,
  Archive,
  ArchiveRestore,
  Star,
  StarOff,
  ExternalLink,
  Loader2,
  List,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VipFormDialog } from './VipFormDialog';
import { VipArchiveDialog } from './VipArchiveDialog';
import { VipLoadoutsPanel } from './VipLoadoutsPanel';
import { toggleVipFeatured, restoreVip } from '@/lib/vip/vip-admin-service';
import { toast } from 'sonner';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipAdminListProps {
  vips: VipWithStats[];
  onUpdate: () => void;
  isArchived?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function VipAdminList({ vips, onUpdate, isArchived = false }: VipAdminListProps) {
  const locale = useLocale();
  const t = useTranslations('vip.admin');
  const [editingVip, setEditingVip] = useState<VipWithStats | null>(null);
  const [archivingVip, setArchivingVip] = useState<VipWithStats | null>(null);
  const [managingLoadoutsVip, setManagingLoadoutsVip] = useState<VipWithStats | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Handle toggle featured
  const handleToggleFeatured = async (vip: VipWithStats) => {
    setLoadingId(vip.id);
    try {
      await toggleVipFeatured(vip.id, !vip.isFeatured);
      toast.success(vip.isFeatured ? t('vipUnfeatured') : t('vipFeatured'));
      onUpdate();
    } catch (err) {
      toast.error(t('featuredUpdateFailed'));
    } finally {
      setLoadingId(null);
    }
  };

  // Handle restore
  const handleRestore = async (vip: VipWithStats) => {
    setLoadingId(vip.id);
    try {
      await restoreVip(vip.id);
      toast.success(t('vipRestored'));
      onUpdate();
    } catch (err) {
      toast.error(t('restoreVipFailed'));
    } finally {
      setLoadingId(null);
    }
  };

  if (vips.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {isArchived ? t('noArchivedVips') : t('noVipsYet')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>{t('columnName')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className="text-right">{t('columnFollowers')}</TableHead>
              <TableHead className="text-right">{t('columnLoadouts')}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vips.map((vip) => (
              <TableRow key={vip.id}>
                {/* Avatar */}
                <TableCell>
                  <div className="relative h-10 w-10 rounded-full overflow-hidden">
                    <Image
                      src={vip.avatarUrl}
                      alt={vip.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                </TableCell>

                {/* Name & Slug */}
                <TableCell>
                  <div>
                    <Link
                      href={`/${locale}/vip/${vip.slug}`}
                      className="font-medium hover:underline flex items-center gap-1"
                    >
                      {vip.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <p className="text-sm text-muted-foreground">{vip.slug}</p>
                  </div>
                </TableCell>

                {/* Status Badges */}
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={vip.status === 'claimed' ? 'default' : 'secondary'}>
                      {vip.status}
                    </Badge>
                    {vip.isFeatured && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        <Star className="h-3 w-3 mr-1" />
                        {t('featured')}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Follower Count */}
                <TableCell className="text-right">
                  {vip.followerCount.toLocaleString()}
                </TableCell>

                {/* Loadout Count */}
                <TableCell className="text-right">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setManagingLoadoutsVip(vip)}
                    className="text-primary hover:underline"
                  >
                    {t('loadoutCountLabel', { count: vip.loadoutCount })}
                  </Button>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={loadingId === vip.id}
                      >
                        {loadingId === vip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!isArchived && (
                        <>
                          <DropdownMenuItem onClick={() => setManagingLoadoutsVip(vip)}>
                            <List className="h-4 w-4 mr-2" />
                            {t('manageLoadouts')}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => setEditingVip(vip)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('editVip')}
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleToggleFeatured(vip)}>
                            {vip.isFeatured ? (
                              <>
                                <StarOff className="h-4 w-4 mr-2" />
                                {t('notFeatured')}
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                {t('featured')}
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setArchivingVip(vip)}
                            className="text-destructive"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {t('archiveVip')}
                          </DropdownMenuItem>
                        </>
                      )}

                      {isArchived && (
                        <DropdownMenuItem onClick={() => handleRestore(vip)}>
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          {t('restore')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <VipFormDialog
        open={!!editingVip}
        onOpenChange={(open) => !open && setEditingVip(null)}
        vip={editingVip}
        onSuccess={() => {
          setEditingVip(null);
          onUpdate();
        }}
      />

      {/* Archive Dialog */}
      <VipArchiveDialog
        open={!!archivingVip}
        onOpenChange={(open) => !open && setArchivingVip(null)}
        vip={archivingVip}
        onSuccess={() => {
          setArchivingVip(null);
          onUpdate();
        }}
      />

      {/* Loadouts Management Dialog */}
      {managingLoadoutsVip && (
        <Dialog
          open={true}
          onOpenChange={(open) => !open && setManagingLoadoutsVip(null)}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <VipLoadoutsPanel
              vipId={managingLoadoutsVip.id}
              vipName={managingLoadoutsVip.name}
              claimedByUserId={managingLoadoutsVip.claimedByUserId}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default VipAdminList;
