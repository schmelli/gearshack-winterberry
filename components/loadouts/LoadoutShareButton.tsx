'use client';

import { useMemo, useState } from 'react';
import { Share2, Clipboard, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';

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
import { createClient } from '@/lib/supabase/client';
import type { Loadout, LoadoutItemState, ActivityType, Season } from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import type { SharedLoadoutPayload } from '@/types/sharing';

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
  const supabase = useMemo(() => createClient(), []);
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        return {
          id: item.id,
          name: item.name,
          brand: item.brand,
          primaryImageUrl: item.primaryImageUrl,
          categoryId: item.categoryId,
          weightGrams: item.weightGrams,
          isWorn: state?.isWorn ?? false,
          isConsumable: state?.isConsumable ?? false,
        };
      }),
    };
  }, [activityTypes, itemStates, items, loadout.description, loadout.id, loadout.name, loadout.tripDate, seasons]);

  const generateLink = async () => {
    setIsGenerating(true);
    setCopied(false);
    try {
      const { data: userResult } = await supabase.auth.getUser();
      const shareToken = crypto.randomUUID();
      const { error } = await supabase
        .from('loadout_shares')
        .upsert({
          share_token: shareToken,
          loadout_id: loadout.id,
          owner_id: userResult?.user?.id ?? null,
          allow_comments: allowComments,
          payload: payload as unknown as import('@/types/database').Json,
        });

      if (error) {
        throw error;
      }

      const url = `${window.location.origin}/${locale}/shakedown/${shareToken}`;
      setShareUrl(url);
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast.success('Share link ready', {
            description: 'Copied to your clipboard',
          });
        } catch {
          toast.success('Share link ready', { description: url });
        }
      } else {
        toast.success('Share link ready', { description: url });
      }
    } catch (err) {
      console.error('[LoadoutShareButton] Failed to generate share link', err);
      toast.error('Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied');
      } catch {
        toast.error('Clipboard is unavailable');
      }
    } else {
      toast.error('Clipboard is unavailable');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="flex items-center gap-2"
          aria-label={showLabel ? undefined : "Share loadout"}
        >
          <Share2 className="h-4 w-4" />
          {showLabel && 'Share'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Virtual Gear Shakedown</DialogTitle>
          <DialogDescription>
            Create a shareable link so others can view your loadout. Enable live comments to let friends leave feedback
            in real time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="allow-comments">Allow comments</Label>
            <p className="text-sm text-muted-foreground">
              Viewers with the link can collaborate via realtime comments.
            </p>
          </div>
          <Switch
            id="allow-comments"
            checked={allowComments}
            onCheckedChange={setAllowComments}
            aria-label="Allow comments"
          />
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <Button onClick={generateLink} disabled={isGenerating} className="w-full">
            {isGenerating ? 'Generating…' : 'Generate share link'}
          </Button>

          {shareUrl && (
            <div className="flex w-full items-center gap-2">
              <Input value={shareUrl} readOnly className="text-sm" />
              <Button variant="secondary" size="icon" onClick={handleCopy} aria-label="Copy share link">
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
