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
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { formatTripDate, formatWeight } from '@/lib/loadout-utils';
import type { SharedComment, SharedLoadoutPayload, SharedLoadoutOwner, SharedGearItem } from '@/types/sharing';
import type { GearItem } from '@/types/gear';
import { SharedLoadoutHero } from '@/components/shakedown/SharedLoadoutHero';
import { OwnerProfilePreview } from '@/components/shakedown/OwnerProfilePreview';
import { OwnerProfileModal } from '@/components/shakedown/OwnerProfileModal';
import { SharedGearGrid } from '@/components/shakedown/SharedGearGrid';
import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { useOwnedItemsCheck } from '@/hooks/useOwnedItemsCheck';
import { useConversations } from '@/hooks/messaging/useConversations';
import { useCategories } from '@/hooks/useCategories';

interface VirtualGearShakedownProps {
  shareToken: string;
  payload: SharedLoadoutPayload;
  allowComments: boolean;
  createdAt: string;
  /** Whether the current user is authenticated (Feature 048, T015) */
  isAuthenticated: boolean;
  /** Current user's ID if authenticated, null otherwise (Feature 048, T015) */
  userId: string | null;
  /** Loadout owner information (Feature 048, T018) */
  owner: SharedLoadoutOwner | null;
}

export function VirtualGearShakedown({
  shareToken,
  payload,
  allowComments,
  createdAt,
  isAuthenticated,
  userId,
  owner,
}: VirtualGearShakedownProps) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<SharedComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [itemId, setItemId] = useState('');

  // Gear detail modal state (T020)
  const [selectedItem, setSelectedItem] = useState<SharedGearItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // T038: Use owned items check hook for authenticated users (Phase 7, User Story 5)
  
  // Feature 048, T050-T053: Owner profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { startDirectConversation } = useConversations();
  const { checkOwned } = useOwnedItemsCheck(isAuthenticated ? userId : null);

  // Use Supabase categories for correct category display
  const { getLabelById } = useCategories();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoadingComments(true);
      const { data, error } = await supabase
        .from('loadout_comments')
        .select('*')
        .eq('share_token', shareToken)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[VirtualGearShakedown] Failed to load comments', error);
        toast.error('Unable to load comments');
        setComments([]);
      } else {
        setComments((data as SharedComment[]) || []);
      }
      setIsLoadingComments(false);
    };

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
  }, [shareToken, supabase]);

  const handleSubmit = async () => {
    if (!allowComments) return;
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Add a comment before sending');
      return;
    }
    if (trimmed.length < 3) {
      toast.error('Please share at least a few characters of feedback');
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

      if (error) {
        throw error;
      }

      setMessage('');
    } catch (err) {
      console.error('[VirtualGearShakedown] Failed to submit comment', err);
      toast.error('Failed to send comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Feature 048, T052: Handle messaging owner
  const handleSendMessage = useCallback(
    async (ownerId: string, ownerName: string) => {
      if (!isAuthenticated) {
        toast.error('Please sign in to send messages');
        return;
      }

      const result = await startDirectConversation(ownerId);
      if (result.success) {
        toast.success(`Conversation with ${ownerName} started`);
        // Optionally redirect to messages or open messaging modal
      } else if (result.error === 'privacy_restricted') {
        toast.error('This user has restricted messaging');
      } else {
        toast.error('Failed to start conversation');
      }
    },
    [isAuthenticated, startDirectConversation]
  );

  const renderBadgeList = (items: string[], emptyLabel: string) => {
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
  };

  const itemLookup = useMemo(
    () => new Map(payload.items.map((item) => [item.id, item] as const)),
    [payload.items]
  );

  // Handle gear card click (T020)
  const handleGearCardClick = (item: SharedGearItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // Convert SharedGearItem to GearItem for modal (T020)
  const modalGearItem: GearItem | null = useMemo(() => {
    if (!selectedItem) return null;

    return {
      id: selectedItem.id,
      name: selectedItem.name,
      brand: selectedItem.brand,
      primaryImageUrl: selectedItem.primaryImageUrl,
      categoryId: selectedItem.categoryId,
      weightGrams: selectedItem.weightGrams,
      description: selectedItem.description,
      nobgImages: selectedItem.nobgImages ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      brandUrl: null,
      modelNumber: null,
      productUrl: null,
      subcategoryId: null,
      productTypeId: null,
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
    };
  }, [selectedItem]);

  // T018-T020: Anonymous user view with hero header
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
          {/* Hero Header (T018) */}
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
                <p className="mb-4 text-lg text-white">
                  Want to add this loadout to your collection?
                </p>
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/login">Sign Up Free</Link>
                </Button>
              </div>
            }
          />

          {/* Gear Grid Section (T019) */}
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Weight</p>
                  <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.totalWeight)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Base Weight</p>
                  <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.baseWeight)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Worn</p>
                  <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.wornWeight)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Consumables</p>
                  <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.consumableWeight)}</p>
                </div>
              </div>
            </div>

            {/* T019: SharedGearGrid with category sorting */}
            <SharedGearGrid
              items={payload.items}
              onItemClick={handleGearCardClick}
              viewDensity="standard"
            />
          </div>

          {/* Comments Section */}
          <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Realtime</p>
                  <h2 className="text-xl font-semibold text-white">Comments</h2>
                </div>
                <MessageSquare className="h-5 w-5 text-emerald-200" />
              </div>

              {allowComments ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="comment-author" className="text-sm text-slate-200">
                      Name (optional)
                    </Label>
                    <Input
                      id="comment-author"
                      placeholder="Guest"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment-item" className="text-sm text-slate-200">
                      Item (optional)
                    </Label>
                    <select
                      id="comment-item"
                      value={itemId}
                      onChange={(e) => setItemId(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-black/30 p-2 text-sm text-white"
                    >
                      <option value="">General feedback</option>
                      {payload.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment-message" className="text-sm text-slate-200">
                      Comment
                    </Label>
                    <Textarea
                      id="comment-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share your feedback or suggestions..."
                      className="min-h-[96px] border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    aria-label="Send comment"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Send comment
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Comments are disabled for this shakedown.
                </div>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Live thread</span>
                  {isLoadingComments && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                </div>
                <div className="space-y-3">
                  {comments.length === 0 && !isLoadingComments && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                      No comments yet. Be the first to share feedback.
                    </div>
                  )}
                  {comments.map((comment) => {
                    const target = comment.item_id ? itemLookup.get(comment.item_id) : null;
                    return (
                      <div
                        key={comment.id}
                        className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{comment.author || 'Guest'}</span>
                          <span className="text-xs text-slate-400">
                            {formatTripDate(new Date(comment.created_at)) ?? ''}
                          </span>
                        </div>
                        {target && (
                          <p className="mt-1 text-xs text-emerald-100">
                            Item: <span className="font-medium text-white">{target.name}</span>
                          </p>
                        )}
                        <p className="mt-2 whitespace-pre-wrap text-slate-50">{comment.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* T020: Gear Detail Modal */}
        <GearDetailModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          item={modalGearItem}
          isMobile={isMobile}
        />
      </>
    );
  }

  // AUTHENTICATED USER VIEW (kept from existing implementation for now)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Virtual Gear Shakedown</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{payload.loadout.name}</h1>
              {payload.loadout.description && (
                <p className="max-w-3xl text-base text-slate-200">{payload.loadout.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <span>Trip date: {tripDateLabel}</span>
                <span className="text-slate-500">•</span>
                <span>Created: {createdDateLabel}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm text-slate-100">
              <p className="text-xs uppercase tracking-wide text-slate-300">Total Items</p>
              <p className="text-2xl font-semibold">{payload.items.length}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Weight</p>
              <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.totalWeight)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Base Weight</p>
              <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.baseWeight)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Worn</p>
              <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.wornWeight)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Consumables</p>
              <p className="mt-2 text-xl font-semibold">{formatWeight(weightSummary.consumableWeight)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Loadout Details</h2>
                <p className="text-sm text-slate-300">A clean, read-only snapshot of the shared setup.</p>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-100">
                Live
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Activities</p>
                  {renderBadgeList(payload.loadout.activityTypes, 'No activities tagged')}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Seasons</p>
                  {renderBadgeList(payload.loadout.seasons, 'No seasons selected')}
                </div>
              </div>

              {/* T038: Use SharedGearGrid with owned items check for authenticated users */}
              <SharedGearGrid
                items={payload.items}
                onItemClick={handleGearCardClick}
                isOwned={isAuthenticated ? (itemId) => {
                  const item = payload.items.find(i => i.id === itemId);
                  return item ? checkOwned(item.brand, item.name) : false;
                } : undefined}
                viewDensity="compact"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Realtime</p>
                <h2 className="text-xl font-semibold text-white">Comments</h2>
              </div>
              <MessageSquare className="h-5 w-5 text-emerald-200" />
            </div>

            {allowComments ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="comment-author" className="text-sm text-slate-200">
                    Name (optional)
                  </Label>
                  <Input
                    id="comment-author"
                    placeholder="Guest"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment-item" className="text-sm text-slate-200">
                    Item (optional)
                  </Label>
                  <select
                    id="comment-item"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-black/30 p-2 text-sm text-white"
                  >
                    <option value="">General feedback</option>
                    {payload.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment-message" className="text-sm text-slate-200">
                    Comment
                  </Label>
                  <Textarea
                    id="comment-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share your feedback or suggestions..."
                    className="min-h-[96px] border-white/10 bg-black/30 text-white placeholder:text-slate-500"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  aria-label="Send comment"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send comment
                    </span>
                  )}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Comments are disabled for this shakedown.
              </div>
            )}

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Live thread</span>
                {isLoadingComments && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              <div className="space-y-3">
                {comments.length === 0 && !isLoadingComments && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                    No comments yet. Be the first to share feedback.
                  </div>
                )}
                {comments.map((comment) => {
                  const target = comment.item_id ? itemLookup.get(comment.item_id) : null;
                  return (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{comment.author || 'Guest'}</span>
                        <span className="text-xs text-slate-400">
                          {formatTripDate(new Date(comment.created_at)) ?? ''}
                        </span>
                      </div>
                      {target && (
                        <p className="mt-1 text-xs text-emerald-100">
                          Item: <span className="font-medium text-white">{target.name}</span>
                        </p>
                      )}
                      <p className="mt-2 whitespace-pre-wrap text-slate-50">{comment.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* T020: Gear Detail Modal for authenticated users */}
      <GearDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        item={modalGearItem}
        isMobile={isMobile}
      />

      {/* Feature 048, T051-T053: Owner Profile Modal */}
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
