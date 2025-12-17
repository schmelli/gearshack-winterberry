/**
 * Chat Input Component
 * Feature 050: AI Assistant - T036
 *
 * Text input area with send button, character limit, and auto-resize.
 * Handles message submission and rate limiting feedback.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRateLimiting } from '@/hooks/ai-assistant/useRateLimiting';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isDisabled?: boolean;
}

const MAX_MESSAGE_LENGTH = 1000;

export function ChatInput({
  onSendMessage,
  isDisabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuthContext();
  const { isRateLimited, remainingTime, checkRateLimit } = useRateLimiting(
    user?.uid || null
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || isDisabled) return;

    // Check rate limit
    const canSend = await checkRateLimit();
    if (!canSend) {
      return;
    }

    setIsSending(true);

    try {
      // Call parent handler with message
      await onSendMessage(trimmedMessage);

      // Clear input on success
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const canSend = message.trim().length > 0 && !isOverLimit && !isSending && !isRateLimited && !isDisabled;

  return (
    <div className="border-t border-border bg-background p-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        {/* Rate Limit Warning */}
        {isRateLimited && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Rate limit reached. Try again in {remainingTime}s.
          </div>
        )}

        {/* Input Area */}
        <div className="relative flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your gear..."
              className={cn(
                'max-h-32 min-h-[60px] resize-none pr-12',
                isOverLimit && 'border-red-500 focus-visible:ring-red-500'
              )}
              disabled={isSending || isRateLimited || isDisabled}
            />
            {/* Character Count */}
            <div className="mt-1 flex items-center justify-between px-1">
              <span
                className={cn(
                  'text-xs',
                  isOverLimit ? 'text-red-500' : 'text-muted-foreground'
                )}
              >
                {characterCount}/{MAX_MESSAGE_LENGTH}
              </span>
              <span className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className="mb-6 h-10 w-10 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
