/**
 * MessageInput - Message Compose Component
 *
 * Feature: 046-user-messaging-system
 * Task: T016, T051
 *
 * Text input with send button and attachment options.
 */

'use client';

import { useState, useRef, useCallback, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Send, Loader2, Paperclip, Image as ImageIcon, MapPin, Package, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageAttachmentPreview } from './ImageAttachmentPreview';
import { GearPicker } from './GearPicker';
import { LocationPicker } from './LocationPicker';
import { VoiceRecorder } from './VoiceRecorder';
import type { MessageType, MessageMetadata, GearReferenceMetadata, LocationMetadata, VoiceMetadata } from '@/types/messaging';

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  onSendWithMedia?: (
    content: string | null,
    messageType: MessageType,
    mediaUrl: string | null,
    metadata?: MessageMetadata
  ) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Message input component with auto-resize and attachment options.
 */
export function MessageInput({
  onSend,
  onSendWithMedia,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [gearPickerOpen, setGearPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup typing timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imageAttachment?.url) {
        URL.revokeObjectURL(imageAttachment.url);
      }
    };
  }, [imageAttachment?.url]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();

    // Handle image attachment
    if (imageAttachment && onSendWithMedia) {
      try {
        setIsSending(true);
        setIsUploadingImage(true);

        // Upload image to Cloudinary
        const formData = new FormData();
        formData.append('file', imageAttachment.file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'gearshack');
        formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );
        const data = await response.json();

        if (data.secure_url) {
          await onSendWithMedia(
            trimmedMessage || null,
            'image',
            data.secure_url,
            { width: data.width, height: data.height, thumbnail_url: data.secure_url }
          );
          setMessage('');
          setImageAttachment(null);
        }
      } catch {
        // Revoke blob URL on error to prevent memory leak
        if (imageAttachment?.url) {
          URL.revokeObjectURL(imageAttachment.url);
        }
        setImageAttachment(null);
        // Error handled by parent
      } finally {
        setIsSending(false);
        setIsUploadingImage(false);
      }
      return;
    }

    // Handle text message
    if (!trimmedMessage || isSending || disabled) return;

    try {
      setIsSending(true);
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);

      await onSend(trimmedMessage);
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      // Error is handled by parent component
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, disabled, onSend, imageAttachment, onSendWithMedia, onTyping]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter, allow Shift+Enter for new line
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);

      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;

      // Trigger typing indicator
      if (onTyping && e.target.value.length > 0) {
        onTyping(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      }
    },
    [onTyping]
  );

  // Handle image file selection
  const handleImageSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageAttachment({ url, file });
    }
    // Reset input so same file can be selected again
    e.target.value = '';
    setAttachmentMenuOpen(false);
  }, []);

  // Handle image removal
  const handleRemoveImage = useCallback(() => {
    if (imageAttachment) {
      URL.revokeObjectURL(imageAttachment.url);
      setImageAttachment(null);
    }
  }, [imageAttachment]);

  // Handle gear item selection
  const handleGearSelect = useCallback(
    async (metadata: GearReferenceMetadata) => {
      if (onSendWithMedia) {
        await onSendWithMedia(null, 'gear_reference', null, metadata);
      }
    },
    [onSendWithMedia]
  );

  // Handle location selection
  const handleLocationSelect = useCallback(
    async (metadata: LocationMetadata) => {
      if (onSendWithMedia) {
        await onSendWithMedia(null, 'location', null, metadata);
      }
    },
    [onSendWithMedia]
  );

  // Handle voice message send
  const handleVoiceSend = useCallback(
    async (audioBlob: Blob, durationSeconds: number) => {
      if (!onSendWithMedia) return;

      // Upload audio to Cloudinary
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'gearshack');
      formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
        { method: 'POST', body: formData }
      );
      const data = await response.json();

      if (data.secure_url) {
        const metadata: VoiceMetadata = {
          duration_seconds: durationSeconds,
          waveform: [], // Could be populated with actual waveform data
        };
        await onSendWithMedia(null, 'voice', data.secure_url, metadata);
      }
      setIsRecordingVoice(false);
    },
    [onSendWithMedia]
  );

  const canSend = (message.trim().length > 0 || imageAttachment) && !isSending && !disabled;

  return (
    <div className={cn('flex flex-col gap-2 border-t bg-background p-3', className)}>
      {/* Voice recording mode */}
      {isRecordingVoice && (
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setIsRecordingVoice(false)}
          disabled={disabled}
        />
      )}

      {/* Image attachment preview */}
      {!isRecordingVoice && imageAttachment && (
        <ImageAttachmentPreview
          imageUrl={imageAttachment.url}
          isUploading={isUploadingImage}
          onRemove={handleRemoveImage}
        />
      )}

      {/* Input row - hidden when recording voice */}
      {!isRecordingVoice && <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Attachment menu */}
        {onSendWithMedia && (
          <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={disabled || isSending}
              >
                <Paperclip className="h-4 w-4" />
                <span className="sr-only">Attach</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Photo
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    setLocationPickerOpen(true);
                    setAttachmentMenuOpen(false);
                  }}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Location
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    setGearPickerOpen(true);
                    setAttachmentMenuOpen(false);
                  }}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Gear Item
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className="min-h-[40px] max-h-[150px] flex-1 resize-none"
        />

        {/* Voice message button */}
        {onSendWithMedia && !message.trim() && !imageAttachment && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRecordingVoice(true)}
            disabled={disabled || isSending}
            className="shrink-0"
          >
            <Mic className="h-4 w-4" />
            <span className="sr-only">Record voice message</span>
          </Button>
        )}

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>}

      {/* Pickers */}
      <GearPicker
        open={gearPickerOpen}
        onOpenChange={setGearPickerOpen}
        onSelect={handleGearSelect}
      />
      <LocationPicker
        open={locationPickerOpen}
        onOpenChange={setLocationPickerOpen}
        onSelect={handleLocationSelect}
      />
    </div>
  );
}
