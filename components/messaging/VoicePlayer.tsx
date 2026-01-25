/**
 * VoicePlayer - Voice Message Playback Component
 *
 * Feature: 046-user-messaging-system
 * Task: T068
 *
 * Component for playing voice messages with progress indicator.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VoiceMetadata } from '@/types/messaging';

interface VoicePlayerProps {
  audioUrl: string;
  metadata?: VoiceMetadata;
  isOwnMessage?: boolean;
  className?: string;
}

/**
 * Voice message player with progress bar.
 */
export function VoicePlayer({
  audioUrl,
  metadata,
  isOwnMessage = false,
  className,
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(metadata?.duration_seconds ?? 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setIsLoading(false);
      console.error('Failed to load audio');
    };

    return () => {
      // Stop playback
      audio.pause();
      // Remove event listeners to prevent memory leaks
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.onerror = null;
      // Clear source and force unload
      audio.removeAttribute('src');
      audio.load();
      // Clear ref
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg p-2',
        isOwnMessage ? 'bg-primary/20' : 'bg-muted',
        className
      )}
      style={{ minWidth: '200px' }}
    >
      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          'h-10 w-10 shrink-0 rounded-full',
          isOwnMessage
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30'
            : 'bg-muted-foreground/10 hover:bg-muted-foreground/20'
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 translate-x-0.5" />
        )}
      </Button>

      {/* Progress and time */}
      <div className="flex flex-1 flex-col gap-1">
        {/* Progress bar */}
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
          className="relative h-2 w-full cursor-pointer rounded-full bg-muted-foreground/20"
          onClick={handleSeek}
        >
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full',
              isOwnMessage ? 'bg-primary-foreground' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
