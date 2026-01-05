/**
 * LoadoutShareButton Component
 *
 * Feature: Share Management
 *
 * Provides simple URL sharing for loadouts:
 * - Generate shareable links
 * - Copy to clipboard
 * - Social sharing buttons
 *
 * Note: Community Shakedown (with comments/collaboration) is a separate feature
 * accessible via the Users icon in the loadout header.
 */

'use client';

import { useMemo, useState } from 'react';
import { Share2, Clipboard, Check, Settings2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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

  // Share creation state (simplified - no comments/expiry options)
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

  // Generate new share link (simplified - no comments, no expiry)
  const generateLink = async () => {
    setIsGenerating(true);
    setCopied(false);
    setShareUrl(null);

    try {
      // Create share with comments disabled and no expiry (simple URL sharing)
      const result = await createNewShare(payload, {
        allowComments: false,
        expiresAt: null,
      });

      if (result) {
        setShareUrl(result.url);

        // Auto-copy to clipboard
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(result.url);
            setCopied(true);
            toast.success(t('linkCopied'));
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {t('shareLoadoutTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('shareLoadoutDescription')}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              {!shareUrl ? (
                <Button onClick={generateLink} disabled={isGenerating} className="w-full">
                  {isGenerating ? t('generating') : t('getShareLink')}
                </Button>
              ) : (
                <>
                  {/* Generated URL with copy button */}
                  <div className="flex w-full items-center gap-2">
                    <Input value={shareUrl} readOnly className="text-sm font-mono" />
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleCopy}
                      aria-label={t('copyShareLink')}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clipboard className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Social Share Buttons */}
                  <div className="w-full pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('shareOn')}
                    </p>
                    <SocialShareButtons
                      url={shareUrl}
                      title={loadout.name}
                      description={loadout.description ?? undefined}
                    />
                  </div>

                  {/* Generate new link option */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateLink}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {t('generateNewLink')}
                  </Button>
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
