/**
 * MessageSearch - Message Search Component
 *
 * Feature: 046-user-messaging-system
 * Task: T058
 *
 * Search interface for finding messages across conversations.
 */

'use client';

import { Search, Loader2, MessageSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useMessageSearch } from '@/hooks/messaging/useMessageSearch';
import type { MessageSearchResult } from '@/types/messaging';
import { cn } from '@/lib/utils';

interface MessageSearchProps {
  onSelectResult?: (conversationId: string, messageId: string) => void;
  className?: string;
}

/**
 * Search component for finding messages.
 */
export function MessageSearch({ onSelectResult, className }: MessageSearchProps) {
  const { query, setQuery, results, isSearching, error, clearSearch } = useMessageSearch();

  const handleResultClick = (result: MessageSearchResult) => {
    onSelectResult?.(result.conversation.id, result.message.id);
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
        {isSearching && (
          <Loader2 className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Error State */}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {/* Empty State */}
      {!isSearching && query.length >= 2 && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No messages found for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-4">
            {results.map((result) => (
              <SearchResultCard
                key={result.message.id}
                result={result}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Initial State */}
      {!isSearching && query.length < 2 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Search your message history
          </p>
          <p className="text-xs text-muted-foreground/70">
            Enter at least 2 characters to search
          </p>
        </div>
      )}
    </div>
  );
}

interface SearchResultCardProps {
  result: MessageSearchResult;
  onClick: () => void;
}

function SearchResultCard({ result, onClick }: SearchResultCardProps) {
  const conversationName =
    result.conversation.name ||
    (result.conversation.type === 'direct' ? 'Direct Message' : 'Group');

  const timeAgo = formatDistanceToNow(new Date(result.message.created_at), {
    addSuffix: true,
  });

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-sm">{conversationName}</p>
              <Badge variant="outline" className="shrink-0 text-xs">
                {result.conversation.type}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {result.highlight}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
