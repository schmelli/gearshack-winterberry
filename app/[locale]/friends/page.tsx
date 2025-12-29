/**
 * Friends Page
 *
 * Feature: 001-social-graph
 * Task: T039
 *
 * Displays friends list and friend requests in tabs.
 * Protected route - requires authentication.
 *
 * Features:
 * - Tab navigation: Friends / Requests
 * - Friends list with search/filter/sort
 * - Incoming/outgoing friend requests
 * - Friend activity feed sidebar (desktop)
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, Users, UserPlus, Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { FriendsList } from '@/components/social/FriendsList';
import { FriendActivityFeed } from '@/components/social/FriendActivityFeed';
import { FriendRequestList } from '@/components/social/FriendRequestNotification';
import { EmptyStateCard } from '@/components/social/EmptyStateCard';
import { useFriendRequests } from '@/hooks/social/useFriendRequests';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

// =============================================================================
// Request Tabs Component
// =============================================================================

function RequestsTabs() {
  const t = useTranslations('Social');
  const { pendingIncoming: incomingRequests, pendingOutgoing: outgoingRequests, isLoading, error } = useFriendRequests();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'incoming' | 'outgoing')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="incoming" className="gap-2">
          {t('requests.incoming')}
          {incomingRequests.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {incomingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="outgoing" className="gap-2">
          {t('requests.outgoing')}
          {outgoingRequests.length > 0 && (
            <Badge variant="outline" className="ml-1">
              {outgoingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="incoming" className="mt-4">
        {incomingRequests.length === 0 ? (
          <EmptyStateCard
            type="friend-requests"
            title={t('requests.emptyIncoming')}
          />
        ) : (
          <FriendRequestList requests={incomingRequests} variant="card" />
        )}
      </TabsContent>

      <TabsContent value="outgoing" className="mt-4">
        {outgoingRequests.length === 0 ? (
          <EmptyStateCard
            type="friend-requests"
            title={t('requests.emptyOutgoing')}
          />
        ) : (
          <OutgoingRequestsList requests={outgoingRequests} />
        )}
      </TabsContent>
    </Tabs>
  );
}

// =============================================================================
// Outgoing Requests List (simplified display)
// =============================================================================

import type { FriendRequestWithProfile } from '@/types/social';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

interface OutgoingRequestsListProps {
  requests: FriendRequestWithProfile[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getDaysUntilExpiry(createdAt: string): number {
  const created = new Date(createdAt);
  const expiry = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

function OutgoingRequestsList({ requests }: OutgoingRequestsListProps) {
  const t = useTranslations('Social');
  const { cancelRequest } = useFriendRequests();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (requestId: string) => {
    setCancellingId(requestId);
    try {
      await cancelRequest(requestId);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const recipient = request.recipient;
        if (!recipient) return null;

        const daysLeft = getDaysUntilExpiry(request.created_at);

        return (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Link href={`/profile/${recipient.id}`}>
                  <Avatar className="h-10 w-10">
                    {recipient.avatar_url ? (
                      <AvatarImage src={recipient.avatar_url} alt={recipient.display_name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(recipient.display_name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${recipient.id}`}
                    className="font-medium hover:underline"
                  >
                    {recipient.display_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t('requests.expiresIn', { days: daysLeft })}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(request.id)}
                  disabled={cancellingId === request.id}
                >
                  {cancellingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('friends.cancel')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// =============================================================================
// Page Content
// =============================================================================

function FriendsPageContent() {
  const t = useTranslations('Social');
  const { pendingIncoming: incomingRequests } = useFriendRequests();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'activity'>('friends');

  // Badge count for requests tab
  const requestCount = incomingRequests.length;

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('friends.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('friends.emptyDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main Tabs */}
        <div className="flex-1 lg:max-w-2xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-3">
              <TabsTrigger value="friends" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t('friends.title')}</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('requests.title')}</span>
                {requestCount > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {requestCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2 lg:hidden">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">{t('activity.title')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="mt-4">
              <FriendsList
                showSearch
                showControls
              />
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <RequestsTabs />
            </TabsContent>

            <TabsContent value="activity" className="mt-4 lg:hidden">
              <FriendActivityFeed showFilter />
            </TabsContent>
          </Tabs>
        </div>

        {/* Activity Feed Sidebar (desktop only) */}
        <aside className="hidden w-80 lg:block">
          <FriendActivityFeed
            title={t('activity.title')}
            showFilter
            limit={10}
          />
        </aside>
      </div>
    </main>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function FriendsPage() {
  return (
    <ProtectedRoute>
      <FriendsPageContent />
    </ProtectedRoute>
  );
}
