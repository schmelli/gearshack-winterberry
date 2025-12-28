/**
 * ShareManagementDialog Component
 *
 * Feature: Share Management
 *
 * Provides a dialog for managing loadout shares:
 * - List existing shares with stats
 * - Toggle comments, set expiry, manage passwords
 * - Delete shares
 * - Create new shares
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Check,
  Copy,
  Eye,
  Link2,
  Lock,
  LockOpen,
  MessageSquare,
  MoreVertical,
  Trash2,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SocialShareButtons } from '@/components/loadouts/SocialShareButtons';
import { cn } from '@/lib/utils';
import type { ShareListItem } from '@/types/sharing';

// =============================================================================
// Types
// =============================================================================

interface ShareManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shares: ShareListItem[];
  loadoutName: string;
  isLoading: boolean;
  onUpdateShare: (shareToken: string, updates: { allowComments?: boolean; expiresAt?: string | null }) => Promise<boolean>;
  onDeleteShare: (shareToken: string) => Promise<boolean>;
  onSetPassword: (shareToken: string, password: string) => Promise<boolean>;
  onRemovePassword: (shareToken: string) => Promise<boolean>;
  getShareUrl: (shareToken: string) => string;
}

// =============================================================================
// Sub-Components
// =============================================================================

function ShareListItemRow({
  share,
  onUpdate,
  onDelete,
  onSetPassword,
  onRemovePassword,
  getShareUrl,
}: {
  share: ShareListItem;
  onUpdate: (updates: { allowComments?: boolean; expiresAt?: string | null }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onSetPassword: (password: string) => Promise<boolean>;
  onRemovePassword: () => Promise<boolean>;
  getShareUrl: () => string;
}) {
  const t = useTranslations('Shakedown');
  const [copied, setCopied] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const url = getShareUrl();
  const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('linkCopied') || 'Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleToggleComments = async () => {
    await onUpdate({ allowComments: !share.allowComments });
  };

  const handleSetPassword = async () => {
    if (!passwordValue || passwordValue.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    const success = await onSetPassword(passwordValue);
    if (success) {
      setShowPasswordInput(false);
      setPasswordValue('');
    }
  };

  const handleRemovePassword = async () => {
    await onRemovePassword();
  };

  const handleDelete = async () => {
    await onDelete();
    setDeleteDialogOpen(false);
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        isExpired && 'opacity-50 border-destructive/50'
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {t('createdAgo', {
                time: formatDistanceToNow(new Date(share.createdAt), { addSuffix: true }),
              }) || `Created ${formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}`}
            </span>
          </div>
          {isExpired && (
            <div className="text-sm text-destructive font-medium mt-1">
              {t('expired') || 'Expired'}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" title={t('views') || 'Views'}>
            <Eye className="h-3.5 w-3.5" />
            <span>{share.viewCount}</span>
          </div>
          {share.hasPassword && (
            <Lock className="h-3.5 w-3.5" title={t('passwordProtected') || 'Password protected'} />
          )}
          {share.allowComments && (
            <MessageSquare className="h-3.5 w-3.5" title={t('commentsEnabled') || 'Comments enabled'} />
          )}
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleToggleComments}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {share.allowComments
                ? (t('disableComments') || 'Disable comments')
                : (t('enableComments') || 'Enable comments')}
            </DropdownMenuItem>
            {share.hasPassword ? (
              <DropdownMenuItem onClick={handleRemovePassword}>
                <LockOpen className="h-4 w-4 mr-2" />
                {t('removePassword') || 'Remove password'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setShowPasswordInput(true)}>
                <Lock className="h-4 w-4 mr-2" />
                {t('setPassword') || 'Set password'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteShare') || 'Delete share'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* URL Row */}
      <div className="flex items-center gap-2">
        <Input
          value={url}
          readOnly
          className="text-sm font-mono bg-muted/50"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      {/* Password Input */}
      {showPasswordInput && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            type="password"
            placeholder={t('enterPassword') || 'Enter password (min 4 chars)'}
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={handleSetPassword}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowPasswordInput(false);
              setPasswordValue('');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expiry Info */}
      {share.expiresAt && !isExpired && (
        <div className="text-sm text-muted-foreground">
          {t('expiresOn', {
            date: format(new Date(share.expiresAt), 'PPp'),
          }) || `Expires ${format(new Date(share.expiresAt), 'PPp')}`}
        </div>
      )}

      {/* Social Share Buttons */}
      <div className="pt-2 border-t">
        <SocialShareButtons
          url={url}
          title={share.loadoutName}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteShareTitle') || 'Delete share link?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteShareDescription') || 'This will permanently remove this share link. Anyone with the link will no longer be able to access your loadout.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ShareManagementDialog({
  open,
  onOpenChange,
  shares,
  loadoutName,
  isLoading,
  onUpdateShare,
  onDeleteShare,
  onSetPassword,
  onRemovePassword,
  getShareUrl,
}: ShareManagementDialogProps) {
  const t = useTranslations('Shakedown');

  // Sort shares: active first, then by created date
  const sortedShares = [...shares].sort((a, b) => {
    const aExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
    const bExpired = b.expiresAt && new Date(b.expiresAt) < new Date();
    if (aExpired !== bExpired) return aExpired ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('manageShares') || 'Manage Shares'}
          </DialogTitle>
          <DialogDescription>
            {t('manageSharesDescription', { name: loadoutName }) ||
              `Manage share links for "${loadoutName}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('loading') || 'Loading...'}
            </div>
          ) : sortedShares.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noShares') || 'No share links yet'}</p>
              <p className="text-sm mt-1">
                {t('noSharesHint') || 'Create a share link to let others view your loadout'}
              </p>
            </div>
          ) : (
            sortedShares.map((share) => (
              <ShareListItemRow
                key={share.shareToken}
                share={share}
                onUpdate={(updates) => onUpdateShare(share.shareToken, updates)}
                onDelete={() => onDeleteShare(share.shareToken)}
                onSetPassword={(password) => onSetPassword(share.shareToken, password)}
                onRemovePassword={() => onRemovePassword(share.shareToken)}
                getShareUrl={() => getShareUrl(share.shareToken)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
