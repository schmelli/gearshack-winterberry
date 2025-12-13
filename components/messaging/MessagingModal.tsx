/**
 * MessagingModal - Main Messaging Modal Overlay
 *
 * Feature: 046-user-messaging-system
 * Task: T008
 *
 * The main modal overlay for the messaging system.
 * Accessible from anywhere via the envelope icon in the header.
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Users, Search } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { FriendsList } from './FriendsList';
import { UserSearch } from './UserSearch';
import { UserProfileModal } from './UserProfileModal';
import { MessageSearch } from './MessageSearch';
import { ConversationSettings } from './ConversationSettings';
import { useConversations } from '@/hooks/messaging/useConversations';
import type { ConversationListItem } from '@/types/messaging';

interface MessagingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewState = 'conversations' | 'conversation' | 'new' | 'search';

/**
 * Main messaging modal component.
 * Uses Dialog on desktop, Sheet on mobile.
 */
export function MessagingModal({ open, onOpenChange }: MessagingModalProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'friends'>('messages');
  const [viewState, setViewState] = useState<ViewState>('conversations');
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationListItem | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const { startDirectConversation } = useConversations();

  // Detect mobile for responsive layout
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleSelectConversation = (conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
    setViewState('conversation');
  };

  const handleBack = () => {
    setViewState('conversations');
    setSelectedConversation(null);
  };

  const handleNewConversation = () => {
    setViewState('new');
  };

  const handleMessageFriend = async (friendId: string, displayName: string) => {
    // Start or get existing conversation
    const result = await startDirectConversation(friendId);
    if (result.success && result.conversationId) {
      // Create a minimal conversation list item for the view
      const tempConversation: ConversationListItem = {
        conversation: {
          id: result.conversationId,
          type: 'direct',
          name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        },
        participants: [{
          id: friendId,
          display_name: displayName,
          avatar_url: null,
          role: 'member',
          joined_at: new Date().toISOString(),
        }],
        role: 'member',
        unread_count: 0,
        is_muted: false,
        is_archived: false,
        last_read_at: null,
      };
      setSelectedConversation(tempConversation);
      setActiveTab('messages');
      setViewState('conversation');
    }
  };

  const content = (
    <div className="flex h-full flex-col">
      {/* Header with tabs */}
      <div className="border-b px-4 py-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Friends</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="messages" className="m-0 h-full">
            {viewState === 'conversations' && (
              <div className="flex h-full flex-col">
                {/* Search and New button */}
                <div className="flex items-center gap-2 border-b p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-start text-muted-foreground"
                    onClick={() => setViewState('search')}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search messages...
                  </Button>
                  <Button size="sm" onClick={handleNewConversation}>
                    New
                  </Button>
                </div>

                {/* Conversation list */}
                <ScrollArea className="flex-1">
                  <ConversationList onSelectConversation={handleSelectConversation} />
                </ScrollArea>
              </div>
            )}

            {viewState === 'conversation' && selectedConversation && (
              <div className="flex h-full flex-col">
                {/* Conversation header */}
                <div className="flex items-center gap-2 border-b p-3">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    Back
                  </Button>
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {selectedConversation.conversation.name ||
                        selectedConversation.participants
                          .map((p) => p.display_name)
                          .join(', ')}
                    </h3>
                  </div>
                  <ConversationSettings conversation={selectedConversation} />
                </div>

                {/* Conversation view */}
                <div className="flex-1 overflow-hidden">
                  <ConversationView
                    conversation={selectedConversation}
                    onBack={handleBack}
                  />
                </div>
              </div>
            )}

            {viewState === 'new' && (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b p-3">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    Back
                  </Button>
                  <h3 className="flex-1 font-medium">New Conversation</h3>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                  <UserSearch
                    onMessageUser={handleMessageFriend}
                    onViewProfile={(userId) => setProfileUserId(userId)}
                    placeholder="Search for someone to message..."
                  />
                </div>
              </div>
            )}

            {viewState === 'search' && (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b p-3">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    Back
                  </Button>
                  <h3 className="flex-1 font-medium">Search Messages</h3>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                  <MessageSearch
                    onSelectResult={(conversationId) => {
                      // Navigate to conversation
                      // TODO: Scroll to specific message
                      const tempConversation: ConversationListItem = {
                        conversation: {
                          id: conversationId,
                          type: 'direct',
                          name: null,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          created_by: null,
                        },
                        participants: [],
                        role: 'member',
                        unread_count: 0,
                        is_muted: false,
                        is_archived: false,
                        last_read_at: null,
                      };
                      setSelectedConversation(tempConversation);
                      setViewState('conversation');
                    }}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="m-0 h-full p-4">
            <FriendsList onMessageFriend={handleMessageFriend} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Messages</SheetTitle>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
        <UserProfileModal
          userId={profileUserId}
          open={!!profileUserId}
          onOpenChange={(open) => !open && setProfileUserId(null)}
          onSendMessage={handleMessageFriend}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Messages</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
      <UserProfileModal
        userId={profileUserId}
        open={!!profileUserId}
        onOpenChange={(open) => !open && setProfileUserId(null)}
        onSendMessage={handleMessageFriend}
      />
    </>
  );
}
