/**
 * LoadoutShareButton Component
 *
 * Feature: Share Management
 *
 * Provides share creation and management for loadouts:
 * - Generate new share links
 * - Configure share settings (comments, expiry)
 * - Manage existing shares
 * - Social sharing buttons
 */

'use client';

import { useMemo, useState } from 'react';
import { Share2, Clipboard, Check, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { addDays } from 'date-fns';

import { Button, buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useShareManagement } from '@/hooks/useShareManagement';
import { useStore } from '@/hooks/useSupabaseStore';
import { SocialShareButtons } from '@/components/loadouts/SocialShareButtons';
import { ShareManagementDialog } from '@/components/loadouts/ShareManagementDialog';
import type { Loadout, LoadoutItemState, ActivityType, Season } from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import type { SharedLoadoutPayload } from '@/types/sharing';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';

// =============================================================================
// Types
// =============================================================================

interface LoadoutShareButtonProps {
  loadout: Loadout;
  items: GearItem[];
  itemStates: LoadoutItemState[];
  activityTypes: ActivityType[];
  seasons: Season[];
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  showLabel?: boolean;
}

// =============================================================================
// Expiry Options
// =============================================================================

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Never', days: null },
  { value: '1d', label: '1 day', days: 1 },
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
];

// =============================================================================
// Component
// =============================================================================

export function LoadoutShareButton({
  loadout,
  items,
  itemStates,
  activityTypes,
  seasons,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}: LoadoutShareButtonProps) {
  const t = useTranslations('Shakedown');
  const userId = useStore((state) => state.userId);

  // Share management hook
  const {
    shares,
    isLoading,
    createNewShare,
    updateShareSettings,
    removeShare,
    setPassword,
    removePassword,
    getShareUrl,
  } = useShareManagement(loadout.id, userId);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  // Create share form state
  const [allowComments, setAllowComments] = useState(true);
  const [expiryOption, setExpiryOption] = useState('never');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Cascading Category Refactor: Get categories for deriving categoryId from productTypeId
  const categories = useCategoriesStore((state) => state.categories);

  // Build payload for sharing
  const payload: SharedLoadoutPayload = useMemo(() => {
    const stateById = new Map(itemStates.map((state) => [state.itemId, state]));

    return {
      loadout: {
        id: loadout.id,
        name: loadout.name,
        description: loadout.description,
        tripDate: loadout.tripDate ? loadout.tripDate.toISOString() : null,
        activityTypes: activityTypes || [],
        seasons: seasons || [],
      },
      items: items.map((item) => {
        const state = stateById.get(item.id);
        const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
        return {
          id: item.id,
          name: item.name,
          brand: item.brand,
          primaryImageUrl: item.primaryImageUrl,
          categoryId,
          weightGrams: item.weightGrams,
          isWorn: state?.isWorn ?? false,
          isConsumable: state?.isConsumable ?? false,
          description: item.description,
          nobgImages: item.nobgImages ?? null,
        };
      }),
    };
  }, [activityTypes, itemStates, items, loadout, seasons, categories]);

  // Generate new share link
  const generateLink = async () => {
    setIsGenerating(true);
    setCopied(false);
    setShareUrl(null);

    try {
      // Calculate expiry date
      const expiryDays = EXPIRY_OPTIONS.find((opt) => opt.value === expiryOption)?.days;
      const expiresAt = expiryDays ? addDays(new Date(), expiryDays).toISOString() : null;

      const result = await createNewShare(payload, {
        allowComments,
        expiresAt,
      });

      if (result) {
        setShareUrl(result.url);

        // Auto-copy to clipboard
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(result.url);
            setCopied(true);
          } catch {
            // Clipboard failed, user can manually copy
          }
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy URL to clipboard
  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t('linkCopied'));
    } catch {
      toast.error(t('clipboardUnavailable'));
    }
  };

  // Reset form when dialog closes
  const handleCreateDialogChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      // Reset form state when closing
      setShareUrl(null);
      setCopied(false);
      setAllowComments(true);
      setExpiryOption('never');
    }
  };

  const hasShares = shares.length > 0;

  return (
    <>
      {/* Main Share Button with Dropdown */}
      <div className="flex items-center">
        {/* Create Share Button */}
        <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
          <DialogTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className="flex items-center gap-2"
              aria-label={showLabel ? undefined : t('shareLoadout') || 'Share loadout'}
            >
              <Share2 className="h-4 w-4" />
              {showLabel && (t('share') || 'Share')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('virtualGearShakedown') || 'Virtual Gear Shakedown'}</DialogTitle>
              <DialogDescription>
                {t('shareDescription') ||
                  'Create a shareable link so others can view your loadout. Enable live comments to let friends leave feedback in real time.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Allow Comments Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label htmlFor="allow-comments">{t('allowComments') || 'Allow comments'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('allowCommentsHint') ||
                      'Viewers with the link can collaborate via realtime comments.'}
                  </p>
                </div>
                <Switch
                  id="allow-comments"
                  checked={allowComments}
                  onCheckedChange={setAllowComments}
                  aria-label={t('allowComments') || 'Allow comments'}
                />
              </div>

              {/* Expiry Selection */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label htmlFor="expiry">{t('linkExpiry') || 'Link expiry'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('linkExpiryHint') || 'Set when this share link will expire.'}
                  </p>
                </div>
                <Select value={expiryOption} onValueChange={setExpiryOption}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              <Button onClick={generateLink} disabled={isGenerating} className="w-full">
                {isGenerating
                  ? (t('generating') || 'Generating…')
                  : (t('generateShareLink') || 'Generate share link')}
              </Button>

              {shareUrl && (
                <>
                  <div className="flex w-full items-center gap-2">
                    <Input value={shareUrl} readOnly className="text-sm font-mono" />
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleCopy}
                      aria-label={t('copyShareLink') || 'Copy share link'}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Social Share Buttons */}
                  <div className="w-full pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('shareOn') || 'Share on:'}
                    </p>
                    <SocialShareButtons
                      url={shareUrl}
                      title={loadout.name}
                      description={loadout.description ?? undefined}
                    />
                  </div>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Shares Button (shown when shares exist) */}
        {hasShares && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-1"
            onClick={() => setManageDialogOpen(true)}
            aria-label={t('manageShares') || 'Manage shares'}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Share Management Dialog */}
      <ShareManagementDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        shares={shares}
        loadoutName={loadout.name}
        isLoading={isLoading}
        onUpdateShare={updateShareSettings}
        onDeleteShare={removeShare}
        onSetPassword={setPassword}
        onRemovePassword={removePassword}
        getShareUrl={getShareUrl}
      />
    </>
  );
}
