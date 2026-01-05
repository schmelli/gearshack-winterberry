/**
 * Voice Output Hook
 * Feature: 001-mastra-agentic-voice
 * Task: T074 - Create voice output hook
 *
 * Provides text-to-speech playback functionality using:
 * - Web Audio API for playback
 * - Streaming audio support
 * - Playback controls (pause, resume, stop)
 * - Volume control
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export type VoiceOutputState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'error';

// ElevenLabs voices (matching server validation)
export type TTSVoice = 'rachel' | 'domi' | 'bella' | 'antoni' | 'josh' | 'adam';

export interface VoiceOutputOptions {
  /** Voice to use (default: 'rachel') */
  voice?: TTSVoice;
  /** Playback speed 0.5-2.0 (default: 1.0) */
  speed?: number;
  /** Volume 0-1 (default: 1.0) */
  volume?: number;
  /** Auto-play when speak() is called (default: true) */
  autoPlay?: boolean;
  /** Callback when playback starts */
  onStart?: () => void;
  /** Callback when playback ends */
  onEnd?: () => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

export interface UseVoiceOutputReturn {
  /** Current playback state */
  state: VoiceOutputState;
  /** Whether currently playing */
  isPlaying: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current volume (0-1) */
  volume: number;
  /** Speak the given text */
  speak: (text: string) => Promise<void>;
  /** Pause playback */
  pause: () => void;
  /** Resume playback */
  resume: () => void;
  /** Stop playback */
  stop: () => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Reset to idle state */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVoiceOutput(options: VoiceOutputOptions = {}): UseVoiceOutputReturn {
  const {
    voice = 'rachel', // Default ElevenLabs voice (calm and warm)
    speed = 1.0,
    volume: initialVolume = 1.0,
    autoPlay = true,
    onStart,
    onEnd,
    onError,
  } = options;

  // State
  const [state, setState] = useState<VoiceOutputState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(initialVolume);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup audio resources
  const cleanup = useCallback(() => {
    // Pause and cleanup audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    // Disconnect source node
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // Revoke object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [cleanup]);

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
    }
    return audioContextRef.current;
  }, [volume]);

  // Speak text
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }

    try {
      // Cleanup previous audio
      cleanup();
      setError(null);
      setState('loading');

      // Fetch audio from TTS API (ElevenLabs with streaming)
      const response = await fetch('/api/mastra/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voice || 'rachel', // Default to rachel if not specified
          model: 'eleven_turbo_v2_5', // Fast ElevenLabs model for low latency
          format: 'mp3_44100_128', // High quality MP3
          stability: 0.5, // Balanced stability (0 = more expressive, 1 = more stable)
          similarityBoost: 0.75, // Voice similarity boost
          stream: true, // Enable streaming for near-real-time playback
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'TTS synthesis failed');
      }

      // Stream audio chunks for low-latency playback
      // Read the stream and collect chunks
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      // Read all chunks from the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        totalLength += value.length;
      }

      // Combine chunks into a single blob
      const audioData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = audioUrl;

      // Create audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Initialize audio context and connect
      const audioContext = initAudioContext();

      // Resume audio context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create source node and connect to gain
      const sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(gainNodeRef.current!);
      sourceNodeRef.current = sourceNode;

      // Set up event handlers
      audio.onplay = () => {
        setState('playing');
        onStart?.();
      };

      audio.onpause = () => {
        if (state !== 'idle') {
          setState('paused');
        }
      };

      audio.onended = () => {
        setState('idle');
        onEnd?.();
        cleanup();
      };

      audio.onerror = (event) => {
        const errorMessage = 'Audio playback failed';
        console.error('Audio error:', event);
        setError(errorMessage);
        setState('error');
        onError?.(new Error(errorMessage));
        cleanup();
      };

      // Start playback if autoPlay enabled
      if (autoPlay) {
        await audio.play();
      } else {
        setState('paused');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      cleanup();
    }
  }, [voice, speed, autoPlay, cleanup, initAudioContext, state, onStart, onEnd, onError]);

  // Pause playback
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setState('paused');
    }
  }, []);

  // Resume playback
  const resume = useCallback(async () => {
    if (audioRef.current?.paused) {
      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      await audioRef.current.play();
      setState('playing');
    }
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    cleanup();
    setState('idle');
  }, [cleanup]);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setError(null);
  }, [cleanup]);

  return {
    state,
    isPlaying: state === 'playing',
    isLoading: state === 'loading',
    error,
    volume,
    speak,
    pause,
    resume,
    stop,
    setVolume,
    reset,
  };
}
