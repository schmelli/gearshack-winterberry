/**
 * Chat Interface Component
 * Feature 050: AI Assistant - T032
 * Feature 001: Mastra Voice - T113 (Mastra Chat Integration)
 *
 * Main chat interface container with header, message list, and input area.
 * Manages conversation state, AI streaming, and voice output.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Plus, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useMastraChat } from '@/hooks/ai-assistant/useMastraChat';
import { useVoiceOutput } from '@/hooks/ai-assistant/useVoiceOutput';
import { useItems } from '@/hooks/useSupabaseStore';
import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatInterfaceProps {
  onClose: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const t = useTranslations('aiAssistant.chat');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastMessageIdRef = useRef<string | null>(null);

  // Get inventory items for context
  const items = useItems();

  // Use Mastra chat hook (T113: Updated to use Mastra)
  const {
    messages,
    sendMessage,
    isStreaming,
    conversationId,
    resetConversation,
  } = useMastraChat();

  // Voice output hook for TTS
  const {
    speak,
    stop: stopSpeaking,
    isPlaying,
  } = useVoiceOutput({
    voice: 'rachel', // ElevenLabs default voice
    autoPlay: true,
  });

  // Convert MastraMessage format to MessageList format
  const formattedMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    created_at: msg.createdAt,
    inline_cards: msg.toolCalls?.map((tc) => ({ id: tc.toolName, ...tc })),
  }));

  // Auto-play TTS for new assistant messages when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || isStreaming) return;

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      lastMessage.role === 'assistant' &&
      lastMessage.content &&
      lastMessage.id !== lastMessageIdRef.current
    ) {
      lastMessageIdRef.current = lastMessage.id;
      speak(lastMessage.content);
    }
  }, [messages, isStreaming, voiceEnabled, speak]);

  const handleSendMessage = useCallback(async (content: string) => {
    // Stop any playing audio when user sends a new message
    if (isPlaying) {
      stopSpeaking();
    }

    // Pass inventory count in context
    await sendMessage(content, {
      context: {
        inventoryCount: items.length,
        screen: 'inventory',
      },
    });
  }, [sendMessage, isPlaying, stopSpeaking, items.length]);

  // T102: Start new conversation
  const handleNewConversation = useCallback(() => {
    stopSpeaking();
    resetConversation();
  }, [resetConversation, stopSpeaking]);

  // Toggle voice output
  const toggleVoice = useCallback(() => {
    if (voiceEnabled) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  }, [voiceEnabled, stopSpeaking]);

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col">
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
          <div className="flex items-center gap-2">
            {/* Voice Output Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={voiceEnabled ? 'default' : 'ghost'}
                  size="icon"
                  onClick={toggleVoice}
                  className={voiceEnabled ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  {voiceEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {voiceEnabled ? 'Disable voice' : 'Enable voice'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{voiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}</p>
              </TooltipContent>
            </Tooltip>

            {/* T102: Start new conversation button */}
            {conversationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('newConversation')}
              </Button>
            )}
          </div>
        </div>

        {/* Message List */}
        <MessageList
          conversationId={conversationId}
          messages={formattedMessages}
          isLoading={false}
          isStreaming={isStreaming}
          onSpeakMessage={voiceEnabled ? speak : undefined}
          isPlayingAudio={isPlaying}
        />

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isDisabled={isStreaming}
          enableVoice={true}
        />
      </div>
    </TooltipProvider>
  );
}
