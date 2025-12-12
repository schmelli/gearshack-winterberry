'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { formatTripDate, formatWeight } from '@/lib/loadout-utils';
import type { SharedComment, SharedLoadoutPayload } from '@/types/sharing';

interface VirtualGearShakedownProps {
  shareToken: string;
  payload: SharedLoadoutPayload;
  allowComments: boolean;
  createdAt: string;
}

export function VirtualGearShakedown({ shareToken, payload, allowComments, createdAt }: VirtualGearShakedownProps) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<SharedComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [itemId, setItemId] = useState('');

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

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {payload.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-4 transition hover:border-emerald-300/40 hover:bg-black/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-slate-400">{item.brand ?? 'Unknown brand'}</p>
                        <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      </div>
                      <p className="text-sm text-emerald-100">{formatWeight(item.weightGrams ?? 0)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.isWorn && (
                        <Badge variant="secondary" className="bg-sky-500/20 text-sky-50">
                          Worn
                        </Badge>
                      )}
                      {item.isConsumable && (
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-50">
                          Consumable
                        </Badge>
                      )}
                      {!item.isWorn && !item.isConsumable && (
                        <Badge variant="outline" className="border-white/20 text-slate-200">
                          In pack
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
