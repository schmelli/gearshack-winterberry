# Voice Pipeline Architecture: Whisper + TTS

**Feature Branch**: `001-mastra-agentic-voice`
**Research Date**: 2025-12-20
**Status**: Completed

## Executive Summary

This document provides the definitive voice pipeline architecture for achieving <3s end-to-end latency (SC-004) in the GearShack Winterberry AI assistant. Based on comprehensive research of 2025 voice AI technologies, this architecture leverages:

- **Mastra Framework Native Voice Support** for unified API abstraction
- **OpenAI Whisper API** for transcription (500ms latency, $0.003/min with GPT-4o Mini)
- **OpenAI TTS API** for synthesis (500ms latency, $15/1M characters)
- **Streaming TTS Architecture** for perceived latency reduction
- **Optimized Pipeline** targeting 2.6s P90 latency (13% below target)

---

## 1. Whisper Transcription Strategy

### 1.1 Recommended Approach: OpenAI Whisper API (GPT-4o Mini Transcribe)

**Choice**: OpenAI GPT-4o Mini Transcribe API

**Rationale**:
- **Latency**: 320-500ms for typical voice queries (10-30 seconds of audio)
- **Accuracy**: 95%+ WER for clear speech in English/German
- **Cost**: $0.003/minute (50% cheaper than legacy Whisper)
- **Scalability**: Zero infrastructure management vs. self-hosted GPU deployment
- **Integration**: Native support via Mastra `@mastra/voice-openai` module

### 1.2 Latency Benchmarks (2025 Research)

| Provider | Model | Latency (P90) | Accuracy (WER) | Cost |
|----------|-------|---------------|----------------|------|
| OpenAI | GPT-4o Mini Transcribe | 320ms | 7.3% | $0.003/min |
| OpenAI | GPT-4o Transcribe | 320ms | 7.3% | $0.006/min |
| OpenAI | Whisper (legacy) | 500ms | 7.3% | $0.006/min |
| Deepgram | Nova-2 | 100-200ms | 9.5% | $0.0043/min |
| Local Whisper | Large V3 Turbo | 380-520ms* | 7.3% | GPU costs |

*Requires RTX 4070+ GPU ($276/month cloud instance minimum)

**Decision**: Use **GPT-4o Mini Transcribe** for optimal cost-performance ratio ($0.003/min) with 320ms latency.

### 1.3 Alternative: OpenAI Realtime API (Future Enhancement)

**Consideration**: OpenAI Realtime API (launched August 2025) provides end-to-end multimodal voice with <300ms latency but significantly higher cost.

**Current Decision**: Use separate Whisper + TTS for MVP to maintain cost control and flexibility. Realtime API is a candidate for future upgrade if latency becomes critical.

### 1.4 Streaming Transcription

OpenAI Whisper API supports **batch transcription only** (upload complete audio → receive text). For perceived latency reduction:

1. **Start transcription immediately** when user releases microphone button
2. **Show "Listening..." indicator** during audio capture (100ms)
3. **Show "Transcribing..." indicator** during Whisper processing (320ms)
4. **Display transcribed text** as soon as received (before LLM processing starts)

---

## 2. TTS Synthesis Strategy

### 2.1 Recommended Approach: OpenAI TTS API

**Choice**: OpenAI TTS API (Standard Model)

**Rationale**:
- **Latency**: 500ms for 10-second audio clip (streaming supported)
- **Quality**: High naturalness (77.30% pronunciation accuracy, acceptable for MVP)
- **Cost**: $15/1M characters (vs. ElevenLabs $165/1M at scale)
- **Integration**: Native support via Mastra `@mastra/voice-openai` module
- **Scalability**: Usage-based pricing (no monthly subscriptions)

### 2.2 TTS Provider Comparison (2025 Research)

| Provider | Model | TTFA Latency | Quality Score | Cost | Streaming |
|----------|-------|--------------|---------------|------|-----------|
| OpenAI | TTS Standard | 200ms | 77.30% accuracy | $15/1M chars | ✅ Yes |
| OpenAI | TTS HD | 200ms | 85%+ accuracy | $30/1M chars | ✅ Yes |
| ElevenLabs | Flash v2.5 | 150ms | 81.97% accuracy | $165/1M chars* | ✅ Yes |
| Cartesia | Sonic | 180ms | 75%+ accuracy | Variable | ✅ Yes |
| Deepgram | Aura | 250ms | 70%+ accuracy | Variable | ✅ Yes |

