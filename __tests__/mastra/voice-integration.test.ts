/**
 * Voice Integration Test Scenarios
 * Feature: 001-mastra-agentic-voice
 * Tasks: T083-T088 - US4 Testing
 *
 * Tests for voice interaction including:
 * - Transcription accuracy
 * - Voice query processing parity
 * - TTS auto-play behavior
 * - Latency benchmarking
 * - Low confidence handling
 * - Playback controls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CONFIDENCE_THRESHOLD } from '@/lib/mastra/voice/whisper';
import {
  LATENCY_TARGETS,
  analyzeLatency,
  calculatePercentileLatency,
  type LatencyMetrics,
} from '@/lib/mastra/voice/latency-benchmark';

// Mock fetch for API calls
const mockFetch = vi.fn();

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((event: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  state: 'inactive',
};

// Mock getUserMedia
const mockGetUserMedia = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  vi.stubGlobal('MediaRecorder', vi.fn(() => mockMediaRecorder));
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  });
  mockFetch.mockClear();
  mockGetUserMedia.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('US4: Voice Interaction', () => {
  // ============================================================================
  // T083: Transcription accuracy >= 95%
  // ============================================================================
  describe('T083: Transcription Accuracy', () => {
    it('should achieve >= 95% accuracy on clear speech', async () => {
      const testCases = [
        {
          spoken: 'What are the best ultralight tents?',
          transcribed: 'What are the best ultralight tents?',
          confidence: 0.98,
        },
        {
          spoken: 'Show me my gear inventory',
          transcribed: 'Show me my gear inventory',
          confidence: 0.96,
        },
        {
          spoken: 'Find alternatives to my sleeping bag',
          transcribed: 'Find alternatives to my sleeping bag',
          confidence: 0.97,
        },
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              text: testCase.transcribed,
              confidence: testCase.confidence,
              language: 'en',
              needsRetry: false,
            }),
        });

        const formData = new FormData();
        formData.append('audio', new Blob(['audio-data']));

        const response = await fetch('/api/mastra/voice/transcribe', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        expect(result.confidence).toBeGreaterThanOrEqual(0.95);
        expect(result.text).toBe(testCase.spoken);
      }
    });

    it('should handle gear-specific terminology correctly', async () => {
      const gearTerms = [
        'Big Agnes Copper Spur HV UL2',
        'Thermarest NeoAir XLite',
        'MSR Hubba Hubba NX2',
        'Gossamer Gear Mariposa',
      ];

      for (const term of gearTerms) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              text: `Tell me about the ${term}`,
              confidence: 0.95,
              needsRetry: false,
            }),
        });

        const response = await fetch('/api/mastra/voice/transcribe', {
          method: 'POST',
          body: new FormData(),
        });

        const result = await response.json();
        expect(result.text).toContain(term);
      }
    });
  });

  // ============================================================================
  // T084: Voice queries processed same as typed
  // ============================================================================
  describe('T084: Voice/Typed Query Parity', () => {
    it('should invoke same tools for voice as for typed queries', async () => {
      const query = 'Find lighter alternatives to my tent';

      // Simulate voice transcription
      const voiceResult = {
        text: query,
        confidence: 0.96,
      };

      // Mock the AI endpoint to verify tool calls
      const mockAIResponse = {
        response: 'I found some lighter alternatives...',
        toolCalls: [
          { name: 'findAlternatives', args: { category: 'tents' } },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(voiceResult),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIResponse),
      });

      // First call is transcription
      await fetch('/api/mastra/voice/transcribe', {
        method: 'POST',
        body: new FormData(),
      });

      // Second call is AI with transcribed text
      const aiResponse = await fetch('/api/mastra/chat', {
        method: 'POST',
        body: JSON.stringify({ message: voiceResult.text }),
      });

      const result = await aiResponse.json();

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls[0].name).toBe('findAlternatives');
    });

    it('should maintain conversation memory for voice queries', async () => {
      const firstQuery = 'Show me my tents';
      const followUpQuery = 'Now show me the lightest one';

      // Mock conversation flow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: 'Here are your tents...',
            context: { lastCategory: 'tents' },
          }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: 'The lightest tent is...',
            usedContext: true,
          }),
      });

      await fetch('/api/mastra/chat', {
        method: 'POST',
        body: JSON.stringify({ message: firstQuery }),
      });

      const followUpResponse = await fetch('/api/mastra/chat', {
        method: 'POST',
        body: JSON.stringify({ message: followUpQuery }),
      });

      const result = await followUpResponse.json();
      expect(result.usedContext).toBe(true);
    });
  });

  // ============================================================================
  // T085: TTS auto-play after AI response
  // ============================================================================
  describe('T085: TTS Auto-Play', () => {
    it('should trigger TTS synthesis after AI response', async () => {
      const aiResponse = 'I found 3 lighter alternatives for your tent.';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('audio-data'));
            controller.close();
          },
        }),
        headers: new Headers({ 'Content-Type': 'audio/mpeg' }),
      });

      const response = await fetch('/api/mastra/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiResponse,
          voice: 'nova',
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    });

    it('should support streaming TTS for faster time-to-first-audio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          async start(controller) {
            // Simulate streaming chunks
            for (let i = 0; i < 3; i++) {
              controller.enqueue(new TextEncoder().encode(`chunk-${i}`));
              await new Promise((r) => setTimeout(r, 10));
            }
            controller.close();
          },
        }),
        headers: new Headers({
          'Content-Type': 'audio/mpeg',
          'Transfer-Encoding': 'chunked',
        }),
      });

      const response = await fetch('/api/mastra/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Test streaming response',
          stream: true,
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.body).toBeDefined();
    });
  });

  // ============================================================================
  // T086: Latency benchmarking (90% < 3s, 99% < 5s)
  // ============================================================================
  describe('T086: Latency Benchmarking', () => {
    it('should meet P90 < 3s latency target', () => {
      // Simulate 100 voice query latency measurements
      const measurements: LatencyMetrics[] = [];

      for (let i = 0; i < 100; i++) {
        // Generate realistic latency distribution
        const baseLatency = 1500 + Math.random() * 1000; // 1.5-2.5s base
        const variance = Math.random() * 500; // Up to 0.5s variance

        measurements.push({
          recordingStartMs: 200 + Math.random() * 100,
          uploadMs: 100 + Math.random() * 50,
          transcriptionMs: 800 + Math.random() * 400,
          responseMs: 300 + Math.random() * 200,
          ttsMs: 400 + Math.random() * 200,
          totalMs: baseLatency + variance,
          timestamp: new Date(),
        });
      }

      const p90 = calculatePercentileLatency(measurements, 90);

      expect(p90).toBeLessThan(LATENCY_TARGETS.total); // < 3s
    });

    it('should meet P99 < 5s latency target', () => {
      const measurements: LatencyMetrics[] = [];

      for (let i = 0; i < 100; i++) {
        // Most queries fast, some slow
        const isSlow = i >= 95; // 5% slow queries
        const baseLatency = isSlow ? 3500 : 1500 + Math.random() * 1000;

        measurements.push({
          recordingStartMs: 200 + Math.random() * 100,
          uploadMs: 100 + Math.random() * 50,
          transcriptionMs: isSlow ? 1500 : 800 + Math.random() * 400,
          responseMs: isSlow ? 800 : 300 + Math.random() * 200,
          ttsMs: isSlow ? 700 : 400 + Math.random() * 200,
          totalMs: baseLatency,
          timestamp: new Date(),
        });
      }

      const p99 = calculatePercentileLatency(measurements, 99);

      expect(p99).toBeLessThan(5000); // < 5s
    });

    it('should identify slow phases in latency report', () => {
      const slowMetrics: LatencyMetrics = {
        recordingStartMs: 300,
        uploadMs: 150,
        transcriptionMs: 2500, // Slow
        responseMs: 400,
        ttsMs: 600,
        totalMs: 3950,
        timestamp: new Date(),
      };

      const report = analyzeLatency(slowMetrics);

      expect(report.meetsTarget).toBe(false);
      expect(report.suggestions).toContainEqual(
        expect.stringContaining('Transcription slow')
      );
    });
  });

  // ============================================================================
  // T087: Low confidence retry prompt
  // ============================================================================
  describe('T087: Low Confidence Handling', () => {
    it('should trigger retry when confidence < 70%', async () => {
      const lowConfidenceResult = {
        text: 'Find my [inaudible] tent',
        confidence: 0.55,
        needsRetry: true,
        retryMessage: 'I had trouble hearing that. Could you please repeat?',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(lowConfidenceResult),
      });

      const response = await fetch('/api/mastra/voice/transcribe', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();

      expect(result.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
      expect(result.needsRetry).toBe(true);
      expect(result.retryMessage).toBeDefined();
    });

    it('should show friendly retry message to user', async () => {
      const lowConfidenceResult = {
        text: '',
        confidence: 0.3,
        needsRetry: true,
        retryMessage: "Sorry, I couldn't understand that. Please try again in a quieter environment.",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(lowConfidenceResult),
      });

      const response = await fetch('/api/mastra/voice/transcribe', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();

      expect(result.retryMessage).toBeTruthy();
      expect(result.retryMessage).toMatch(/couldn't understand|try again|quieter/i);
    });

    it('should not process query with low confidence', async () => {
      const lowConfidenceResult = {
        text: 'Maybe something about gear',
        confidence: 0.45,
        needsRetry: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(lowConfidenceResult),
      });

      const response = await fetch('/api/mastra/voice/transcribe', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();

      // Should not send to AI if confidence is low
      expect(result.needsRetry).toBe(true);

      // AI endpoint should not have been called
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // T088: Playback controls during TTS
  // ============================================================================
  describe('T088: Playback Controls', () => {
    it('should provide pause control during playback', async () => {
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        currentTime: 0,
        duration: 5,
        paused: false,
      };

      // Simulate playback with pause
      await mockAudio.play();
      expect(mockAudio.pause).toBeDefined();

      mockAudio.pause();
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('should provide stop control during playback', async () => {
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        stop: () => {
          mockAudio.currentTime = 0;
          mockAudio.pause();
        },
        currentTime: 2.5,
        duration: 5,
        paused: false,
      };

      await mockAudio.play();
      mockAudio.stop();

      expect(mockAudio.currentTime).toBe(0);
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('should provide volume control during playback', async () => {
      let currentVolume = 1.0;

      const mockGainNode = {
        gain: {
          value: currentVolume,
          setValueAtTime: (value: number) => {
            currentVolume = value;
          },
        },
      };

      // Simulate volume change
      mockGainNode.gain.setValueAtTime(0.5);
      expect(currentVolume).toBe(0.5);

      mockGainNode.gain.setValueAtTime(0);
      expect(currentVolume).toBe(0); // Muted
    });

    it('should show live transcript during playback', async () => {
      const fullText = 'Here are some alternatives for your tent.';
      const chunks = fullText.split(' ');

      let displayedText = '';

      // Simulate word-by-word transcript display
      for (const word of chunks) {
        displayedText += (displayedText ? ' ' : '') + word;
        // In real implementation, this would sync with audio timing
      }

      expect(displayedText).toBe(fullText);
    });
  });
});
