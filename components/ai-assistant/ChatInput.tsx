/**
 * Chat Input Component
 * Feature 050: AI Assistant - T036
 * Feature 001: Mastra Voice - T079 (Voice Integration)
 *
 * Text input area with send button, voice input, character limit, and auto-resize.
 * Handles message submission, voice transcription, and rate limiting feedback.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRateLimiting } from '@/hooks/ai-assistant/useRateLimiting';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useVoiceInput } from '@/hooks/ai-assistant/useVoiceInput';
import { VoiceInputButton, type VoiceButtonState } from './VoiceInputButton';
import { VoiceRecordingIndicator } from './VoiceRecordingIndicator';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isDisabled?: boolean;
  /** Enable voice input (default: true if browser supports it) */
  enableVoice?: boolean;
}

const MAX_MESSAGE_LENGTH = 1000;

export function ChatInput({
  onSendMessage,
  isDisabled = false,
  enableVoice = true,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuthContext();
  const { isRateLimited, remainingTime, checkRateLimit } = useRateLimiting(
    user?.uid || null
  );

  // Voice input hook
  const handleTranscription = useCallback((result: { text: string; needsRetry: boolean; retryMessage?: string }) => {
    if (result.text) {
      setMessage(prev => prev ? `${prev} ${result.text}` : result.text);
      // Focus the textarea after transcription
      textareaRef.current?.focus();
    }
  }, []);

  const {
    state: voiceState,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: resetVoice,
    transcription,
  } = useVoiceInput({
    language: 'auto',
    onTranscription: handleTranscription,
  });

  // Check if voice input is supported
  const isVoiceSupported = typeof window !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices;

  // Map voice state to button state
  const getVoiceButtonState = (): VoiceButtonState => {
    if (!isVoiceSupported || !enableVoice) return 'disabled';
    switch (voiceState) {
      case 'recording':
        return 'recording';
      case 'processing':
        return 'processing';
      case 'error':
        return 'error';
      case 'low_confidence':
        return 'idle'; // Can retry
      default:
        return 'idle';
    }
  };

  // Handle voice button click
  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (voiceState === 'error' || voiceState === 'low_confidence') {
      resetVoice();
      startRecording();
    } else {
      startRecording();
    }
  };

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

        {/* Voice Recording Indicator */}
        {isRecording && (
          <div className="mb-3 flex justify-center">
            <VoiceRecordingIndicator
              durationMs={recordingDuration}
              onCancel={cancelRecording}
              isRecording={isRecording}
            />
          </div>
        )}

        {/* Low Confidence Warning */}
        {voiceState === 'low_confidence' && transcription?.retryMessage && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {transcription.retryMessage}
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
              placeholder={isRecording ? 'Listening...' : 'Ask me anything about your gear...'}
              className={cn(
                'max-h-32 min-h-[60px] resize-none pr-12',
                isOverLimit && 'border-red-500 focus-visible:ring-red-500',
                isRecording && 'border-destructive/50'
              )}
              disabled={isSending || isRateLimited || isDisabled || isRecording}
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

          {/* Voice Input Button */}
          {enableVoice && isVoiceSupported && (
            <VoiceInputButton
              state={getVoiceButtonState()}
              onClick={handleVoiceClick}
              disabled={isSending || isRateLimited || isDisabled}
              className="mb-6 shrink-0"
            />
          )}

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