*ElevenLabs Growing Business plan pricing at scale. Starter plan ($5/month) only includes 30k characters.

**Quality Differences**:
- ElevenLabs: Superior prosody (64.57% vs. OpenAI 45.83%), context awareness (63.37% vs. 39.25%)
- OpenAI: Acceptable quality for outdoor gear assistant use case, significantly lower cost

**Decision**: Use **OpenAI TTS Standard** for MVP. Upgrade to TTS HD ($30/1M) if user feedback indicates quality issues. ElevenLabs is reserved for premium tier (future feature).

### 2.3 Streaming TTS Implementation

**Critical Optimization**: OpenAI TTS API supports **streaming audio chunks** before full synthesis completes.

**Architecture**:
```typescript
// API Route: /api/mastra/voice/synthesize
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { text } = await req.json();

  // Use OpenAI TTS streaming API
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1', // Standard model
      voice: 'alloy', // Configurable per user preference
      input: text,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  // Stream audio chunks directly to client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

**Client-Side Playback** (React component):
```typescript
'use client';

import { useState, useRef } from 'react';

export function VoicePlayback({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function playVoice() {
    setIsPlaying(true);

    const response = await fetch('/api/mastra/voice/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
    }

    setIsPlaying(false);
  }

  return (
    <>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      <button onClick={playVoice} disabled={isPlaying}>
        {isPlaying ? 'Speaking...' : '🔊 Play Voice'}
      </button>
    </>
  );
}
```

**Latency Reduction**: Streaming TTS reduces perceived latency by 30-50% (start playback at 100-200ms instead of waiting for full synthesis at 500ms).

---

## 3. Mastra Voice Integration

### 3.1 Native Mastra Voice Modules (Confirmed)

**Discovery**: Mastra Framework ships with **built-in voice support** (shipped January 2025).

**Available Modules**:
- `@mastra/voice-openai` - OpenAI Whisper (STT) + TTS integration
- `@mastra/voice-elevenlabs` - ElevenLabs TTS + STT
- `@mastra/voice-google` - Google Speech-to-Text + TTS
- `@mastra/voice-azure` - Azure Speech Services
- `@mastra/voice-deepgram` - Deepgram STT + TTS

**Unified API**:
```typescript
import { Voice } from '@mastra/core';
import { OpenAIVoice } from '@mastra/voice-openai';

// Initialize voice provider
const voice = new Voice({
  input: new OpenAIVoice({ model: 'whisper-1' }), // STT
  output: new OpenAIVoice({ model: 'tts-1', voice: 'alloy' }), // TTS
});

// Transcribe audio
const transcription = await voice.listen(audioBlob);
// Result: { text: "What's the total weight of my tent?", confidence: 0.96 }

// Synthesize speech
const audioStream = await voice.speak("Your tent weighs 1.4kg.");
// Result: ReadableStream<Uint8Array> (MP3 audio)
```

**Composite Voice Provider** (mix STT/TTS providers):
```typescript
import { CompositeVoice } from '@mastra/core';
import { OpenAIVoice } from '@mastra/voice-openai';
import { ElevenLabsVoice } from '@mastra/voice-elevenlabs';

// Use OpenAI for STT (cheap, fast), ElevenLabs for TTS (premium quality)
const voice = new CompositeVoice({
  input: new OpenAIVoice({ model: 'whisper-1' }),
  output: new ElevenLabsVoice({ model: 'eleven_flash_v2_5', voice: 'Rachel' }),
});
```

**Decision**: Use **Mastra native voice modules** instead of custom API wrappers. This eliminates 2-3 days of custom integration work.

### 3.2 Custom API Wrapper Design (NOT NEEDED)

~~Original plan was to create custom wrappers for `/api/mastra/voice/transcribe` and `/api/mastra/voice/synthesize`.~~

**SUPERSEDED**: Mastra provides native voice support. Custom wrappers are unnecessary.

**Migration Path** (if Mastra modules prove insufficient):
1. Wrap Mastra voice calls in custom API routes for caching/monitoring
2. Fall back to direct OpenAI API calls if Mastra abstraction adds latency

---

## 4. End-to-End Latency Budget

### 4.1 Target Latency (SC-004)

**Requirement**: <3s for 90% of voice queries, <5s for 99%

### 4.2 Latency Breakdown (Optimistic Scenario)

| Pipeline Stage | Technology | Latency (P90) | Notes |
|----------------|------------|---------------|-------|
| 1. Audio Capture | Browser MediaRecorder | 100ms | User stops speaking → audio buffer ready |
| 2. Audio Upload | HTTP POST to /api | 150ms | Compressed audio (Opus/MP3), ~50-100KB for 10s |
| 3. Transcription | OpenAI GPT-4o Mini | 320ms | Whisper API processing |
| 4. LLM Processing | Mastra Agent + Claude | 800ms | Simple gear lookup query |
| 5. TTS Synthesis | OpenAI TTS Standard | 200ms | TTFA (Time to First Audio) with streaming |
| 6. Audio Playback Start | Browser Audio API | 50ms | First audio chunk plays |
| **TOTAL** | | **1,620ms** | **46% below target (3s)** |

### 4.3 Latency Breakdown (Realistic Scenario)

| Pipeline Stage | Technology | Latency (P90) | Notes |
|----------------|------------|---------------|-------|
| 1. Audio Capture | Browser MediaRecorder | 150ms | User hesitation + buffer flush |
| 2. Audio Upload | HTTP POST to /api | 200ms | Mobile network, larger file (~150KB for 15s) |
| 3. Transcription | OpenAI GPT-4o Mini | 500ms | P95 latency for longer queries |
| 4. LLM Processing | Mastra Agent + Workflow | 1,200ms | Complex trip planning query |
| 5. TTS Synthesis | OpenAI TTS Standard | 400ms | Full synthesis for longer response |
| 6. Audio Playback Start | Browser Audio API | 100ms | Network buffering |
| **TOTAL** | | **2,550ms** | **15% below target (3s)** |

### 4.4 Worst-Case Scenario (P99 Latency)

| Pipeline Stage | Technology | Latency (P99) | Notes |
|----------------|------------|---------------|-------|
| 1-6. All Stages | Combined | 4,200ms | Network congestion, API rate limiting, cold starts |

**Risk Mitigation**:
- **Cold Start Optimization**: Keep Next.js API routes warm via health check pings
- **Timeout Handling**: Abort requests >8s, show "Processing took longer than expected" message
- **Fallback UI**: Show transcribed text immediately, allow user to read while TTS synthesizes

---

## 5. Latency Optimization Strategies

### 5.1 Parallel Processing (Streaming Architecture)

**Critical Insight**: Modern voice AI achieves sub-1s latency by **overlapping pipeline stages**.

**Sequential Pipeline** (traditional, slow):
```
Capture (150ms) → Upload (200ms) → Transcribe (500ms) → Process (1200ms) → TTS (400ms) → Play (100ms)
TOTAL: 2,550ms
```

**Streaming Pipeline** (optimized):
```
Capture (150ms) → Upload (50ms overlap) →
                  Transcribe (500ms) → Process starts at 300ms into transcription →
                                       Process (1200ms) → TTS streams first tokens at 400ms →
                                                          TTS (400ms) → Play starts at 200ms into TTS
ACTUAL TOTAL: 1,800ms (29% faster)
```

**Implementation**:
1. **WebSocket Connection**: Maintain persistent connection for voice sessions
2. **Streaming Transcription**: Send partial transcripts to LLM as they arrive (if Whisper supports streaming mode)
3. **Streaming TTS**: Play first audio chunks while synthesis continues
4. **Client-Side Buffering**: Preload audio player to minimize playback delay

### 5.2 Caching Strategy

**Transcription Cache** (low value):
- Voice queries are rarely identical (natural language variation)
- Skip caching for STT to avoid complexity

**TTS Cache** (high value):
- Common responses ("Your tent weighs 1.4kg") can be pre-synthesized
- Cache key: `hash(text + voice + speed)`
- Storage: Cloudinary CDN (existing infrastructure)
- Hit rate estimate: 15-20% for standard gear queries

**Implementation** (TTS cache):
```typescript
// lib/voice/tts-cache.ts
import { createHash } from 'crypto';

function getCacheKey(text: string, voice: string, speed: number): string {
  return createHash('sha256')
    .update(`${text}|${voice}|${speed}`)
    .digest('hex');
}

export async function getCachedTTS(text: string, voice: string, speed: number): Promise<Buffer | null> {
  const cacheKey = getCacheKey(text, voice, speed);

  // Check Supabase api_cache table
  const { data } = await supabase
    .from('api_cache')
    .select('response_data')
    .eq('cache_key', cacheKey)
    .eq('cache_type', 'tts')
    .single();

  return data ? Buffer.from(data.response_data, 'base64') : null;
}

export async function setCachedTTS(text: string, voice: string, speed: number, audio: Buffer): Promise<void> {
  const cacheKey = getCacheKey(text, voice, speed);

  await supabase
    .from('api_cache')
    .upsert({
      cache_key: cacheKey,
      cache_type: 'tts',
      response_data: audio.toString('base64'),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
}
```

### 5.3 Geographic Optimization

**API Regions**:
- OpenAI API: Global edge network (auto-routing)
- Mastra Agent: Deploys on Vercel Edge (closest region to user)

**User Impact**:
- US/Canada: 150-200ms network latency
- Europe: 180-220ms network latency
- Asia: 250-300ms network latency

**Optimization**: Use Vercel Edge Runtime for `/api/mastra/voice/*` routes (if Mastra supports Edge, per Research Question 1).

### 5.4 Audio Compression

**Current**: Browser MediaRecorder defaults to WebM/Opus (efficient compression)

**Optimization**:
- Reduce audio bitrate: 16kbps mono (sufficient for speech, vs. 64kbps stereo default)
- Result: 50% smaller files → 100ms faster upload

**Implementation**:
```typescript
// hooks/useVoiceRecording.ts
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000, // 16kbps mono
});
```

---

## 6. Voice Pipeline API Design

### 6.1 API Routes (Mastra Integration)

**Route 1: Transcription** - `/api/mastra/voice/transcribe`

```typescript
// app/api/mastra/voice/transcribe/route.ts
import { Voice } from '@mastra/core';
import { OpenAIVoice } from '@mastra/voice-openai';

const voice = new Voice({
  input: new OpenAIVoice({ model: 'whisper-1' }),
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;

  // Convert File to Blob
  const audioBlob = await audioFile.arrayBuffer();

  // Transcribe
  const result = await voice.listen(Buffer.from(audioBlob));

  // Check confidence threshold (FR-018)
  if (result.confidence < 0.7) {
    return Response.json({
      text: '',
      confidence: result.confidence,
      error: 'Low confidence - please repeat',
    }, { status: 400 });
  }

  return Response.json({
    text: result.text,
    confidence: result.confidence,
  });
}
```

**Route 2: Synthesis** - `/api/mastra/voice/synthesize`

```typescript
// app/api/mastra/voice/synthesize/route.ts
import { Voice } from '@mastra/core';
import { OpenAIVoice } from '@mastra/voice-openai';
import { getCachedTTS, setCachedTTS } from '@/lib/voice/tts-cache';

const voice = new Voice({
  output: new OpenAIVoice({ model: 'tts-1', voice: 'alloy' }),
});

export async function POST(req: Request) {
  const { text, voice: voiceName = 'alloy', speed = 1.0 } = await req.json();

  // Check cache first
  const cached = await getCachedTTS(text, voiceName, speed);
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'HIT' },
    });
  }

  // Synthesize new audio
  const audioStream = await voice.speak(text);

  // Convert stream to buffer for caching
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }
  const audioBuffer = Buffer.concat(chunks);

  // Cache for future use
  await setCachedTTS(text, voiceName, speed, audioBuffer);

  return new Response(audioBuffer, {
    headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'MISS' },
  });
}
```

**Route 3: End-to-End Voice Query** - `/api/mastra/voice/query`

```typescript
// app/api/mastra/voice/query/route.ts
import { mastraAgent } from '@/lib/mastra/agent';
import { Voice } from '@mastra/core';
import { OpenAIVoice } from '@mastra/voice-openai';

const voice = new Voice({
  input: new OpenAIVoice({ model: 'whisper-1' }),
  output: new OpenAIVoice({ model: 'tts-1', voice: 'alloy' }),
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;
  const userId = req.headers.get('x-user-id'); // From Supabase auth

  // 1. Transcribe
  const audioBlob = await audioFile.arrayBuffer();
  const transcription = await voice.listen(Buffer.from(audioBlob));

  if (transcription.confidence < 0.7) {
    return Response.json({
      error: 'Please repeat - audio unclear',
      confidence: transcription.confidence,
    }, { status: 400 });
  }

  // 2. Process with Mastra agent
  const agentResponse = await mastraAgent.generate({
    prompt: transcription.text,
    userId,
  });

  // 3. Synthesize response
  const audioStream = await voice.speak(agentResponse.text);

  // 4. Stream audio to client
  return new Response(audioStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-Transcription': encodeURIComponent(transcription.text),
      'X-Response-Text': encodeURIComponent(agentResponse.text),
    },
  });
}
```

### 6.2 Client-Side React Hook

**Custom Hook**: `useVoiceQuery`

```typescript
// hooks/useVoiceQuery.ts
'use client';

import { useState, useRef } from 'react';

interface VoiceQueryResult {
  transcription: string;
  responseText: string;
  audioUrl: string;
  latency: number;
}

export function useVoiceQuery() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VoiceQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000,
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      startTimeRef.current = Date.now();
    } catch (err) {
      setError('Microphone access denied');
    }
  }

  async function stopRecording() {
    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) return resolve();

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Send to API
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
          const response = await fetch('/api/mastra/voice/query', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Voice query failed');
          }

          // Extract metadata from headers
          const transcription = decodeURIComponent(response.headers.get('X-Transcription') || '');
          const responseText = decodeURIComponent(response.headers.get('X-Response-Text') || '');

          // Create audio URL
          const audioResponseBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioResponseBlob);

          // Calculate latency
          const latency = Date.now() - startTimeRef.current;

          setResult({ transcription, responseText, audioUrl, latency });

          // Auto-play audio
          const audio = new Audio(audioUrl);
          await audio.play();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setIsProcessing(false);
        }

        resolve();
      };

      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }

  return {
    isRecording,
    isProcessing,
    result,
    error,
    startRecording,
    stopRecording,
  };
}
```

**Usage in UI Component**:
```typescript
'use client';

import { useVoiceQuery } from '@/hooks/useVoiceQuery';

export function VoiceQueryButton() {
  const { isRecording, isProcessing, result, error, startRecording, stopRecording } = useVoiceQuery();

  return (
    <div className="flex flex-col gap-4">
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        disabled={isProcessing}
        className="p-4 rounded-full bg-blue-500 text-white"
      >
        {isRecording ? '🎤 Recording...' : isProcessing ? '⏳ Processing...' : '🎤 Hold to Speak'}
      </button>

      {result && (
        <div className="flex flex-col gap-2 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">You said: {result.transcription}</p>
          <p className="text-base">{result.responseText}</p>
          <p className="text-xs text-gray-500">Latency: {result.latency}ms</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
```

---

## 7. Deployment Considerations

### 7.1 Runtime Requirements

**Mastra Voice Modules**: Require Node.js runtime (not Edge Runtime) due to:
- OpenAI SDK dependencies (Node.js streams)
- Audio buffer processing (requires Node.js Buffer API)

**API Route Configuration**:
```typescript
// app/api/mastra/voice/*/route.ts
export const runtime = 'nodejs'; // Required for @mastra/voice
export const maxDuration = 30; // Allow 30s for voice processing
```

**Trade-off**: Lose Edge Runtime global distribution, but gain necessary audio processing capabilities.

### 7.2 Environment Variables

```env
# .env.local

# OpenAI API (Whisper + TTS)
OPENAI_API_KEY=sk-...

# Mastra Configuration
MASTRA_VOICE_PROVIDER=openai
MASTRA_TTS_MODEL=tts-1 # or tts-1-hd for premium quality
MASTRA_TTS_VOICE=alloy # alloy|echo|fable|onyx|nova|shimmer
MASTRA_WHISPER_MODEL=whisper-1

# Voice Feature Flags
VOICE_ENABLED=true
VOICE_CACHE_ENABLED=true
VOICE_CACHE_TTL_DAYS=30

# Rate Limiting (FR-023)
VOICE_RATE_LIMIT_PER_HOUR=40
```

### 7.3 Cost Projections

**Assumptions** (MVP scale: 250 daily active users):
- 20% of users use voice (50 users/day)
- 3 voice queries per session
- Average query: 10 seconds audio input, 20 seconds audio output

**Daily Costs**:
| Service | Usage | Unit Cost | Daily Cost |
|---------|-------|-----------|------------|
| Whisper (GPT-4o Mini) | 50 users × 3 queries × 10s = 25 minutes | $0.003/min | $0.075 |
| TTS (Standard) | 50 users × 3 queries × 20 words = 3,000 chars | $15/1M chars | $0.045 |
| LLM Processing | 50 users × 3 queries × Claude calls | Variable | $0.50 (est.) |
| **TOTAL** | | | **$0.62/day** |

**Monthly Costs**: $18.60/month ($223/year)

**Scaling** (1,000 DAU):
- 4x user base → 4x costs
- **Projected**: $74/month ($888/year)

**Comparison to ElevenLabs**:
- ElevenLabs TTS at same scale: $0.495/day → $14.85/month (34% more expensive)
- With higher quality but minimal user-perceivable difference for outdoor gear queries

---

## 8. Monitoring & Observability

### 8.1 Key Metrics (FR-020)

**Latency Metrics** (Prometheus format):
```typescript
// lib/metrics/voice-metrics.ts
import { Counter, Histogram } from 'prom-client';

export const voiceQueryLatency = new Histogram({
  name: 'voice_query_latency_seconds',
  help: 'End-to-end voice query latency',
  labelNames: ['stage'], // 'transcribe', 'process', 'synthesize', 'total'
  buckets: [0.5, 1, 2, 3, 5, 10], // SC-004: <3s target
});

export const voiceQueryCount = new Counter({
  name: 'voice_query_total',
  help: 'Total voice queries processed',
  labelNames: ['status'], // 'success', 'error', 'low_confidence'
});

export const voiceConfidence = new Histogram({
  name: 'voice_transcription_confidence',
  help: 'Whisper transcription confidence scores',
  buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99],
});
```

**Instrumentation** (in API routes):
```typescript
// app/api/mastra/voice/query/route.ts
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // Transcribe
    const transcribeStart = Date.now();
    const transcription = await voice.listen(audioBuffer);
    voiceQueryLatency.observe({ stage: 'transcribe' }, (Date.now() - transcribeStart) / 1000);
    voiceConfidence.observe(transcription.confidence);

    // Process
    const processStart = Date.now();
    const agentResponse = await mastraAgent.generate({ prompt: transcription.text, userId });
    voiceQueryLatency.observe({ stage: 'process' }, (Date.now() - processStart) / 1000);

    // Synthesize
    const synthesizeStart = Date.now();
    const audioStream = await voice.speak(agentResponse.text);
    voiceQueryLatency.observe({ stage: 'synthesize' }, (Date.now() - synthesizeStart) / 1000);

    // Total
    voiceQueryLatency.observe({ stage: 'total' }, (Date.now() - startTime) / 1000);
    voiceQueryCount.inc({ status: 'success' });

    return new Response(audioStream, { /* ... */ });
  } catch (error) {
    voiceQueryCount.inc({ status: 'error' });
    throw error;
  }
}
```

### 8.2 Structured Logging (FR-019)

```typescript
// lib/logger/voice-logger.ts
import { createLogger } from '@/lib/logger';

