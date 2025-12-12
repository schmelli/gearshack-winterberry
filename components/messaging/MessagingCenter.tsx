'use client';

import { useMemo, useState } from 'react';
import {
  Mail,
  Search,
  Send,
  Tag,
  Users,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type MessageAuthor = 'me' | 'contact';

interface Message {
  id: string;
  author: MessageAuthor;
  body: string;
  timestamp: string;
  context?: string;
}

interface Conversation {
  id: string;
  participantId?: string;
  participant: string;
  avatar?: string;
  headline: string;
  location?: string;
  tags?: string[];
  lastActive: string;
  unread: number;
  messages: Message[];
}

interface DirectoryUser {
  id: string;
  name: string;
  headline: string;
  tags?: string[];
  avatar?: string;
  location?: string;
}

const directory: DirectoryUser[] = [
  {
    id: 'lena',
    name: 'Lena Hartmann',
    headline: 'Planning a Dolomites traverse next month',
    tags: ['Trips', 'Alpine'],
  },
  {
    id: 'kai',
    name: 'Kai Moreno',
    headline: 'Tradable: Petzl ice axe, looking for carbon poles',
    tags: ['Tradable', 'Climbing'],
  },
  {
    id: 'mara',
    name: 'Mara Ivers',
    headline: 'Selling: 1.2kg UL tent, available to ship',
    tags: ['Sellable', 'Shelter'],
  },
];

const initialConversations: Conversation[] = [
  {
    id: 'maya',
    participantId: 'maya',
    participant: 'Maya Chen',
    headline: 'Trading carbon poles before Dolomites trip',
    location: 'Munich · Alpine',
    tags: ['Tradable', 'Gear swap'],
    lastActive: '2m ago',
    unread: 2,
    messages: [
      {
        id: 'm1',
        author: 'contact',
        body: 'Hey! I saw your carbon poles flagged as tradable. Interested in swapping for my Petzl ice axe?',
        timestamp: '2m ago',
        context: 'Carbon trekking poles',
      },
      {
        id: 'm2',
        author: 'me',
        body: 'Hi Maya! Poles are in great condition. Do you need them before your Dolomites trip?',
        timestamp: '1m ago',
      },
      {
        id: 'm3',
        author: 'contact',
        body: 'Yes, leaving next weekend. Could meet in Munich or ship.',
        timestamp: 'Just now',
      },
    ],
  },
  {
    id: 'jamal',
    participantId: 'jamal',
    participant: 'Jamal Rivers',
    headline: 'Looking for a partner for Sarek trek',
    location: 'Remote · Sweden',
    tags: ['Trip planning'],
    lastActive: '1h ago',
    unread: 0,
    messages: [
      {
        id: 'j1',
        author: 'contact',
        body: 'Hey, saw your winter pack list. Want to co-plan Sarek in July?',
        timestamp: '1h ago',
      },
      {
        id: 'j2',
        author: 'me',
        body: 'Absolutely! I can share my GPS tracks and kit breakdown.',
        timestamp: '55m ago',
      },
    ],
  },
  {
    id: 'renee',
    participantId: 'renee',
    participant: 'Renée Fischer',
    headline: 'Interested in your sellable trail runners',
    location: 'Vienna · Trail',
    tags: ['Sellable'],
    lastActive: 'Yesterday',
    unread: 1,
    messages: [
      {
        id: 'r1',
        author: 'contact',
        body: 'Still selling the Speedgoat 6? Need EU 42 for an upcoming stage race.',
        timestamp: 'Yesterday',
      },
    ],
  },
];

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    return `${array[0].toString(16)}-${array[1].toString(16)}`;
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createIntroMessage(user: DirectoryUser) {
  return `Hi ${user.name}! I saw your note: "${user.headline}". Want to sync up?`;
}

function formatInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const firstInitial = parts[0]?.[0]?.toUpperCase() ?? '';
  const secondInitial = parts[1]?.[0]?.toUpperCase() ?? '';
  return `${firstInitial}${secondInitial}`.trim();
}

