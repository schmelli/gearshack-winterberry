'use client';

/**
 * Virtual Gear Shakedown Component
 *
 * Renders a public shared loadout view with realtime comments.
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T018-T020 - Dual-mode rendering with hero layout for anonymous users
 * Task: T038 - Integrated useOwnedItemsCheck for signed-in users (Phase 7, User Story 5)
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatTripDate } from '@/lib/loadout-utils';
import type { SharedComment, SharedLoadoutPayload, SharedLoadoutOwner, SharedGearItem } from '@/types/sharing';
import type { GearItem } from '@/types/gear';
import { SharedLoadoutHero } from '@/components/shakedown/SharedLoadoutHero';
import { OwnerProfilePreview } from '@/components/shakedown/OwnerProfilePreview';
import { OwnerProfileModal } from '@/components/shakedown/OwnerProfileModal';
import { SharedGearGrid } from '@/components/shakedown/SharedGearGrid';
import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { useOwnedItemsCheck } from '@/hooks/useOwnedItemsCheck';
import { useConversations } from '@/hooks/messaging/useConversations';
import { SharedLoadoutCommentSection } from './SharedLoadoutCommentSection';
import { SharedLoadoutWeightSummary } from './SharedLoadoutWeightSummary';

interface VirtualGearShakedownProps {
  shareToken: string;
  payload: SharedLoadoutPayload;
  allowComments: boolean;
  createdAt: string;
  isAuthenticated: boolean;
  userId: string | null;
  owner: SharedLoadoutOwner | null;
}

function convertToGearItem(selectedItem: SharedGearItem): GearItem {
  return {
    id: selectedItem.id,
    name: selectedItem.name,
    brand: selectedItem.brand,
    primaryImageUrl: selectedItem.primaryImageUrl,
    weightGrams: selectedItem.weightGrams,
    description: selectedItem.description,
    nobgImages: selectedItem.nobgImages ?? undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    brandUrl: null,
    modelNumber: null,
    productUrl: null,
    productTypeId: selectedItem.categoryId,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    size: null,
    color: null,
    volumeLiters: null,
    materials: null,
    tentConstruction: null,
    pricePaid: null,
    currency: null,
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: null,
    quantity: 1,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
    sourceMerchantId: null,
    sourceOfferId: null,
    sourceLoadoutId: null,
  };
}

export function VirtualGearShakedown({
  shareToken,
  payload,
  allowComments,
  createdAt,
  isAuthenticated,
  userId,
  owner,
}: VirtualGearShakedownProps): React.ReactElement {
  const tShared = useTranslations('SharedLoadout');
  const tComments = useTranslations('SharedLoadout.comments');
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<SharedComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [itemId, setItemId] = useState('');

  const [selectedItem, setSelectedItem] = useState<SharedGearItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { startDirectConversation } = useConversations();
  const { checkOwned } = useOwnedItemsCheck(isAuthenticated ? userId : null);

  // Detect mobile viewport
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track view for analytics
  useEffect(() => {
    async function trackView() {
      try {
        await fetch(`/api/shares/${shareToken}/track-view`, { method: 'POST' });
      } catch (error) {
        console.debug('[VirtualGearShakedown] View tracking failed:', error);
      }
    }
    trackView();
  }, [shareToken]);

  const tripDate = useMemo(
    () => (payload.loadout.tripDate ? new Date(payload.loadout.tripDate) : null),
    [payload.loadout.tripDate]
  );
  const createdDate = useMemo(() => (createdAt ? new Date(createdAt) : null), [createdAt]);
  const tripDateLabel = useMemo(() => formatTripDate(tripDate) ?? 'Not set', [tripDate]);
  const createdDateLabel = useMemo(() => formatTripDate(createdDate) ?? 'Live', [createdDate]);

  const weightSummary = useMemo(() => {
    const totalWeight = payload.items.reduce((sum, item) => sum + (item.weightGrams ?? 0), 0);
    const wornWeight = payload.items.reduce(
      (sum, item) => sum + (item.isWorn ? item.weightGrams ?? 0 : 0),
      0
    );
    const consumableWeight = payload.items.reduce(
      (sum, item) => sum + (item.isConsumable ? item.weightGrams ?? 0 : 0),
      0
    );
    const baseWeight = totalWeight - wornWeight - consumableWeight;
    return { totalWeight, baseWeight, wornWeight, consumableWeight };
  }, [payload.items]);

  const itemLookup = useMemo(
    () => new Map(payload.items.map((item) => [item.id, item] as const)),
    [payload.items]
  );

  // Fetch and subscribe to comments
  useEffect(() => {
    async function fetchComments() {
      setIsLoadingComments(true);
      const { data, error } = await supabase
        .from('loadout_comments')
        .select('*')
        .eq('share_token', shareToken)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[VirtualGearShakedown] Failed to load comments', error);
        toast.error(tComments('loadFailed'));
        setComments([]);
      } else {
        setComments((data as SharedComment[]) || []);
      }
      setIsLoadingComments(false);
    }

    fetchComments();

    const channel = supabase
      .channel(`shakedown:${shareToken}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'loadout_comments',
          filter: `share_token=eq.${shareToken}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as SharedComment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareToken, supabase, tComments]);

  const handleSubmit = useCallback(async () => {
    if (!allowComments) return;
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error(tComments('messageRequired'));
      return;
    }
    if (trimmed.length < 3) {
      toast.error(tComments('minLengthError'));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('loadout_comments').insert({
        share_token: shareToken,
        item_id: itemId || null,
        author: author.trim() || null,
        message: trimmed,
      });
      if (error) throw error;
      setMessage('');
    } catch (err) {
      console.error('[VirtualGearShakedown] Failed to submit comment', err);
      toast.error(tComments('sendFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [allowComments, message, supabase, shareToken, itemId, author, tComments]);

  const handleSendMessage = useCallback(
    async (ownerId: string, ownerName: string) => {
      if (!isAuthenticated) {
        toast.error(tComments('signInRequired'));
        return;
      }

      const result = await startDirectConversation(ownerId);
      if (result.success) {
        toast.success(tComments('conversationStarted', { name: ownerName }));
      } else if (result.error === 'privacy_restricted') {
        toast.error(tComments('messagingRestricted'));
      } else {
        toast.error(tComments('conversationFailed'));
      }
    },
    [isAuthenticated, startDirectConversation, tComments]
  );

  const handleGearCardClick = useCallback((item: SharedGearItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const modalGearItem = useMemo(
    () => (selectedItem ? convertToGearItem(selectedItem) : null),
    [selectedItem]
  );

  const renderBadgeList = useCallback((items: string[], emptyLabel: string) => {
    if (!items.length) return <span className="text-sm text-slate-400">{emptyLabel}</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
            {item}
          </Badge>
        ))}
      </div>
    );
  }, []);

  // Anonymous user view with hero header
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
          <SharedLoadoutHero
            payload={payload}
            owner={owner}
            createdAt={createdAt}
            ownerSection={
              <OwnerProfilePreview
                owner={owner}
                onClick={() => setIsProfileModalOpen(true)}
                variant="hero"
              />
            }
            ctaSection={
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
                <p className="mb-4 text-lg text-white">{tShared('signupCta')}</p>
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/login">{tShared('signupButton')}</Link>
                </Button>
              </div>
            }
          />

          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <SharedLoadoutWeightSummary
              weightSummary={weightSummary}
              className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
            />

            <SharedGearGrid items={payload.items} onItemClick={handleGearCardClick} viewDensity="standard" />
          </div>

          <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
            <SharedLoadoutCommentSection
              allowComments={allowComments}
              author={author}
              onAuthorChange={setAuthor}
              itemId={itemId}
              onItemIdChange={setItemId}
              message={message}
              onMessageChange={setMessage}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isLoadingComments={isLoadingComments}
              comments={comments}
              items={payload.items}
              itemLookup={itemLookup}
            />
          </div>
        </div>

        <GearDetailModal open={isModalOpen} onOpenChange={setIsModalOpen} item={modalGearItem} isMobile={isMobile} />
      </>
    );
  }

  // Authenticated user view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('heroTitle')}</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{payload.loadout.name}</h1>
              {payload.loadout.description && (
                <p className="max-w-3xl text-base text-slate-200">{payload.loadout.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <span>{tShared('tripDate')}: {tripDateLabel}</span>
                <span className="text-slate-500">*</span>
                <span>{tShared('createdOn')}: {createdDateLabel}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm text-slate-100">
              <p className="text-xs uppercase tracking-wide text-slate-300">{tShared('totalItems')}</p>
              <p className="text-2xl font-semibold">{payload.items.length}</p>
            </div>
          </div>

          <SharedLoadoutWeightSummary weightSummary={weightSummary} className="mt-6" />
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{tShared('loadoutDetails')}</h2>
                <p className="text-sm text-slate-300">{tShared('loadoutDetailsDescription')}</p>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-100">
                {tShared('live')}
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('activities')}</p>
                  {renderBadgeList(payload.loadout.activityTypes, tShared('noActivitiesTagged'))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{tShared('seasons')}</p>
                  {renderBadgeList(payload.loadout.seasons, tShared('noSeasonsSelected'))}
                </div>
              </div>

              <SharedGearGrid
                items={payload.items}
                onItemClick={handleGearCardClick}
                isOwned={
                  isAuthenticated
                    ? (id) => {
                        const item = payload.items.find((i) => i.id === id);
                        return item ? checkOwned(item.brand, item.name) : false;
                      }
                    : undefined
                }
                viewDensity="compact"
              />
            </div>
          </div>

          <SharedLoadoutCommentSection
            allowComments={allowComments}
            author={author}
            onAuthorChange={setAuthor}
            itemId={itemId}
            onItemIdChange={setItemId}
            message={message}
            onMessageChange={setMessage}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isLoadingComments={isLoadingComments}
            comments={comments}
            items={payload.items}
            itemLookup={itemLookup}
            variant="sidebar"
          />
        </section>
      </div>

      <GearDetailModal open={isModalOpen} onOpenChange={setIsModalOpen} item={modalGearItem} isMobile={isMobile} />

      <OwnerProfileModal
        owner={owner}
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        isAuthenticated={isAuthenticated}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
