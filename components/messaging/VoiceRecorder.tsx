/**
 * VoiceRecorder - Voice Message Recording Component
 *
 * Feature: 046-user-messaging-system
 * Task: T067
 *
 * Component for recording voice messages with waveform visualization.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Voice message recorder with waveform visualization.
 */
export function VoiceRecorder({
  onSend,
  onCancel,
  disabled = false,
  className,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount: stop recording, release media stream, revoke URLs
  useEffect(() => {
    return () => {
      // Stop any active timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop recording and release media stream tracks
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        // Stop all tracks to release the microphone
        const stream = mediaRecorderRef.current.stream;
        stream.getTracks().forEach((track) => track.stop());
      }

      // Revoke audio URL to free memory
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      setIsPreparing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPreparing(false);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsPreparing(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleSend = useCallback(async () => {
    if (!audioBlob) return;

    try {
      setIsSending(true);
      await onSend(audioBlob, duration);

      // Clean up
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
    } catch (error) {
      console.error('Failed to send voice message:', error);
    } finally {
      setIsSending(false);
    }
  }, [audioBlob, duration, audioUrl, onSend]);

  const handleCancel = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    onCancel();
  }, [isRecording, audioUrl, stopRecording, onCancel]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex items-center gap-2 rounded-lg border bg-muted/50 p-2', className)}>
      {/* Recording/Preview state */}
      {!audioBlob ? (
        <>
          {/* Recording controls */}
          {!isRecording ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={startRecording}
              disabled={disabled || isPreparing}
              className="h-10 w-10 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              {isPreparing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={stopRecording}
                className="h-10 w-10 rounded-full bg-red-500 text-white hover:bg-red-600 animate-pulse"
              >
                <Square className="h-4 w-4" />
              </Button>

              {/* Duration */}
              <span className="min-w-[50px] text-center font-mono text-sm">
                {formatDuration(duration)}
              </span>

              {/* Waveform placeholder */}
              <div className="flex flex-1 items-center justify-center gap-0.5">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-red-500"
                    style={{
                      height: `${Math.random() * 20 + 10}px`,
                      animation: 'pulse 0.5s ease-in-out infinite',
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Cancel button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          {/* Preview controls */}
          <audio
            src={audioUrl ?? undefined}
            controls
            className="h-10 flex-1"
          />

          {/* Duration */}
          <span className="min-w-[50px] text-center font-mono text-sm text-muted-foreground">
            {formatDuration(duration)}
          </span>

          {/* Send button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSend}
            disabled={isSending}
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>

          {/* Cancel/Delete button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isSending}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
