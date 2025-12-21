/**
 * Voice Input Hook
 * Feature: 001-mastra-agentic-voice
 * Task: T071 - Create voice input hook
 * Task: T080 - Audio encoding optimization
 *
 * Provides audio recording and transcription functionality using:
 * - MediaRecorder API for audio capture
 * - Optimized Opus encoding (<100KB for 10s clips)
 * - Automatic upload to transcription API
 * - Confidence check with retry prompt
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import {
  SPEECH_OPTIMIZED_CONFIG,
  getRecorderOptions,
  getSpeechAudioConstraints,
  createEncodedAudio,
  getEncodingDiagnostics,
} from '@/lib/mastra/voice/audio-encoder';
import {
  LatencyTracker,
  analyzeLatency,
  logLatencyReport,
} from '@/lib/mastra/voice/latency-benchmark';

// ============================================================================
// Types
// ============================================================================

export type VoiceInputState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'processing'
  | 'success'
  | 'error'
  | 'low_confidence';

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  durationMs: number;
  needsRetry: boolean;
  retryMessage?: string;
}

export interface VoiceInputOptions {
  /** Language hint for transcription ('en', 'de', or 'auto') */
  language?: 'en' | 'de' | 'auto';
  /** Maximum recording duration in milliseconds (default: 30000) */
  maxDuration?: number;
  /** Callback when transcription completes */
  onTranscription?: (result: TranscriptionResult) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

export interface UseVoiceInputReturn {
  /** Current state of voice input */
  state: VoiceInputState;
  /** Whether currently recording */
  isRecording: boolean;
  /** Transcription result if available */
  transcription: TranscriptionResult | null;
  /** Error message if any */
  error: string | null;
  /** Recording duration in milliseconds */
  recordingDuration: number;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and process */
  stopRecording: () => void;
  /** Cancel recording without processing */
  cancelRecording: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Retry recording after low confidence */
  retryRecording: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_DURATION = 30000; // 30 seconds

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVoiceInput(options: VoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = 'auto',
    maxDuration = DEFAULT_MAX_DURATION,
    onTranscription,
    onError,
  } = options;

  // State
  const [state, setState] = useState<VoiceInputState>('idle');
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const latencyTrackerRef = useRef<LatencyTracker>(new LatencyTracker());

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear timers
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    // Clear audio chunks
    audioChunksRef.current = [];
  }, []);

  // Process recorded audio
  const processAudio = useCallback(async () => {
    setState('processing');
    const tracker = latencyTrackerRef.current;

    try {
      // Track upload phase start
      tracker.startPhase('upload');

      // Create optimized encoded audio from chunks
      const encodedAudio = await createEncodedAudio(
        audioChunksRef.current,
        mimeTypeRef.current,
        recordingDuration
      );

      // Log encoding diagnostics in development
      if (process.env.NODE_ENV === 'development') {
        const diagnostics = getEncodingDiagnostics(encodedAudio);
        console.log('[Voice] Audio encoding:', diagnostics);
      }

      // Create form data with optimized blob
      const formData = new FormData();
      const extension = mimeTypeRef.current.split('/')[1]?.split(';')[0] || 'webm';
      formData.append('audio', encodedAudio.blob, `recording.${extension}`);
      if (language !== 'auto') {
        formData.append('language', language);
      }

      // Track transcription phase
      tracker.endPhase('upload');
      tracker.startPhase('transcription');

      // Upload to transcription API
      const response = await fetch('/api/mastra/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      tracker.endPhase('transcription');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Transcription failed');
      }

      const result: TranscriptionResult = await response.json();

      // Complete latency tracking and log report
      const metrics = tracker.complete();
      const report = analyzeLatency(metrics);
      logLatencyReport(report);

      setTranscription(result);

      if (result.needsRetry) {
        setState('low_confidence');
      } else {
        setState('success');
      }

      onTranscription?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [recordingDuration, language, onTranscription, onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Reset state and start latency tracking (T082)
      const tracker = latencyTrackerRef.current;
      tracker.reset();
      tracker.startPhase('recordingStart');

      setError(null);
      setTranscription(null);
      setRecordingDuration(0);
      audioChunksRef.current = [];

      setState('requesting_permission');

      // Request microphone access with optimized audio constraints (T080)
      const audioConstraints = getSpeechAudioConstraints(SPEECH_OPTIMIZED_CONFIG);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // End recording start phase (microphone access obtained)
      tracker.endPhase('recordingStart');

      streamRef.current = stream;

      // Create media recorder with optimized encoding options (T080)
      const recorderOptions = getRecorderOptions(SPEECH_OPTIMIZED_CONFIG);
      mimeTypeRef.current = recorderOptions.mimeType || 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle stop
      mediaRecorder.onstop = () => {
        cleanup();
        processAudio();
      };

      // Handle error
      mediaRecorder.onerror = (event) => {
        const errorMessage = (event as ErrorEvent).message || 'Recording failed';
        setError(errorMessage);
        setState('error');
        cleanup();
        onError?.(new Error(errorMessage));
      };

      // Start recording
      mediaRecorder.start(250); // Collect data every 250ms
      setState('recording');

      // Start duration timer
      const startTime = Date.now();
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTime);
      }, 100);

      // Set max duration timer
      maxDurationTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, maxDuration);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';

      // Handle permission denied
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access to use voice input.');
      } else {
        setError(errorMessage);
      }

      setState('error');
      cleanup();
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [maxDuration, cleanup, processAudio, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    cleanup();
    setState('idle');
    setRecordingDuration(0);
  }, [cleanup]);

  // Reset state
  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setTranscription(null);
    setError(null);
    setRecordingDuration(0);
  }, [cleanup]);

  // Retry recording
  const retryRecording = useCallback(() => {
    reset();
    startRecording();
  }, [reset, startRecording]);

  return {
    state,
    isRecording: state === 'recording',
    transcription,
    error,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    retryRecording,
  };
}