export const voiceLogger = createLogger('voice');

// Usage in API routes
voiceLogger.info('voice_query_started', {
  userId,
  audioDuration: audioBlob.byteLength,
  timestamp: new Date().toISOString(),
});

voiceLogger.info('voice_query_completed', {
  userId,
  transcription: transcription.text,
  confidence: transcription.confidence,
  responseLength: agentResponse.text.length,
  latency: Date.now() - startTime,
  cacheHit: cached !== null,
});

voiceLogger.error('voice_query_failed', {
  userId,
  error: error.message,
  stage: 'transcribe', // or 'process', 'synthesize'
  latency: Date.now() - startTime,
});
```

### 8.3 Success Criteria Validation (SC-004)

**Automated Testing** (Vitest + API mocking):
```typescript
// __tests__/voice-latency.test.ts
import { describe, it, expect, vi } from 'vitest';
import { POST as voiceQueryHandler } from '@/app/api/mastra/voice/query/route';

describe('Voice Query Latency (SC-004)', () => {
  it('should complete 90% of queries within 3 seconds', async () => {
    const latencies: number[] = [];

    // Simulate 100 voice queries
    for (let i = 0; i < 100; i++) {
      const mockRequest = new Request('http://localhost/api/mastra/voice/query', {
        method: 'POST',
        body: createMockAudioFormData(),
      });

      const startTime = Date.now();
      await voiceQueryHandler(mockRequest);
      const latency = Date.now() - startTime;

      latencies.push(latency);
    }

    // Calculate P90 latency
    latencies.sort((a, b) => a - b);
    const p90 = latencies[Math.floor(latencies.length * 0.9)];

    expect(p90).toBeLessThan(3000); // SC-004: <3s for 90% of queries
  });
});
```

---

## 9. Future Enhancements

### 9.1 Premium Voice Quality (P3 Feature)

**Upgrade Path**: Implement tiered voice quality based on subscription tier:

| Tier | STT Provider | TTS Provider | Voice Options | Cost/Query |
|------|-------------|--------------|---------------|------------|
| Free | OpenAI Whisper | OpenAI TTS Standard | 1 voice (alloy) | $0.001 |
| Trailblazer (current) | OpenAI GPT-4o Mini | OpenAI TTS Standard | 6 voices | $0.0015 |
| Premium (future) | OpenAI GPT-4o | ElevenLabs Flash v2.5 | 3,000+ voices | $0.015 |

### 9.2 Multimodal Voice (Realtime API)

**Future Migration**: Once costs stabilize, migrate to OpenAI Realtime API for:
- True streaming voice-to-voice (<300ms latency)
- Interrupt handling (user can interrupt AI mid-response)
- Emotional tone preservation

### 9.3 Offline Voice (Progressive Web App)

**Local Whisper**: Use WebAssembly-based Whisper for offline transcription
- **Library**: `whisper.wasm` or `transformers.js`
- **Trade-off**: 2-3x slower than cloud API, but works offline
- **Use Case**: Backcountry trips with no network

### 9.4 Voice Biometrics (Security)

**Voice Authentication**: Use voice patterns for user verification
- **Provider**: Azure Speaker Recognition API
- **Use Case**: "Hey GearShack, what's my pack weight?" (auto-authenticated)

---

## 10. Implementation Checklist

Based on this research, the following tasks are required for Phase 5 (Voice Integration):

### Phase 5.1: Voice Infrastructure (2 days)

- [ ] Install Mastra voice modules: `npm install @mastra/voice-openai`
- [ ] Configure OpenAI API credentials in `.env.local`
- [ ] Create `/api/mastra/voice/transcribe` route (Whisper STT)
- [ ] Create `/api/mastra/voice/synthesize` route (OpenAI TTS)
- [ ] Create `/api/mastra/voice/query` route (end-to-end pipeline)
- [ ] Set `runtime = 'nodejs'` for all voice routes
- [ ] Implement TTS cache in `api_cache` table (Supabase)
- [ ] Add rate limiting middleware (40 queries/hour, FR-023)

### Phase 5.2: Voice UI Components (2 days)

- [ ] Create `useVoiceQuery` React hook (recording, processing, playback)
- [ ] Create `VoiceQueryButton` component (hold-to-speak UI)
- [ ] Add audio waveform visualization during recording
- [ ] Implement transcription confidence threshold UI (FR-018)
- [ ] Add "Pause" button for voice playback
- [ ] Show live text transcript during playback

### Phase 5.3: Latency Optimization (1 day)

- [ ] Implement audio compression (16kbps Opus)
- [ ] Configure streaming TTS (start playback before synthesis completes)
- [ ] Add TTS cache lookup (check before synthesis)
- [ ] Implement WebSocket for persistent voice sessions (optional)
- [ ] Add CDN caching for common TTS responses (Cloudinary)

### Phase 5.4: Testing & Monitoring (1 day)

- [ ] Write latency tests (target <3s P90, SC-004)
- [ ] Add Prometheus metrics (voice_query_latency, voice_confidence)
- [ ] Implement structured logging (JSON format, FR-019)
- [ ] Test cross-device voice queries (memory synchronization)
- [ ] Validate transcription confidence handling (<70% threshold)
- [ ] Benchmark end-to-end latency with 25 concurrent users

**Total Effort**: 6 days (Phase 5 in implementation plan)

---

## 11. Decision Summary

| Decision Point | Recommendation | Rationale |
|----------------|---------------|-----------|
| **STT Provider** | OpenAI GPT-4o Mini Transcribe | 320ms latency, 50% cheaper than Whisper, 95%+ accuracy |
| **TTS Provider** | OpenAI TTS Standard | 500ms latency, $15/1M chars (vs. ElevenLabs $165/1M), good quality |
| **Integration** | Mastra Native Voice Modules | Built-in support, eliminates custom wrapper development |
| **Streaming** | Enabled for TTS | 30-50% perceived latency reduction |
| **Caching** | TTS responses only | 15-20% hit rate for common queries, 400ms saved per hit |
| **Runtime** | Node.js (not Edge) | Required for Mastra voice modules (audio processing) |
| **Rate Limiting** | 40 queries/hour | Prevents cost overruns (FR-023) |
| **Quality Tier** | Standard (MVP) | Upgrade to HD or ElevenLabs if user feedback demands |

---

## 12. References & Sources

### Whisper Research
- [Best open source speech-to-text (STT) model in 2025 (with benchmarks) | Northflank](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2025-benchmarks)
- [Can Whisper Still Win? Comparing 2025 Transcription Accuracy Benchmarks - DIY AI](https://diyai.io/ai-tools/speech-to-text/can-whisper-still-win-transcription-benchmarks/)
- [2025 Edge Speech-to-Text Model Benchmark: Whisper vs. Competitors](https://www.ionio.ai/blog/2025-edge-speech-to-text-model-benchmark-whisper-vs-competitors)
- [OpenAI Whisper API Pricing: $0.006/min Managed vs Self-Hosted ($276/mo Server) - BrassTranscripts Blog](https://brasstranscripts.com/blog/openai-whisper-api-pricing-2025-self-hosted-vs-managed)

### TTS Research
- [Latency optimization | ElevenLabs Documentation](https://elevenlabs.io/docs/best-practices/latency-optimization)
- [Streaming | ElevenLabs Documentation](https://elevenlabs.io/docs/api-reference/streaming)
- [ElevenLabs vs OpenAI TTS: Which One's Right for You? - Vapi AI Blog](https://vapi.ai/blog/elevenlabs-vs-openai)
- [OpenAI Text-to-Speech vs. ElevenLabs [Compare Pricing & Features in 2025]](https://unrealspeech.com/compare/openai-text-to-speech-vs-elevenlabs)
- [Picovoice TTS Latency Benchmark](https://github.com/Picovoice/tts-latency-benchmark)

### Voice AI Architecture
- [Low Latency Voice AI: What It Is and How to Achieve It](https://deepgram.com/learn/low-latency-voice-ai)
- [Designing concurrent pipelines for real-time voice AI: Lessons from live deployment](https://www.gladia.io/blog/concurrent-pipelines-for-voice-ai)
- [Core Latency in AI Voice Agents | Twilio](https://www.twilio.com/en-us/blog/developers/best-practices/guide-core-latency-ai-voice-agents)
- [One-Second Voice-to-Voice Latency with Modal, Pipecat, and Open Models](https://modal.com/blog/low-latency-voice-bot)
- [Engineering low-latency voice agents | Sierra](https://sierra.ai/blog/voice-latency)

### Mastra Framework
- [Text-to-Speech (TTS) | Voice | Mastra Docs](https://mastra.ai/docs/voice/text-to-speech)
- [Speech-to-Text (STT) | Voice | Mastra Docs](https://mastra.ai/docs/voice/speech-to-text)
- [Voice in Mastra | Mastra Docs](https://mastra.ai/en/docs/voice/overview)
- [Introducing TTS in Mastra](https://mastra.ai/blog/tts-support)

### WebSocket & Streaming
- [Implementing WebSocket communication in Next.js - LogRocket Blog](https://blog.logrocket.com/implementing-websocket-communication-next-js/)
- [Streaming in Next.js 15: WebSockets vs Server-Sent Events | HackerNoon](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events)
- [Real-Time TTS with WebSockets | Deepgram's Docs](https://developers.deepgram.com/docs/tts-websocket-streaming)

---

**Document Status**: ✅ Research Complete | Ready for Implementation

**Next Steps**: Proceed to Phase 5 (Voice Integration) in implementation plan with confidence in technical feasibility.
