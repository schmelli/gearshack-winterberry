/**
 * Chat Interface Component
 * Feature 050: AI Assistant - T032
 *
 * Main chat interface container with header, message list, and input area.
 * Manages conversation state and AI streaming.
 */

'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useAIChat } from '@/hooks/ai-assistant/useAIChat';
import { useConversationHistory } from '@/hooks/ai-assistant/useConversationHistory';

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { sendMessage, isStreaming } = useAIChat();
  const { messages, isLoading } = useConversationHistory(conversationId);

  const handleSendMessage = async (content: string) => {
    const newConversationId = await sendMessage(content, conversationId);
    if (newConversationId && !conversationId) {
      setConversationId(newConversationId);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Gear Assistant</h2>
            <p className="text-xs text-muted-foreground">
              Ask me anything about your gear
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-white/50 dark:hover:bg-black/50"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Message List */}
      <MessageList
        conversationId={conversationId}
        messages={messages}
        isLoading={isLoading || isStreaming}
      />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isDisabled={isStreaming}
      />
    </div>
  );
}