export function MessagingCenter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(
    initialConversations
  );
  const [activeConversationId, setActiveConversationId] = useState(
    initialConversations[0]?.id ?? ''
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, convo) => sum + convo.unread, 0),
    [conversations]
  );

  const activeConversation =
    conversations.find((convo) => convo.id === activeConversationId) ??
    conversations[0];

  const queryLower = query.toLowerCase();

  const filteredConversations = conversations.filter(
    (convo) =>
      convo.participant.toLowerCase().includes(queryLower) ||
      convo.headline.toLowerCase().includes(queryLower) ||
      convo.messages.some((msg) =>
        msg.body.toLowerCase().includes(queryLower)
      )
  );

  const filteredDirectory = directory.filter(
    (user) =>
      user.name.toLowerCase().includes(queryLower) ||
      user.headline.toLowerCase().includes(queryLower) ||
      (user.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(queryLower)
      )
  );

  const markConversationRead = (id: string) =>
    setConversations((prev) =>
      prev.map((convo) =>
        convo.id === id ? { ...convo, unread: 0 } : convo
      )
    );

  const setActiveConversation = (id: string) => {
    setActiveConversationId(id);
    markConversationRead(id);
  };

  const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageDraft.trim() || !activeConversation) return;

    const newMessage: Message = {
      id: generateId(),
      author: 'me',
      body: messageDraft.trim(),
      timestamp: 'Just now',
    };

    setConversations((prev) =>
      prev.map((convo) =>
        convo.id === activeConversation.id
          ? {
              ...convo,
              messages: [...convo.messages, newMessage],
              lastActive: 'Just now',
              unread: 0,
            }
          : convo
      )
    );
    setMessageDraft('');
  };

  const handleStartChat = (user: DirectoryUser) => {
  const existing = conversations.find((convo) => convo.participantId === user.id);

    if (existing) {
      setActiveConversation(existing.id);
      return;
    }

    const newConversation: Conversation = {
      id: user.id,
      participantId: user.id,
      participant: user.name,
      avatar: user.avatar,
      headline: user.headline,
      tags: user.tags,
      lastActive: 'Just now',
      unread: 0,
      messages: [
        {
          id: generateId(),
          author: 'me',
          body: createIntroMessage(user),
          timestamp: 'Just now',
        },
      ],
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversation(newConversation.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && activeConversation) {
          markConversationRead(activeConversation.id);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadTotal > 0
              ? `Messages (${unreadTotal} unread)`
              : 'Messages'
          }
        >
          <Mail className="h-5 w-5" />
          {unreadTotal > 0 && (
            <span className="absolute right-1 top-1 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadTotal}
            </span>
          )}
          <span className="sr-only">Messages</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl overflow-hidden border-none p-0">
        <DialogHeader className="border-b bg-muted/40 px-6 py-4">
          <DialogTitle className="text-left text-lg font-semibold">
            Messages
          </DialogTitle>
          <p className="text-left text-sm text-muted-foreground">
            Coordinate trips, trades, or sales directly with other Gearshack
            users.
          </p>
        </DialogHeader>

        <div className="grid h-[70vh] grid-cols-1 md:grid-cols-[320px,1fr]">
          <div className="border-r bg-muted/30">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people, gear, trips"
                className="h-9 bg-white/80 dark:bg-slate-900/60"
              />
            </div>

            <div className="flex items-center gap-2 px-4 py-2 text-xs uppercase text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Active conversations
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto px-2 pb-2 pt-1">
              {filteredConversations.map((convo) => {
                const lastMessage = convo.messages[convo.messages.length - 1];
                return (
                  <button
                    key={convo.id}
                    type="button"
                    onClick={() => setActiveConversation(convo.id)}
                    className={cn(
                      'group flex w-full gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white hover:shadow-sm dark:hover:bg-slate-900/70',
                      convo.id === activeConversation?.id &&
                        'bg-white shadow-sm dark:bg-slate-900/70'
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={convo.avatar} alt={convo.participant} />
                      <AvatarFallback>
                        {formatInitials(convo.participant)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate text-sm font-semibold">
                          {convo.participant}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {convo.lastActive}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {convo.headline}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {convo.tags?.map((tag) => (
                          <span
                            key={`${convo.id}-${tag}`}
                            className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                        {convo.unread > 0 && (
                          <span className="ml-auto flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                            {convo.unread} new
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {lastMessage.author === 'me' ? 'You: ' : ''}
                          {lastMessage.body}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t bg-white/70 px-4 py-3 dark:bg-slate-900/60">
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Discover & start new chats
              </div>
              <div className="flex flex-col gap-2">
                {filteredDirectory.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{user.name}</div>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.headline}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(user.tags ?? []).map((tag) => (
                          <span
                            key={`${user.id}-${tag}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStartChat(user)}
                    >
                      Contact
                    </Button>
                  </div>
                ))}
                {filteredDirectory.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No people matched your search. Try a gear item or trip name.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col bg-white dark:bg-slate-950">
            {activeConversation ? (
              <>
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={activeConversation.avatar}
                        alt={activeConversation.participant}
                      />
                      <AvatarFallback>
                        {formatInitials(activeConversation.participant)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold">
                        {activeConversation.participant}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activeConversation.headline}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeConversation.tags?.map((tag) => (
                      <span
                        key={`${activeConversation.id}-${tag}`}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  {activeConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col gap-1',
                        msg.author === 'me'
                          ? 'items-end'
                          : 'items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                          msg.author === 'me'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-50'
                        )}
                      >
                        {msg.context && (
                          <div
                            className={cn(
                              'mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold',
                              msg.author === 'me'
                                ? 'bg-white/80 text-primary'
                                : 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                            )}
                          >
                            <Tag className="h-3 w-3" />
                            {msg.context}
                          </div>
                        )}
                        <p className="leading-relaxed">{msg.body}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {msg.timestamp}
                      </span>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="border-t bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-end gap-3">
                    <Textarea
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="Send a message or share details about a gear item or trip..."
                      className="min-h-[64px] flex-1 resize-none bg-white/80 dark:bg-slate-900/80"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!messageDraft.trim()}
                    >
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send message</span>
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select or start a conversation to begin messaging.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
